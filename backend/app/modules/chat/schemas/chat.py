"""
Chat module data models

This file defines all data structures for chat functionality:
- Request models (client -> server)
- Response models (server -> client)
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field


class EmotionType(str, Enum):
    HAPPY = "happy"
    WARM = "warm"
    NEUTRAL = "neutral"
    ANXIOUS = "anxious"
    UNCERTAIN = "uncertain"
    SAD = "sad"
    EXCITED = "excited"
    STRESSED = "stressed"
    FRIENDLY = "friendly"
    DISTANT = "distant"


class MatchMode(str, Enum):
    HUMAN_ANONYMOUS = "human_anonymous"
    HUMAN_NON_ANONYMOUS = "human_non_anonymous"
    AI_CHAT = "ai_chat"


class UserStatusType(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"

# ============================================================================
# Room Models
# ============================================================================

class RoomCreate(BaseModel):
    """
    Request model for creating/opening a chat room

    Example JSON:
    {
        "user1_id": 1,
        "user2_id": 2
    }
    """
    user1_id: int = Field(..., description="First user ID", example=1)
    user2_id: int = Field(..., description="Second user ID", example=2)


class Room(BaseModel):
    """
    Response model representing a chat room

    Example JSON:
    {
        "id": 123,
        "user1_id": 1,
        "user2_id": 2
    }
    """
    id: int = Field(..., description="Unique room ID", example=123)
    user1_id: int = Field(..., description="First user ID", example=1)
    user2_id: int = Field(..., description="Second user ID", example=2)

class RoomCreateExtended(BaseModel):
    user1_id: int
    user2_id: int
    is_anonymous: bool = False


class RoomExtended(BaseModel):
    id: int
    user1_id: int
    user2_id: int
    is_anonymous: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user1_revealed: bool = True  
    user2_revealed: bool = True  


class RoomListItem(BaseModel):
    room_id: int
    other_user_id: int
    other_user_name: Optional[str] = None  # None when anoumyous
    is_anonymous: bool
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None

# ============================================================================
# Message Models
# ============================================================================

class MessageType(str, Enum):
    TEXT = "text"
    EMOJI = "emoji"
    IMAGE = "image"
    VIDEO = "video"


class MessageCreate(BaseModel):
    """
    Request model for creating a message

    Example JSON for text:
    {
        "sender_id": 1,
        "message_type": "text",
        "content": "Hello, how are you?"
    }

    Example JSON for emoji:
    {
        "sender_id": 1,
        "message_type": "emoji",
        "content": "😊"
    }

    Example JSON for image/video:
    {
        "sender_id": 1,
        "message_type": "image",
        "content": "/static/uploads/abc123.jpg",
        "media_url": "/static/uploads/abc123.jpg"
    }
    """
    sender_id: int = Field(..., description="Sender user ID", example=1)
    message_type: MessageType = Field(
        default=MessageType.TEXT,
        description="Type of message: text, emoji, image, or video"
    )
    content: str = Field(
        ...,
        description="Message content (text/emoji) or media URL (image/video)",
        min_length=1,
        max_length=5000,
        example="Hello, how are you?"
    )
    media_url: Optional[str] = Field(
        default=None,
        description="URL to uploaded media file (for image/video messages)"
    )


class MessageOut(BaseModel):
    """
    Complete message output model

    Used for:
    - REST API returning message history
    - WebSocket broadcasting new messages

    Example JSON for text:
    {
        "id": 456,
        "room_id": 123,
        "sender_id": 1,
        "message_type": "text",
        "content": "Hello, how are you?",
        "created_at": "2025-01-25T10:30:00Z"
    }

    Example JSON for image:
    {
        "id": 457,
        "room_id": 123,
        "sender_id": 1,
        "message_type": "image",
        "content": "Check this out!",
        "media_url": "/static/uploads/abc123.jpg",
        "created_at": "2025-01-25T10:31:00Z"
    }
    """
    id: int = Field(..., description="Unique message ID", example=456)
    room_id: int = Field(..., description="Room ID this message belongs to", example=123)
    sender_id: int = Field(..., description="Sender user ID", example=1)
    message_type: MessageType = Field(
        default=MessageType.TEXT,
        description="Type of message: text, emoji, image, or video"
    )
    content: str = Field(..., description="Message content", example="Hello, how are you?")
    media_url: Optional[str] = Field(
        default=None,
        description="URL to uploaded media file (for image/video messages)"
    )
    emotion: Optional[str] = Field(
        default=None,
        description="AI-analyzed emotion of the message (only visible to receiver)"
    )
    created_at: datetime = Field(..., description="Message creation time (ISO 8601 format)")

    class Config:
        """Pydantic configuration for JSON encoding"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# New models - Matching
class MatchRequest(BaseModel):
    """
    Example:
    {
        "user_id": 1,
        "current_emotion": "happy",
        "mode": "human_anonymous",
        "preferred_emotions": ["warm", "friendly"]
    }
    """
    user_id: int
    current_emotion: EmotionType
    mode: MatchMode
    preferred_emotions: Optional[List[EmotionType]] = None


class MatchResponse(BaseModel):
    matched: bool
    room_id: Optional[int] = None
    matched_user_id: Optional[int] = None
    is_anonymous: bool = True
    match_type: MatchMode


class MatchQueueEntry(BaseModel):
    user_id: int
    current_emotion: EmotionType
    mode: MatchMode
    preferred_emotions: Optional[List[EmotionType]] = None
    queued_at: datetime = Field(default_factory=datetime.utcnow)


# New models - Anonymous
class AnonymousSettings(BaseModel):
    room_id: int
    user1_anonymous: bool = True
    user2_anonymous: bool = True


class RevealIdentityRequest(BaseModel):
    room_id: int
    user_id: int


class RevealIdentityResponse(BaseModel):
    success: bool
    message: str
    revealed_user_id: Optional[int] = None
    revealed_username: Optional[str] = None


