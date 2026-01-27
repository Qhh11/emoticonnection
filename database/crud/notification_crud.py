"""
Notification CRUD operations
Handles notification creation, retrieval, and mark-as-read operations
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

try:
    from database.config.mongodb_config import get_sync_database
    from database.models.notification import Notification, NotificationCounts, NotificationType
except ImportError:
    from config.mongodb_config import get_sync_database
    from models.notification import Notification, NotificationCounts, NotificationType


db = get_sync_database()
notifications = db.notifications


def create_notification(
    user_id: str,
    notification_type: NotificationType,
    source_id: str,
    actor_id: Optional[str] = None
) -> str:
    """
    Create a new notification or increment count if exists

    For new_follower: creates one record per follower (source_id = follower_id)
    For chat_message: upserts per room (source_id = room_id), increments count
    For post_comment: upserts per post (source_id = post_id), increments count

    Returns:
        Notification ID
    """
    now = datetime.utcnow()

    # For chat_message and post_comment, upsert and increment count
    if notification_type in ["chat_message", "post_comment"]:
        result = notifications.find_one_and_update(
            {
                "user_id": user_id,
                "notification_type": notification_type,
                "source_id": source_id,
                "is_read": False  # Only update unread notifications
            },
            {
                "$inc": {"count": 1},
                "$set": {
                    "actor_id": actor_id,
                    "updated_at": now
                },
                "$setOnInsert": {
                    "user_id": user_id,
                    "notification_type": notification_type,
                    "source_id": source_id,
                    "created_at": now,
                    "is_read": False
                }
            },
            upsert=True,
            return_document=True
        )
        return str(result["_id"])

    # For new_follower, check if notification already exists (avoid duplicate notifications)
    existing = notifications.find_one({
        "user_id": user_id,
        "notification_type": notification_type,
        "source_id": source_id
    })

    if existing:
        # If previously read, reset to unread
        if existing.get("is_read"):
            notifications.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "is_read": False,
                        "read_at": None,
                        "updated_at": now
                    }
                }
            )
        return str(existing["_id"])

    # Create new notification
    notification_doc = {
        "user_id": user_id,
        "notification_type": notification_type,
        "source_id": source_id,
        "actor_id": actor_id or source_id,  # For followers, actor is the follower
        "count": 1,
        "is_read": False,
        "read_at": None,
        "created_at": now,
        "updated_at": now
    }

    result = notifications.insert_one(notification_doc)
    return str(result.inserted_id)


def get_notification_counts(user_id: str) -> NotificationCounts:
    """
    Get aggregated notification counts for a user

    Returns:
        NotificationCounts with totals and breakdowns
    """
    # Get all unread notifications for the user
    cursor = notifications.find({
        "user_id": user_id,
        "is_read": False
    })

    counts = NotificationCounts()

    for doc in cursor:
        ntype = doc.get("notification_type")
        source_id = doc.get("source_id")
        count = doc.get("count", 1)

        if ntype == "new_follower":
            counts.new_followers += 1  # Each follower is 1 notification
            counts.profile_total += 1

        elif ntype == "chat_message":
            counts.unread_chats_by_room[source_id] = count
            counts.chat_total += count

        elif ntype == "post_comment":
            counts.unread_comments_by_post[source_id] = count
            counts.community_total += count

    return counts


def get_unread_notifications(
    user_id: str,
    notification_type: Optional[NotificationType] = None
) -> List[Dict[str, Any]]:
    """
    Get list of unread notifications

    Args:
        user_id: User ID
        notification_type: Optional filter by type

    Returns:
        List of notification documents
    """
    query = {
        "user_id": user_id,
        "is_read": False
    }

    if notification_type:
        query["notification_type"] = notification_type

    cursor = notifications.find(query).sort("updated_at", -1)
    return list(cursor)


def mark_as_read(
    user_id: str,
    notification_type: NotificationType,
    source_id: Optional[str] = None
) -> int:
    """
    Mark notifications as read

    Args:
        user_id: User ID
        notification_type: Type of notification
        source_id: Optional specific source (room_id, post_id, follower_id)
                   If None, marks ALL notifications of this type as read

    Returns:
        Number of notifications marked as read
    """
    now = datetime.utcnow()

    query = {
        "user_id": user_id,
        "notification_type": notification_type,
        "is_read": False
    }

    if source_id:
        query["source_id"] = source_id

    result = notifications.update_many(
        query,
        {
            "$set": {
                "is_read": True,
                "read_at": now,
                "count": 0  # Reset count when marked as read
            }
        }
    )

    return result.modified_count


def mark_all_as_read(user_id: str) -> int:
    """
    Mark all notifications as read for a user

    Returns:
        Number of notifications marked as read
    """
    now = datetime.utcnow()

    result = notifications.update_many(
        {
            "user_id": user_id,
            "is_read": False
        },
        {
            "$set": {
                "is_read": True,
                "read_at": now,
                "count": 0
            }
        }
    )

    return result.modified_count


def delete_notification(
    user_id: str,
    notification_type: NotificationType,
    source_id: str
) -> bool:
    """
    Delete a specific notification (e.g., when user unfollows)

    Returns:
        True if deleted, False if not found
    """
    result = notifications.delete_one({
        "user_id": user_id,
        "notification_type": notification_type,
        "source_id": source_id
    })

    return result.deleted_count > 0


def setup_indexes():
    """
    Set up MongoDB indexes for the notifications collection
    Call this once during application startup
    """
    # Index for querying user's unread notifications
    notifications.create_index([("user_id", 1), ("is_read", 1)])

    # Index for querying by type
    notifications.create_index([("user_id", 1), ("notification_type", 1), ("is_read", 1)])

    # Unique index for upsert operations
    notifications.create_index(
        [("user_id", 1), ("source_id", 1), ("notification_type", 1)],
        unique=True
    )
