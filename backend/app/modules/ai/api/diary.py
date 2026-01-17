from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from app.modules.ai.core.diary import DiaryService
from app.modules.ai.repository.ai_repository import AIChatRepository
from app.modules.ai.repository.diary_repository import DiaryRepository
from config.mongodb_config import get_database
import importlib.util
import sys
from pathlib import Path

router = APIRouter()
diary_service = DiaryService()

def get_diary_repo() -> DiaryRepository:
    """Dependency to get DiaryRepository instance"""
    db = get_database()
    return DiaryRepository(db)

def get_ai_repo() -> AIChatRepository:
    """Dependency to get AIChatRepository instance"""
    db = get_database()
    return AIChatRepository(db)


# ============================================================================
# DIARY ENDPOINTS
# ============================================================================

class DiaryRequest(BaseModel):
    """日记创建请求模型"""
    user_id: str
    session_id: Optional[str] = None
    title: str
    content: str
    mood: str = "Neutral"

class GenerateDiaryRequest(BaseModel):
    """AI 生成日记请求模型"""
    user_id: str
    session_id: str

class AIProcessRequest(BaseModel):
    """AI 处理手动输入请求模型"""
    user_id: str
    content: str

@router.get("/diaries")
async def get_user_diaries(user_id: str, repo: DiaryRepository = Depends(get_diary_repo)):
    """获取用户的所有日记"""
    try:
        diaries = await repo.get_user_diaries(user_id)
        return diaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get diaries: {str(e)}")

@router.get("/diaries/{diary_id}")
async def get_diary(diary_id: str, repo: DiaryRepository = Depends(get_diary_repo)):
    """获取单个日记"""
    try:
        diary = await repo.get_diary(diary_id)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found")
        return diary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get diary: {str(e)}")

@router.post("/diaries")
async def create_diary(request: DiaryRequest, repo: DiaryRepository = Depends(get_diary_repo)):
    """创建新日记"""
    try:
        diary = await repo.create_diary(
            user_id=request.user_id,
            session_id=request.session_id or "",
            title=request.title,
            content=request.content,
            mood=request.mood
        )
        return diary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create diary: {str(e)}")

@router.post("/diaries/generate")
async def generate_diary(
    request: GenerateDiaryRequest,
    ai_repo: AIChatRepository = Depends(get_ai_repo),
    diary_repo: DiaryRepository = Depends(get_diary_repo)
):
    """基于聊天历史 AI 生成日记"""
    try:
        # 1. 获取会话消息历史
        messages = await ai_repo.get_session_messages(request.session_id)

        if not messages:
            raise HTTPException(status_code=400, detail="No messages found in session")

        # 2. 转换为 AI 服务需要的格式
        history = []
        for msg in messages:
            role = "user" if msg.get("sender_type") == "user" else "model"
            history.append({
                "role": role,
                "parts": [msg.get("content", "")]
            })

        # 3. 调用 AI 生成日记
        diary_data = await diary_service.generate_diary_summary(history)

        # 4. 保存到数据库
        diary = await diary_repo.create_diary(
            user_id=request.user_id,
            session_id=request.session_id,
            title=diary_data.get("title", "Untitled"),
            content=diary_data.get("content", ""),
            mood=diary_data.get("mood", "Neutral")
        )

        return diary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate diary: {str(e)}")


@router.post("/diaries/ai-save")
async def ai_save_diary(
    request: AIProcessRequest,
    repo: DiaryRepository = Depends(get_diary_repo)
):
    """AI 处理手动输入并保存日记"""
    try:
        # 1. 调用 AI 处理文本
        diary_data = await diary_service.generate_from_text(request.content)

        # 2. 保存到数据库
        diary = await repo.create_diary(
            user_id=request.user_id,
            session_id="", # 手动输入没有 session_id
            title=diary_data.get("title", "Reflections"),
            content=diary_data.get("content", request.content),
            mood=diary_data.get("mood", "Neutral")
        )

        return diary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process and save diary: {str(e)}")


@router.get("/summary/{session_id}")
async def get_session_summary(session_id: str):
    """
    获取指定会话的对话总结
    
    从 Weaviate 读取该 session_id 下的所有 AIConversations，
    然后使用 LLM 生成对话总结。
    """
    try:
        summary = await diary_service.generate_session_summary(session_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate session summary: {str(e)}")


# ============================================================================
# EMOTION REPORT ENDPOINTS
# ============================================================================

def _load_emotion_analytics():
    """Dynamically load emotion_analytics module from genai/app"""
    try:
        # Get the project root directory - backend is at /Users/kaikai/emoticonnection/backend
        # genai/app is at /Users/kaikai/emoticonnection/genai/app
        
        # Hardcode the path relative to the backend app root for reliability in this environment
        backend_app_path = Path(__file__).resolve().parents[4] # /Users/kaikai/emoticonnection/backend
        project_root = backend_app_path.parent # /Users/kaikai/emoticonnection
        
        emotion_analytics_path = project_root / "genai" / "app" / "emotion_analytics.py"
        
        if not emotion_analytics_path.exists():
            # Fallback to absolute path if relative fails
            emotion_analytics_path = Path("/Users/kaikai/emoticonnection/genai/app/emotion_analytics.py")
            
        if not emotion_analytics_path.exists():
             raise FileNotFoundError(f"emotion_analytics.py not found at {emotion_analytics_path}")

        # Add the parent directory to sys.path to allow imports within the module
        module_dir = emotion_analytics_path.parent
        if str(module_dir) not in sys.path:
            sys.path.append(str(module_dir))

        # Load emotion_analytics module
        spec = importlib.util.spec_from_file_location(
            "emotion_analytics", 
            str(emotion_analytics_path)
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load emotion_analytics.py from {emotion_analytics_path}")
        
        emotion_analytics = importlib.util.module_from_spec(spec)
        sys.modules["emotion_analytics"] = emotion_analytics
        spec.loader.exec_module(emotion_analytics)
        
        return emotion_analytics
    except Exception as e:
        print(f"Error loading emotion_analytics: {e}")
        import traceback
        traceback.print_exc()
        raise ImportError(f"Failed to load emotion_analytics module: {e}")

@router.get("/reports/daily")
async def get_daily_report(user_id: str, end_date: Optional[str] = None):
    """Generate daily emotion report for a user"""
    try:
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_daily_emotion_report(
            user_id=user_id,
            end_date=end_date
        )
        # Convert to JSON-serializable format using static method
        return emotion_analytics.EmotionAnalytics.to_json(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate daily report: {str(e)}")

@router.get("/reports/weekly")
async def get_weekly_report(user_id: str, end_date: Optional[str] = None):
    """Generate weekly emotion report for a user"""
    try:
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_weekly_emotion_report(
            user_id=user_id,
            end_date=end_date
        )
        # Convert to JSON-serializable format using static method
        return emotion_analytics.EmotionAnalytics.to_json(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate weekly report: {str(e)}")

@router.get("/reports/monthly")
async def get_monthly_report(user_id: str, end_date: Optional[str] = None):
    """Generate monthly emotion report for a user"""
    try:
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_monthly_emotion_report(
            user_id=user_id,
            end_date=end_date
        )
        # Convert to JSON-serializable format using static method
        return emotion_analytics.EmotionAnalytics.to_json(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly report: {str(e)}")
