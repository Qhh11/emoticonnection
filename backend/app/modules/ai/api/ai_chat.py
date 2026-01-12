from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.modules.ai.core.ai_chat import AIChatService
from app.modules.ai.repository.ai_repository import AIChatRepository
from config.mongodb_config import get_database
import importlib.util
import sys
from pathlib import Path

router = APIRouter()
# 初始化 AI 服务实例
ai_service = AIChatService()

def get_ai_repo() -> AIChatRepository:
    """Dependency to get AIChatRepository instance"""
    db = get_database()
    return AIChatRepository(db)

# 定义请求和响应的数据模型

class ChatMessage(BaseModel):
    """
    单条聊天记录模型
    """
    role: str # "user" (用户) 或 "model" (AI)
    parts: List[str] # 消息内容部分

class ChatRequest(BaseModel):
    """
    聊天请求模型
    """
    user_id: str # Added for persistence
    session_id: Optional[str] = None # Optional: continue specific session
    message: str # 当前用户发送的消息
    history: Optional[List[ChatMessage]] = [] # 历史聊天记录

class CreateSessionRequest(BaseModel):
    """
    创建会话请求模型
    """
    user_id: str

class ChatResponse(BaseModel):
    """
    聊天响应模型
    """
    response: str # AI 的回复内容

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, repo: AIChatRepository = Depends(get_ai_repo)):
    """
    AI 聊天接口
    
    接收用户的消息和历史记录，调用 Gemini API 获取回复，并保存到数据库。
    """
    try:
        # 1.获取或创建 AI 会话
        if request.session_id:
            # Continue specific session (assuming it exists and belongs to user)
            # For robustness we could verify it, but simplest is to trust ID for now or it fails
            session_id = request.session_id
        else:
            session = await repo.get_or_create_ai_session(request.user_id)
            session_id = session["id"]

        # 2. 保存用户消息
        await repo.save_message(
            session_id=session_id,
            sender_id=request.user_id,
            content=request.message,
            sender_type="user"
        )

        # 将 Pydantic 模型转换为 Gemini SDK 需要的格式 (list of dicts)
        history_data = [
            {"role": msg.role, "parts": msg.parts} for msg in request.history
        ]
        
        # 调用 AI 服务获取回复 (传入 user_id 和 session_id 以保存到 Weaviate)
        response_text = await ai_service.chat_with_ai(
            request.message, 
            history_data, 
            user_id=request.user_id,
            session_id=session_id
        )
        
        # 3. 保存 AI 回复
        # AI 的 sender_id 可以设为 "ai_assistant" 或固定值
        await repo.save_message(
            session_id=session_id,
            sender_id="ai_assistant",
            content=response_text,
            sender_type="ai"
        )

        return ChatResponse(response=response_text)
    except Exception as e:
        # 异常处理，返回 500 错误
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[dict])
async def get_user_sessions(user_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get all AI chat sessions for a user"""
    return await repo.get_user_sessions(user_id)

@router.post("/sessions", response_model=dict)
async def create_new_session(request: CreateSessionRequest, repo: AIChatRepository = Depends(get_ai_repo)):
    """Force create a new AI chat session"""
    return await repo.create_session(request.user_id)

@router.get("/sessions/{session_id}/messages", response_model=List[dict])
async def get_session_history(session_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get message history for a session"""
    return await repo.get_session_messages(session_id)


# ============================================================================
# EMOTION REPORT ENDPOINTS
# ============================================================================

def _load_emotion_analytics():
    """Dynamically load emotion_analytics module from genai/app"""
    try:
        # Get the project root directory
        current_file = Path(__file__)
        
        # Try different approaches to find the project root
        # Method 1: Go up from current file to project root
        backend_dir = current_file.parent.parent.parent.parent.parent
        genai_app_dir = backend_dir / "genai" / "app"
        
        # Method 2: If method 1 fails, try from current working directory
        if not (genai_app_dir / "emotion_analytics.py").exists():
            # Try from current working directory (assuming we're in backend/)
            cwd = Path.cwd()
            if "backend" in str(cwd):
                project_root = cwd.parent
            else:
                project_root = cwd
            genai_app_dir = project_root / "genai" / "app"
        
        # Method 3: Absolute path from WSL mount point
        if not (genai_app_dir / "emotion_analytics.py").exists():
            # Check if we're in WSL and try the /mnt/c path
            wsl_path = Path("/mnt/c/Users/10857/Desktop/emoticonnection/genai/app")
            if wsl_path.exists():
                genai_app_dir = wsl_path
        
        emotion_analytics_path = genai_app_dir / "emotion_analytics.py"
        if not emotion_analytics_path.exists():
            raise FileNotFoundError(f"emotion_analytics.py not found. Searched paths: {emotion_analytics_path}")
        
        # Load emotion_analytics module
        spec = importlib.util.spec_from_file_location(
            "emotion_analytics", 
            str(emotion_analytics_path)
        )
        if spec is None or spec.loader is None:
            raise ImportError("Could not load emotion_analytics.py")
        
        emotion_analytics = importlib.util.module_from_spec(spec)
        sys.modules["emotion_analytics"] = emotion_analytics
        spec.loader.exec_module(emotion_analytics)
        
        return emotion_analytics
    except Exception as e:
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
