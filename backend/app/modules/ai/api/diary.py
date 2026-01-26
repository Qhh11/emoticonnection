from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from app.modules.ai.core.diary import DiaryService
from app.modules.ai.repository.ai_repository import AIChatRepository
from app.modules.ai.repository.diary_repository import DiaryRepository
from app.modules.ai.repository.emotion_report_repository import EmotionReportRepository
from app.modules.ai.repository.daily_emotion_repository import DailyEmotionRepository
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

def get_emotion_report_repo() -> EmotionReportRepository:
    """Dependency to get EmotionReportRepository instance"""
    db = get_database()
    return EmotionReportRepository(db)

def get_daily_emotion_repo() -> DailyEmotionRepository:
    """Dependency to get DailyEmotionRepository instance"""
    db = get_database()
    return DailyEmotionRepository(db)


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
    color: Optional[str] = None  # Custom mood color

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
            mood=request.mood,
            color=request.color  # Pass custom color
        )
        return diary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create diary: {str(e)}")

@router.delete("/diaries/{diary_id}")
async def delete_diary(diary_id: str, user_id: str = Query(...), repo: DiaryRepository = Depends(get_diary_repo)):
    """删除日记"""
    try:
        # 验证日记存在且属于该用户
        diary = await repo.get_diary(diary_id)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found")
        if diary.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this diary")

        # 执行删除
        success = await repo.delete_diary(diary_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete diary")

        return {"success": True, "message": "Diary deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete diary: {str(e)}")

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

def _to_iso_end_of_day(date_str: str) -> str:
    """Convert YYYY-MM-DD to ISO format end of day (23:59:59Z)"""
    return f"{date_str}T23:59:59Z"

def _to_iso_start_of_day(date_str: str) -> str:
    """Convert YYYY-MM-DD to ISO format start of day (00:00:00Z)"""
    return f"{date_str}T00:00:00Z"

def _get_default_yesterday() -> str:
    """获取 UTC 昨天的日期（YYYY-MM-DD 格式），作为前端未传日期时的后备"""
    utc_now = datetime.now(timezone.utc)
    return (utc_now - timedelta(days=1)).strftime("%Y-%m-%d")

@router.get("/reports/daily")
async def get_daily_report(
    user_id: str,
    target_date: str = Query(default=None, description="Target date in YYYY-MM-DD format (user's local yesterday)"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取指定日期的 daily report

    - 前端传入用户本地时区的"昨天"日期
    - 如果报告已存在，直接返回（不调用 GenAI）
    - 如果不存在，调用 GenAI 生成并持久化存储
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在
        existing = await report_repo.get_report(user_id, "daily", report_date)
        if existing:
            return existing["report_data"]

        # 2. 不存在 → 调用 GenAI 生成报告
        # 使用完整的 ISO 时间范围：目标日 00:00:00Z 到 23:59:59Z
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_daily_emotion_report(
            user_id=user_id,
            start_date=_to_iso_start_of_day(report_date),
            end_date=_to_iso_end_of_day(report_date)
        )
        report_json = emotion_analytics.EmotionAnalytics.to_json(report)

        # 3. 持久化存储到 emotion_reports collection
        await report_repo.save_report(user_id, "daily", report_date, report_json)

        return report_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate daily report: {str(e)}")

@router.get("/reports/weekly")
async def get_weekly_report(
    user_id: str,
    target_date: str = Query(default=None, description="End date in YYYY-MM-DD format (user's local yesterday)"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取过去 7 天的 weekly report（不含今天）

    - 前端传入用户本地时区的"昨天"日期作为 end_date
    - 报告范围：target_date 往前 6 天（共 7 天）
    - 缓存 key 用 target_date，确保每天只生成一次
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在
        existing = await report_repo.get_report(user_id, "weekly", report_date)
        if existing:
            return existing["report_data"]

        # 2. 不存在 → 调用 GenAI 生成报告
        # 使用完整的 ISO 时间范围：end_date = target_date 23:59:59Z
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_weekly_emotion_report(
            user_id=user_id,
            end_date=_to_iso_end_of_day(report_date)
        )
        report_json = emotion_analytics.EmotionAnalytics.to_json(report)

        # 3. 持久化存储
        await report_repo.save_report(user_id, "weekly", report_date, report_json)

        return report_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate weekly report: {str(e)}")

@router.get("/reports/monthly")
async def get_monthly_report(
    user_id: str,
    target_date: str = Query(default=None, description="End date in YYYY-MM-DD format (user's local yesterday)"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取过去 4 周的 monthly report（不含本周）

    - 前端传入用户本地时区的"昨天"日期作为 end_date
    - 报告范围：target_date 往前 4 周
    - 缓存 key 用 target_date，确保每天只生成一次
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在
        existing = await report_repo.get_report(user_id, "monthly", report_date)
        if existing:
            return existing["report_data"]

        # 2. 不存在 → 调用 GenAI 生成报告
        # 使用完整的 ISO 时间范围：end_date = target_date 23:59:59Z
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_monthly_emotion_report(
            user_id=user_id,
            end_date=_to_iso_end_of_day(report_date)
        )
        report_json = emotion_analytics.EmotionAnalytics.to_json(report)

        # 3. 持久化存储
        await report_repo.save_report(user_id, "monthly", report_date, report_json)

        return report_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate monthly report: {str(e)}")

@router.post("/reports/sync-history")
async def sync_history_reports(
    user_id: str,
    days: int = Query(default=7, ge=1, le=30),
    start_from: str = Query(default=None, description="Start date in YYYY-MM-DD format (user's local yesterday)"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    检查并补全过去 N 天缺失的 daily reports

    逻辑：
    1. 从 start_from（用户本地昨天）开始往前遍历 N 天
    2. 检查 emotion_reports 是否已有该日报告
    3. 如果没有，直接调用 GenAI 生成报告（GenAI 内部会查询 Weaviate）
    4. 检查 total_interactions > 0，有数据才存储
    5. 返回补全的日期列表
    """
    try:
        synced_dates = []
        skipped_dates = []

        # 使用前端传入的日期作为起点，或默认 UTC 昨天
        base_date_str = start_from or _get_default_yesterday()
        year, month, day = map(int, base_date_str.split("-"))
        base_date = datetime(year, month, day, tzinfo=timezone.utc)

        for i in range(days):  # 从 base_date 开始往前
            target_date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")

            # 1. 检查报告是否已存在
            existing = await report_repo.get_report(user_id, "daily", target_date)
            if existing:
                continue  # 已有报告，跳过

            # 2. 直接调用 GenAI 生成报告（GenAI 会查询 Weaviate）
            try:
                emotion_analytics = _load_emotion_analytics()
                report = emotion_analytics.generate_daily_emotion_report(
                    user_id=user_id,
                    start_date=_to_iso_start_of_day(target_date),
                    end_date=_to_iso_end_of_day(target_date)
                )
                report_json = emotion_analytics.EmotionAnalytics.to_json(report)

                # 3. 检查是否有实际数据（通过 total_interactions）
                if report_json.get("total_interactions", 0) == 0:
                    skipped_dates.append(target_date)
                    continue  # Weaviate 无数据，跳过存储

                # 4. 持久化存储
                await report_repo.save_report(user_id, "daily", target_date, report_json)
                synced_dates.append(target_date)
            except Exception as gen_err:
                print(f"Failed to generate report for {target_date}: {gen_err}")
                skipped_dates.append(target_date)

        return {
            "synced_dates": synced_dates,
            "skipped_dates": skipped_dates,
            "count": len(synced_dates)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync history reports: {str(e)}")


@router.post("/reports/cleanup-duplicates")
async def cleanup_duplicate_reports(
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    清理重复的报告记录。

    由于之前 user_id 类型不一致（有时是 ObjectId，有时是字符串），
    可能导致同一用户同一天有多条记录。此端点会：
    1. 将字符串类型的 user_id 转换为 ObjectId
    2. 删除同一 (user_id, report_type, report_date) 的重复记录（保留第一条）

    注意：这是一次性清理操作，修复后不会再产生重复。
    """
    try:
        stats = await report_repo.cleanup_duplicates()
        total_removed = stats.get('string_duplicates_removed', 0) + stats.get('same_key_duplicates_removed', 0)
        return {
            "success": True,
            "message": f"Cleanup complete: converted {stats['converted']} records, removed {total_removed} duplicates",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup duplicates: {str(e)}")


@router.post("/reports/drop-old-cache")
async def drop_old_cache_collection(
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    删除旧的 report_cache collection。

    这是一次性操作，用于清理不再使用的旧缓存 collection。
    """
    try:
        dropped = await report_repo.drop_old_cache_collection()
        if dropped:
            return {"success": True, "message": "report_cache collection dropped"}
        else:
            return {"success": True, "message": "report_cache collection not found (already deleted)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to drop old cache: {str(e)}")
