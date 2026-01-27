"""
Notification Model
Collection: notifications

Manages user notifications for:
- new_follower: Someone followed the user
- chat_message: Unread messages in a chat room
- post_comment: New comments on user's posts
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


NotificationType = Literal["new_follower", "chat_message", "post_comment"]


class Notification(BaseModel):
    """Notification record for tracking unread events"""
    id: Optional[str] = Field(default=None, alias="_id")

    # Target user who receives the notification
    user_id: str = Field(..., description="Recipient user ID (ObjectId string)")

    # Notification type
    notification_type: NotificationType = Field(..., description="Type of notification")

    # Source reference (polymorphic based on type)
    # - new_follower: follower's user_id
    # - chat_message: room_id
    # - post_comment: post_id
    source_id: str = Field(..., description="Reference ID based on notification type")

    # Actor who triggered the notification (latest one if multiple)
    actor_id: Optional[str] = Field(None, description="User who triggered the notification")

    # Count of unread items (each new event increments this)
    count: int = Field(default=1, description="Number of unread items")

    # Read status
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "user_id": "69444eed764be66c80bfdfdf",
                "notification_type": "new_follower",
                "source_id": "69444eed764be66c80bfdfe0",
                "actor_id": "69444eed764be66c80bfdfe0",
                "count": 1,
                "is_read": False
            }
        }
    )


# ============================================================================
# API Response Schemas
# ============================================================================

class NotificationCounts(BaseModel):
    """Aggregated notification counts for badge display"""
    # Total badges for each tab
    profile_total: int = 0      # new_followers count
    chat_total: int = 0         # sum of all unread chat messages
    community_total: int = 0    # sum of all unread post comments

    # Detailed breakdown
    new_followers: int = 0
    unread_comments_by_post: dict = Field(default_factory=dict)  # post_id -> count
    unread_chats_by_room: dict = Field(default_factory=dict)     # room_id -> count


class MarkReadRequest(BaseModel):
    """Request to mark notifications as read"""
    user_id: str = Field(..., description="User ID")
    notification_type: NotificationType = Field(..., description="Type of notification to mark read")
    source_id: Optional[str] = Field(None, description="Specific source ID (room_id/post_id/follower_id)")


# ============================================================================
# Database Indexes
# ============================================================================
#
# Recommended indexes for the notifications collection:
#
# 1. For querying user's unread notifications:
#    db.notifications.create_index([("user_id", 1), ("is_read", 1)])
#
# 2. For querying by type:
#    db.notifications.create_index([("user_id", 1), ("notification_type", 1), ("is_read", 1)])
#
# 3. For upsert operations (unique constraint):
#    db.notifications.create_index([("user_id", 1), ("source_id", 1), ("notification_type", 1)], unique=True)
#
# ============================================================================
