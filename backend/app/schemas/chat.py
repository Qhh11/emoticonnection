"""
Chat module data models

This file defines all data structures for chat functionality:
- Request models (client -> server)
- Response models (server -> client)
"""

from datetime import datetime
from pydantic import BaseModel, Field


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


# ============================================================================
# Message Models
# ============================================================================

class MessageCreate(BaseModel):
    """
    Request model for creating a message

    Example JSON:
    {
        "sender_id": 1,
        "content": "Hello, how are you?"
    }
    """
    sender_id: int = Field(..., description="Sender user ID", example=1)
    content: str = Field(
        ...,
        description="Message content",
        min_length=1,
        max_length=5000,
        example="Hello, how are you?"
    )


class MessageOut(BaseModel):
    """
    Complete message output model

    Used for:
    - REST API returning message history
    - WebSocket broadcasting new messages

    Example JSON:
    {
        "id": 456,
        "room_id": 123,
        "sender_id": 1,
        "content": "Hello, how are you?",
        "created_at": "2025-01-25T10:30:00Z"
    }
    """
    id: int = Field(..., description="Unique message ID", example=456)
    room_id: int = Field(..., description="Room ID this message belongs to", example=123)
    sender_id: int = Field(..., description="Sender user ID", example=1)
    content: str = Field(..., description="Message content", example="Hello, how are you?")
    created_at: datetime = Field(..., description="Message creation time (ISO 8601 format)")

    class Config:
        """Pydantic configuration for JSON encoding"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
