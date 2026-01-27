import json
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
    force_refresh: bool = Query(default=False, description="Force regenerate report, skipping DB cache"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取指定日期的 daily report

    - 前端传入用户本地时区的"昨天"日期
    - 如果报告已存在且 force_refresh=False，直接返回（不调用 GenAI）
    - 如果不存在或 force_refresh=True，调用 GenAI 生成并持久化存储
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在（仅在非强制刷新时检查）
        if not force_refresh:
            existing = await report_repo.get_report(user_id, "daily", report_date)
            if existing:
                return existing["report_data"]

        # 2. 不存在或强制刷新 → 调用 GenAI 生成报告
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
    force_refresh: bool = Query(default=False, description="Force regenerate report, skipping DB cache"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取过去 7 天的 weekly report（不含今天）

    - 前端传入用户本地时区的"昨天"日期作为 end_date
    - 报告范围：target_date 往前 6 天（共 7 天）
    - 缓存 key 用 target_date，确保每天只生成一次
    - force_refresh=True 时跳过 DB 缓存，强制调用 GenAI 重新生成
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在（仅在非强制刷新时检查）
        if not force_refresh:
            existing = await report_repo.get_report(user_id, "weekly", report_date)
            if existing:
                return existing["report_data"]

        # 2. 不存在或强制刷新 → 调用 GenAI 生成报告
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
    force_refresh: bool = Query(default=False, description="Force regenerate report, skipping DB cache"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo)
):
    """
    获取过去 4 周的 monthly report（不含本周）

    - 前端传入用户本地时区的"昨天"日期作为 end_date
    - 报告范围：target_date 往前 4 周
    - 缓存 key 用 target_date，确保每天只生成一次
    - force_refresh=True 时跳过 DB 缓存，强制调用 GenAI 重新生成
    """
    try:
        # 使用前端传入的日期，或默认 UTC 昨天
        report_date = target_date or _get_default_yesterday()

        # 1. 检查报告是否已存在（仅在非强制刷新时检查）
        if not force_refresh:
            existing = await report_repo.get_report(user_id, "monthly", report_date)
            if existing:
                return existing["report_data"]

        # 2. 不存在或强制刷新 → 调用 GenAI 生成报告
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
    days: int = Query(default=7, ge=1, le=30, description="Deprecated, kept for API compatibility"),
    start_from: str = Query(default=None, description="Start date in YYYY-MM-DD format (user's local yesterday)"),
    report_type: str = Query(default="weekly", description="Report type: daily, weekly, or monthly"),
    report_repo: EmotionReportRepository = Depends(get_emotion_report_repo),
    daily_score_repo: DailyEmotionRepository = Depends(get_daily_emotion_repo)
):
    # Note: 'days' parameter is kept for API compatibility but no longer used
    # Weekly report automatically covers 7 days, monthly covers ~28 days
    _ = days  # Suppress unused warning
    """
    高效同步：只调用一次 GenAI 生成 weekly/monthly report，从中提取缺失的 daily scores

    逻辑：
    1. 调用一次 GenAI 生成 weekly/monthly report
    2. 从 report 的 emotion_trend.data_points 提取每日分数
    3. 将缺失的分数写入 daily_emotion_scores
    4. 返回 report 供前端直接使用

    这样无论缺多少天数据，都只需要 1 次 GenAI 调用！
    """
    try:
        synced_dates = []
        report_date = start_from or _get_default_yesterday()
        real_utc_today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 1. 生成 report（只调用一次 GenAI）
        emotion_analytics = _load_emotion_analytics()

        if report_type == "daily":
            report = emotion_analytics.generate_daily_emotion_report(
                user_id=user_id,
                start_date=_to_iso_start_of_day(report_date),
                end_date=_to_iso_end_of_day(report_date)
            )
        elif report_type == "weekly":
            report = emotion_analytics.generate_weekly_emotion_report(
                user_id=user_id,
                end_date=_to_iso_end_of_day(report_date)
            )
        else:  # monthly
            report = emotion_analytics.generate_monthly_emotion_report(
                user_id=user_id,
                end_date=_to_iso_end_of_day(report_date)
            )

        report_json_str = emotion_analytics.EmotionAnalytics.to_json(report)
        report_json = json.loads(report_json_str) if isinstance(report_json_str, str) else report_json_str

        # 2. 保存 report 到 DB
        await report_repo.save_report(user_id, report_type, report_date, report_json)

        # 3. 从 report 提取 daily scores 并同步到 daily_emotion_scores
        data_points = report_json.get("emotion_trend", {}).get("data_points", [])

        for dp in data_points:
            if not isinstance(dp, dict):
                continue

            # 提取日期（支持 "2026-01-26" 或 "2026-01-26T00:00:00Z" 格式）
            date_str = dp.get("date", "").split("T")[0]
            if not date_str:
                continue

            # 检查该日期的 score 是否已存在
            existing_score = await daily_score_repo.get_score_for_date(user_id, date_str)
            if existing_score:
                continue  # 已存在，跳过

            # 提取分数数据
            avg_score = dp.get("avg_score", 0.0)
            dominant_emotion = dp.get("dominant_emotion", "neutral")
            interaction_count = dp.get("count", 1)

            # 写入 daily_emotion_scores
            await daily_score_repo.bulk_insert_scores(
                user_id=user_id,
                scores=[{
                    "utc_date": date_str,
                    "avg_score": avg_score,
                    "dominant_emotion": dominant_emotion,
                    "interaction_count": interaction_count
                }],
                utc_today=real_utc_today
            )
            synced_dates.append(date_str)

        # 4. 如果是 daily report，也同步当天的分数
        if report_type == "daily" and report_json.get("total_interactions", 0) > 0:
            existing_score = await daily_score_repo.get_score_for_date(user_id, report_date)
            if not existing_score:
                avg_score = report_json.get("average_mood_score", 0.0)
                emotion_dist = report_json.get("emotion_distribution", {})
                dominant_emotion = max(emotion_dist.keys(), key=lambda k: emotion_dist[k]) if emotion_dist else "neutral"
                interaction_count = report_json.get("total_interactions", 1)

                await daily_score_repo.bulk_insert_scores(
                    user_id=user_id,
                    scores=[{
                        "utc_date": report_date,
                        "avg_score": avg_score,
                        "dominant_emotion": dominant_emotion,
                        "interaction_count": interaction_count
                    }],
                    utc_today=real_utc_today
                )
                synced_dates.append(report_date)

        return {
            "synced_dates": synced_dates,
            "count": len(synced_dates),
            "report": report_json  # 直接返回 report，前端无需再次请求
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
