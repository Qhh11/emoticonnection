"""
Chat module data models

This file defines all data structures for chat functionality:
- Request models (client -> server)
- Response models (server -> client)
"""

from datetime import datetime
from typing import Union, Optional, List
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

class SupportRole(str, Enum):
    SEEKER = "seeker"      
    SUPPORTER = "supporter"  
    EITHER = "either"       


class SupportNeed(str, Enum):
    VENT = "vent"            
    ADVICE = "advice"      
    COMPANION = "companion" 

class RiskFlag(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    DANGER = "danger"

class UserStatusType(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"

# ============================================================================
# Room Models
# ============================================================================

class RoomCreate(BaseModel):
    user1_id: str
    user2_id: str

class Room(BaseModel):
    id: str
    user1_id: str
    user2_id: str

class RoomCreateExtended(BaseModel):
    user1_id: str
    user2_id: str
    is_anonymous: bool = False



class RoomExtended(BaseModel):
    id: str  # MongoDB ObjectId as string
    user1_id: str
    user2_id: str
    is_anonymous: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user1_revealed: bool = True
    user2_revealed: bool = True  


class RoomListItem(BaseModel):
    room_id: str  # MongoDB ObjectId as string
    other_user_id: str
    other_user_name: Optional[str] = None  # None when anonymous
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
        "sender_id": "69444eed764be66c80bfdfdf",
        "message_type": "text",
        "content": "Hello, how are you?"
    }

    Example JSON for emoji:
    {
        "sender_id": "69444eed764be66c80bfdfdf",
        "message_type": "emoji",
        "content": "😊"
    }

    Example JSON for image/video:
    {
        "sender_id": "69444eed764be66c80bfdfdf",
        "message_type": "image",
        "content": "/static/uploads/abc123.jpg",
        "media_url": "/static/uploads/abc123.jpg"
    }
    """
    sender_id: str = Field(..., description="Sender user ID", example=1)
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
        "id": "507f1f77bcf86cd799439014",
        "room_id": "507f1f77bcf86cd799439012",
        "sender_id": "69444eed764be66c80bfdfdf",
        "message_type": "text",
        "content": "Hello, how are you?",
        "created_at": "2025-01-25T10:30:00Z"
    }

    Example JSON for image:
    {
        "id": "507f1f77bcf86cd799439015",
        "room_id": "507f1f77bcf86cd799439012",
        "sender_id": "69444eed764be66c80bfdfdf",
        "message_type": "image",
        "content": "Check this out!",
        "media_url": "/static/uploads/abc123.jpg",
        "created_at": "2025-01-25T10:31:00Z"
    }
    """
    id: str = Field(..., description="Unique message ID (MongoDB ObjectId)", example="507f1f77bcf86cd799439014")
    room_id: str = Field(..., description="Room ID this message belongs to (MongoDB ObjectId)", example="507f1f77bcf86cd799439012")
    sender_id: str = Field(..., description="Sender user ID", example=1)
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

# models - Matching
class MatchRequest(BaseModel):
    user_id: str
    current_emotion: EmotionType
    mode: MatchMode
    preferred_emotions: Optional[List[EmotionType]] = None

    # --- V2 fields (optional for backward compatibility) ---
    role: Optional[SupportRole] = SupportRole.EITHER
    need: Optional[SupportNeed] = SupportNeed.VENT
    intensity: Optional[int] = Field(default=3, ge=1, le=5)  # 1-5
    risk_flag: Optional[str] = None  # "safe" | "warning" | "danger" 



class MatchResponse(BaseModel):
    matched: bool
    room_id: Optional[str] = None  # MongoDB ObjectId as string
    matched_user_id: Optional[str] = None
    is_anonymous: bool = True
    match_type: MatchMode


class MatchQueueEntry(BaseModel):
    user_id: str
    current_emotion: EmotionType
    mode: MatchMode
    preferred_emotions: Optional[List[EmotionType]] = None
    queued_at: datetime = Field(default_factory=datetime.utcnow)

    role: Optional[SupportRole] = SupportRole.EITHER
    need: Optional[SupportNeed] = SupportNeed.VENT
    intensity: Optional[int] = Field(default=3, ge=1, le=5)
    risk_flag: Optional[str] = None


class AnonymousSettings(BaseModel):
    room_id: str  # MongoDB ObjectId as string
    user1_anonymous: bool = True
    user2_anonymous: bool = True


class RevealIdentityRequest(BaseModel):
    room_id: str  # MongoDB ObjectId as string
    user_id: str


class RevealIdentityResponse(BaseModel):
    success: bool
    message: str
    revealed_user_id: Optional[str] = None
    revealed_username: Optional[str] = None


