"""
Notification API endpoints
Handles notification counts and mark-as-read operations
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

# Database imports
import sys
from pathlib import Path

database_path = Path(__file__).resolve().parents[5] / "database"
if str(database_path) not in sys.path:
    sys.path.insert(0, str(database_path))

try:
    from crud.notification_crud import (
        get_notification_counts,
        get_unread_notifications,
        mark_as_read,
        mark_all_as_read,
        setup_indexes
    )
    from models.notification import NotificationCounts, MarkReadRequest, NotificationType
except ImportError:
    from database.crud.notification_crud import (
        get_notification_counts,
        get_unread_notifications,
        mark_as_read,
        mark_all_as_read,
        setup_indexes
    )
    from database.models.notification import NotificationCounts, MarkReadRequest, NotificationType


router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/counts")
def get_counts(user_id: str = Query(..., description="User ID")) -> NotificationCounts:
    """
    Get aggregated notification counts for badge display

    Returns:
    {
        "profile_total": 2,           # new_followers count (for Profile tab badge)
        "chat_total": 5,              # total unread messages (for Chat tab badge)
        "community_total": 3,         # total unread comments (for Community tab badge)
        "new_followers": 2,
        "unread_comments_by_post": {"post_id_1": 2, "post_id_2": 1},
        "unread_chats_by_room": {"room_id_1": 3, "room_id_2": 2}
    }
    """
    return get_notification_counts(user_id)


@router.get("/unread")
def get_unread(
    user_id: str = Query(..., description="User ID"),
    notification_type: Optional[str] = Query(None, description="Filter by type: new_follower, chat_message, post_comment")
):
    """
    Get list of unread notifications

    Optional filter by notification_type
    """
    ntype = None
    if notification_type:
        if notification_type not in ["new_follower", "chat_message", "post_comment"]:
            raise HTTPException(status_code=400, detail="Invalid notification_type")
        ntype = notification_type

    notifications = get_unread_notifications(user_id, ntype)

    # Convert ObjectId to string for JSON serialization
    result = []
    for n in notifications:
        result.append({
            "id": str(n["_id"]),
            "user_id": n["user_id"],
            "notification_type": n["notification_type"],
            "source_id": n["source_id"],
            "actor_id": n.get("actor_id"),
            "count": n.get("count", 1),
            "created_at": n["created_at"].isoformat() if n.get("created_at") else None,
            "updated_at": n["updated_at"].isoformat() if n.get("updated_at") else None
        })

    return result


@router.post("/mark-read")
def mark_read(request: MarkReadRequest):
    """
    Mark notifications as read

    Request body:
    {
        "user_id": "...",
        "notification_type": "new_follower" | "chat_message" | "post_comment",
        "source_id": "..." (optional - if provided, only marks specific source)
    }

    If source_id is not provided, marks ALL notifications of that type as read.
    """
    count = mark_as_read(
        user_id=request.user_id,
        notification_type=request.notification_type,
        source_id=request.source_id
    )

    return {
        "success": True,
        "marked_count": count
    }


@router.post("/mark-all-read")
def mark_all_read_endpoint(user_id: str = Query(..., description="User ID")):
    """
    Mark ALL notifications as read for a user
    """
    count = mark_all_as_read(user_id)

    return {
        "success": True,
        "marked_count": count
    }


@router.post("/setup-indexes")
def setup_db_indexes():
    """
    Set up MongoDB indexes for notifications collection
    Call this once during initial setup
    """
    try:
        setup_indexes()
        return {"success": True, "message": "Indexes created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
