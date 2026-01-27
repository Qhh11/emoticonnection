"""
Daily Emotion Scores API - Persistent storage for emotion scores

This module provides endpoints for:
- Getting persisted daily emotion scores (consistent across all devices)
- Refreshing today's emotion score
- Data migration from AI-generated reports

All dates are stored in UTC. The timezone parameter is used to:
1. Calculate the user's "today" for UI purposes
2. Convert user's local date range to UTC for Weaviate queries
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Tuple
from datetime import datetime, timezone as tz
import logging
import importlib.util
import sys
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # Python < 3.9

from app.modules.ai.repository.daily_emotion_repository import DailyEmotionRepository
from app.modules.ai.repository.emotion_report_repository import EmotionReportRepository
from config.mongodb_config import get_database
from datetime import timedelta
import json

logger = logging.getLogger(__name__)

router = APIRouter()


def get_daily_emotion_repo() -> DailyEmotionRepository:
    """Dependency to get DailyEmotionRepository instance"""
    db = get_database()
    return DailyEmotionRepository(db)


def _load_emotion_analytics():
    """Dynamically load emotion_analytics module from genai/app"""
    try:
        # Get the project root directory
        backend_app_path = Path(__file__).resolve().parents[4]
        project_root = backend_app_path.parent

        emotion_analytics_path = project_root / "genai" / "app" / "emotion_analytics.py"

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
        logger.error(f"Error loading emotion_analytics: {e}")
        import traceback
        traceback.print_exc()
        raise ImportError(f"Failed to load emotion_analytics module: {e}")


def get_utc_today() -> str:
    """Get current UTC date as YYYY-MM-DD string"""
    return datetime.now(tz.utc).strftime("%Y-%m-%d")


def get_user_today_in_timezone(user_timezone: str) -> str:
    """Get today's date string in the user's local timezone"""
    try:
        user_tz = ZoneInfo(user_timezone)
    except Exception:
        user_tz = ZoneInfo("UTC")
    return datetime.now(user_tz).strftime("%Y-%m-%d")


def get_utc_range_for_user_date(user_date: str, user_timezone: str) -> Tuple[str, str]:
    """
    Convert user's local date to UTC time range for Weaviate query.

    Example: User in Germany (UTC+1) on 2026-01-24
    - Local 00:00 = UTC 2026-01-23 23:00
    - Local 23:59 = UTC 2026-01-24 22:59

    Args:
        user_date: User's local date in YYYY-MM-DD format
        user_timezone: User's timezone (e.g., "Europe/Berlin")

    Returns:
        Tuple of (utc_start, utc_end) in ISO format with Z suffix
    """
    try:
        user_tz = ZoneInfo(user_timezone)
    except Exception:
        user_tz = ZoneInfo("UTC")

    year, month, day = map(int, user_date.split('-'))

    # User's local day boundaries
    local_start = datetime(year, month, day, 0, 0, 0, tzinfo=user_tz)
    local_end = datetime(year, month, day, 23, 59, 59, tzinfo=user_tz)

    # Convert to UTC
    utc_start = local_start.astimezone(tz.utc)
    utc_end = local_end.astimezone(tz.utc)

    return (
        utc_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        utc_end.strftime("%Y-%m-%dT%H:%M:%SZ")
    )


@router.get("/weekly")
async def get_weekly_emotion_scores(
    user_id: str,
    timezone: str = "UTC",
    repo: DailyEmotionRepository = Depends(get_daily_emotion_repo)
):
    """
    Get user's persisted daily emotion scores for the past 7 days.

    This returns consistent data across all devices, unlike the AI-generated
    weekly report which may vary between calls.

    Args:
        user_id: User identifier
        timezone: User's timezone (e.g., "Asia/Shanghai", "America/New_York")

    Returns:
        Scores with utc_date field. Frontend should convert to local date for display.
    """
    try:
        # Use UTC date for storage and queries
        utc_today = get_utc_today()

        # 1. Lock past scores (ensure they can't be modified)
        await repo.lock_past_scores(user_id, utc_today)

        # 2. Get 7 days of scores
        scores = await repo.get_user_scores(user_id, days=7, utc_today=utc_today)

        # 3. If no scores exist, try to extract from existing weekly report (NOT calling GenAI)
        if not scores:
            try:
                # Get report repository to check for existing weekly report
                report_repo = EmotionReportRepository(repo.db)

                # Calculate yesterday's date as report key (same logic as frontend)
                yesterday = (datetime.now(tz.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

                # Try to get existing weekly report from MongoDB (no GenAI call!)
                existing_report = await report_repo.get_report(user_id, "weekly", yesterday)

                if existing_report and existing_report.get("report_data"):
                    report_data = existing_report["report_data"]
                    # Parse JSON if it's a string
                    if isinstance(report_data, str):
                        report_data = json.loads(report_data)

                    # Extract data_points from existing report
                    data_points = report_data.get("emotion_trend", {}).get("data_points", [])
                    if data_points:
                        migration_scores = []
                        for dp in data_points:
                            if isinstance(dp, dict):
                                migration_scores.append({
                                    "utc_date": dp.get("date", "").split("T")[0],
                                    "avg_score": dp.get("avg_score", 0.0),
                                    "dominant_emotion": dp.get("dominant_emotion", "neutral"),
                                    "interaction_count": dp.get("count", 1)
                                })

                        if migration_scores:
                            await repo.bulk_insert_scores(user_id, migration_scores, utc_today=utc_today)
                            # Fetch the newly inserted scores
                            scores = await repo.get_user_scores(user_id, days=7, utc_today=utc_today)
            except Exception as e:
                logger.warning(f"Failed to extract scores from existing report: {e}")

        return {"scores": scores}
    except Exception as e:
        logger.error(f"Failed to get weekly emotion scores: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get emotion scores: {str(e)}")


@router.get("/monthly")
async def get_monthly_emotion_scores(
    user_id: str,
    _timezone: str = "UTC",  # Kept for API compatibility, but we use UTC internally
    repo: DailyEmotionRepository = Depends(get_daily_emotion_repo)
):
    """
    Get user's persisted daily emotion scores for the past 30 days.

    Args:
        user_id: User identifier
        _timezone: User's timezone (kept for API compatibility)

    Returns:
        Scores with utc_date field. Frontend should convert to local date for display.
    """
    try:
        utc_today = get_utc_today()
        await repo.lock_past_scores(user_id, utc_today)
        scores = await repo.get_user_scores(user_id, days=30, utc_today=utc_today)
        return {"scores": scores}
    except Exception as e:
        logger.error(f"Failed to get monthly emotion scores: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get emotion scores: {str(e)}")


@router.post("/refresh-today")
async def refresh_today_emotion_score(
    user_id: str,
    timezone: str = "UTC",
    repo: DailyEmotionRepository = Depends(get_daily_emotion_repo)
):
    """
    Refresh today's emotion score based on today's chat conversations.
    This is called automatically after each AI chat interaction.

    The timezone parameter is used to determine what "today" means for the user,
    which affects the UTC time range used to query Weaviate for conversations.

    Args:
        user_id: User identifier
        timezone: User's timezone (e.g., "Europe/Berlin", "Asia/Shanghai")
    """
    try:
        # 1. Get current UTC date for storage
        utc_today = get_utc_today()

        # 2. Get user's local "today" and convert to UTC time range for Weaviate query
        user_today = get_user_today_in_timezone(timezone)
        utc_start, utc_end = get_utc_range_for_user_date(user_today, timezone)

        logger.info(f"Refreshing score for user {user_id}: user_today={user_today}, "
                    f"utc_range=[{utc_start}, {utc_end}], storing as utc_date={utc_today}")

        # 3. Load emotion analytics and generate report with correct UTC range
        emotion_analytics = _load_emotion_analytics()
        report = emotion_analytics.generate_daily_emotion_report(
            user_id=user_id,
            start_date=utc_start,
            end_date=utc_end
        )

        # 4. Extract the aggregated data
        avg_score = report.average_mood_score if hasattr(report, 'average_mood_score') else 0.0

        # Get dominant emotion from distribution
        dominant_emotion = "neutral"
        if hasattr(report, 'emotion_distribution') and report.emotion_distribution:
            if isinstance(report.emotion_distribution, dict) and report.emotion_distribution:
                dominant_emotion = max(report.emotion_distribution.keys(),
                                       key=lambda k: report.emotion_distribution[k])

        interaction_count = report.total_interactions if hasattr(report, 'total_interactions') else 1

        # 5. Update today's score in MongoDB using UTC date
        result = await repo.upsert_today_score(
            user_id=user_id,
            avg_score=avg_score,
            dominant_emotion=dominant_emotion,
            interaction_count=interaction_count,
            utc_date=utc_today
        )

        return {"success": True, "score": result}
    except Exception as e:
        logger.error(f"Failed to refresh today's emotion score: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh score: {str(e)}")
