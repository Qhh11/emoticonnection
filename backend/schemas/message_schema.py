"""
Pydantic schemas for message-related requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class MessageCreate(BaseModel):
    """
    Schema for creating a new message.

    TODO: Define required fields for message creation
    """
    sender_id: str
    receiver_id: str
    conversation_id: str
    content: str

    class Config:
        # TODO: Add Pydantic config if needed
        pass


class MessageResponse(BaseModel):
    """
    Schema for message response.

    TODO: Define all fields returned when fetching a message
    """
    id: str
    sender_id: str
    receiver_id: str
    conversation_id: str
    content: str
    created_at: datetime
    is_read: bool
    # TODO: Add more fields as needed

    class Config:
        from_attributes = True


class MessageWithEmotion(BaseModel):
    """
    Schema for message with emotion analysis data.

    TODO: Include emotion analysis in message response
    """
    id: str
    sender_id: str
    receiver_id: str
    conversation_id: str
    content: str
    created_at: datetime
    is_read: bool
    # TODO: Add emotion_data field with proper structure
    # emotion_data: Optional[Dict] = None

    class Config:
        from_attributes = True


class EmotionAnalysisRequest(BaseModel):
    """
    Schema for requesting emotion analysis.

    TODO: Define required data for emotion analysis
    """
    message_text: str
    context: Optional[str] = None
    sender_id: Optional[str] = None

    class Config:
        pass


class EmotionAnalysisResponse(BaseModel):
    """
    Schema for emotion analysis results.

    TODO: Define structure of emotion analysis output
    """
    primary_emotion: str
    secondary_emotions: List[str] = []
    tone: str
    intent: str
    sentiment_score: float
    confidence_scores: Dict[str, float] = {}

    # TODO: Add more fields as needed

    class Config:
        pass


class ConversationCreate(BaseModel):
    """
    Schema for creating a conversation.

    TODO: Define fields needed to create a conversation
    """
    participant_ids: List[str]
    title: Optional[str] = None

    class Config:
        pass


class ConversationResponse(BaseModel):
    """
    Schema for conversation response.

    TODO: Define conversation response structure
    """
    id: str
    participant_ids: List[str]
    title: Optional[str] = None
    created_at: datetime
    last_message_at: Optional[datetime] = None
    # TODO: Add unread_count, last_message_preview, etc.

    class Config:
        from_attributes = True
