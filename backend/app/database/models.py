"""
Extended Chat Models for Backend Integration
Extends database models to support all backend features
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Pydantic-compatible ObjectId"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class ChatSessionExtended(BaseModel):
    """
    Extended Chat Session Model
    Compatible with both database and backend requirements
    """
    id: Optional[str] = Field(None, alias="_id")
    session_type: str = "peer"  # ai/peer
    user_id: str  # Can be ObjectId or int
    peer_user_id: Optional[str] = None

    # Backend-specific fields
    is_anonymous: bool = False
    user1_revealed: bool = True
    user2_revealed: bool = True

    # Database fields
    ai_mode: Optional[str] = None
    match_score: Optional[float] = None
    match_criteria: Optional[dict] = None
    status: str = "active"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    user_rating: Optional[int] = None
    peer_rating: Optional[int] = None
    is_favorited: bool = False
    is_blocked: bool = False

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ChatMessageExtended(BaseModel):
    """
    Extended Chat Message Model
    Supports: text, emoji, image, video, audio + emotion analysis
    """
    id: Optional[str] = Field(None, alias="_id")
    session_id: str  # Can be ObjectId or int
    sender_id: str
    sender_type: str = "user"  # user/ai/peer

    # Message content
    content: str
    message_type: str = "text"  # text/emoji/image/video/audio/system

    # Media support (Backend requirement)
    media_url: Optional[str] = None  # For image/video files

    # AI features (Backend requirement)
    emotion: Optional[str] = None  # AI emotion analysis result

    # Safety (Database feature)
    safety_flag: Optional[str] = "safe"  # safe/warning/danger
    safety_note: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = False

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Supported message types
SUPPORTED_MESSAGE_TYPES = {
    "text": "Plain text message",
    "emoji": "Emoji-only message",
    "image": "Image with optional caption",
    "video": "Video with optional caption",
    "audio": "Audio message",
    "system": "System notification"
}
