"""
Points/Check-in HTTP API Routes

This file implements REST API endpoints for:
- Getting user points and level
- Daily check-in
- Check-in history

Database: MongoDB (via check_in_crud)
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Import database CRUD
import sys
from pathlib import Path
database_path = Path(__file__).resolve().parents[5] / "database"
sys.path.insert(0, str(database_path))
from crud.check_in_crud import (  # type: ignore
    create_check_in,
    get_check_in_by_date,
    get_check_in_history,
    get_user_points,
    add_points_to_user,
    update_check_in,
    calculate_streak
)


# ============================================================================
# Schemas
# ============================================================================

class CheckInRequest(BaseModel):
    mood: str
    date: Optional[str] = None  # YYYY-MM-DD, defaults to today
    # 情绪坐标轴相关字段
    coordinate_x: Optional[float] = None  # -1 (消极) 到 1 (积极)
    coordinate_y: Optional[float] = None  # -1 (低能量) 到 1 (高能量)
    color: Optional[str] = None  # 计算出的颜色HEX值
    emoji: Optional[str] = None  # 表情图标: angry/happy/sad/calm


class CheckInResponse(BaseModel):
    success: bool
    message: str
    points: int
    total_points: int


class PointsResponse(BaseModel):
    points: int
    level: int


class CheckInHistoryItem(BaseModel):
    date: str
    mood: str
    points_earned: int
    # 情绪坐标轴相关字段
    coordinate_x: Optional[float] = None
    coordinate_y: Optional[float] = None
    color: Optional[str] = None
    emoji: Optional[str] = None


# ============================================================================
# Initialize Router
# ============================================================================

router = APIRouter(
    prefix="/users",
    tags=["points"]
)


# ============================================================================
# Points Endpoints
# ============================================================================

@router.get("/{user_id}/points", response_model=PointsResponse)
async def get_points(user_id: str):
    """
    Get user's points and level

    GET /api/users/{user_id}/points

    Response:
    {
        "points": 150,
        "level": 2
    }
    """
    result = get_user_points(user_id)
    return PointsResponse(**result)


@router.post("/{user_id}/check-in", response_model=CheckInResponse)
async def check_in(user_id: str, request: CheckInRequest):
    """
    Daily check-in (+10 points)

    POST /api/users/{user_id}/check-in

    Request:
    {
        "mood": "Excited",
        "date": "2025-01-07",  // optional, defaults to today
        "coordinate_x": 0.5,   // optional
        "coordinate_y": 0.8,   // optional
        "color": "#F9A825",    // optional
        "emoji": "happy"       // optional
    }

    Response:
    {
        "success": true,
        "message": "打卡成功！获得10积分",
        "points": 10,
        "total_points": 160
    }
    """
    # Use today's date if not provided
    check_date = request.date or date.today().isoformat()

    result = create_check_in(
        user_id,
        request.mood,
        check_date,
        coordinate_x=request.coordinate_x,
        coordinate_y=request.coordinate_y,
        color=request.color,
        emoji=request.emoji
    )

    # Get updated total points
    user_points = get_user_points(user_id)

    return CheckInResponse(
        success=result["success"],
        message=result["message"],
        points=10 if result["success"] else 0,
        total_points=user_points["points"]
    )


@router.get("/{user_id}/check-in/history", response_model=List[CheckInHistoryItem])
async def get_history(
    user_id: str,
    limit: int = Query(30, ge=1, le=100, description="Number of records to return")
):
    """
    Get check-in history

    GET /api/users/{user_id}/check-in/history?limit=30

    Response:
    [
        {"date": "2025-01-07", "mood": "Excited", "points_earned": 10, "coordinate_x": 0.5, "coordinate_y": 0.8, "color": "#F9A825", "emoji": "happy"},
        {"date": "2025-01-06", "mood": "Sad", "points_earned": 10},
        ...
    ]
    """
    history = get_check_in_history(user_id, limit)

    return [
        CheckInHistoryItem(
            date=item["date"],
            mood=item["mood"],
            points_earned=item["points_earned"],
            coordinate_x=item.get("coordinate_x"),
            coordinate_y=item.get("coordinate_y"),
            color=item.get("color"),
            emoji=item.get("emoji")
        )
        for item in history
    ]


@router.get("/{user_id}/check-in/today")
async def get_today_check_in(user_id: str):
    """
    Check if user has checked in today

    GET /api/users/{user_id}/check-in/today

    Response:
    {
        "checked_in": true,
        "check_in": {...},  // or null
        "streak": 5  // consecutive check-in days
    }
    """
    today = date.today().isoformat()
    check_in = get_check_in_by_date(user_id, today)
    streak = calculate_streak(user_id)

    return {
        "checked_in": check_in is not None,
        "check_in": check_in,
        "streak": streak
    }


@router.put("/{user_id}/check-in", response_model=CheckInResponse)
async def update_today_check_in(user_id: str, request: CheckInRequest):
    """
    Update today's check-in mood (no additional points)

    PUT /api/users/{user_id}/check-in

    Request:
    {
        "mood": "Excited",
        "coordinate_x": 0.5,
        "coordinate_y": 0.8,
        "color": "#F9A825",
        "emoji": "happy"
    }

    Response:
    {
        "success": true,
        "message": "心情已更新",
        "points": 0,
        "total_points": 160
    }
    """
    today = date.today().isoformat()
    result = update_check_in(
        user_id,
        request.mood,
        today,
        coordinate_x=request.coordinate_x,
        coordinate_y=request.coordinate_y,
        color=request.color,
        emoji=request.emoji
    )

    # Get current total points
    user_points = get_user_points(user_id)

    return CheckInResponse(
        success=result["success"],
        message=result["message"],
        points=0,  # No points for update
        total_points=user_points["points"]
    )
