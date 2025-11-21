"""
Pydantic schemas for post-related requests and responses.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class PostCreate(BaseModel):
    """Schema for creating a post."""
    author_id: str
    content: str
    title: Optional[str] = None
    emotion_tags: List[str] = []
    interest_tags: List[str] = []
    visibility: str = "public"  # public/friends/private


class PostResponse(BaseModel):
    """Schema for post response."""
    id: str
    author_id: str
    content: str
    title: Optional[str] = None
    emotion_tags: List[str]
    interest_tags: List[str]
    visibility: str
    view_count: int
    reaction_counts: Dict[str, int]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PostFeedResponse(BaseModel):
    """Schema for post in feed with additional metadata."""
    id: str
    author_id: str
    author_name: str  # TODO: Include from User model
    content: str
    title: Optional[str] = None
    emotion_tags: List[str]
    interest_tags: List[str]
    created_at: datetime
    reaction_counts: Dict[str, int]
    # TODO: Add relevance_score for personalized feed

    class Config:
        from_attributes = True
