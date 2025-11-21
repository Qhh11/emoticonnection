"""
Pydantic schemas for profile-related requests and responses.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class ProfileCreate(BaseModel):
    """Schema for creating user profile."""
    user_id: str
    interest_tags: List[str] = []
    # TODO: Add onboarding data fields


class ProfileResponse(BaseModel):
    """Schema for profile response."""
    user_id: str
    interest_tags: List[str]
    emotion_profile: Optional[Dict] = None
    personality_data: Optional[Dict] = None
    communication_style: Optional[str] = None
    total_messages: int
    total_posts: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PersonalityInsights(BaseModel):
    """Schema for personality insights."""
    traits: Dict[str, float]  # trait_name: score (0-100)
    communication_style: str
    strengths: List[str]
    growth_areas: List[str]
    summary: str
    # TODO: Add more insight fields


class InterestUpdate(BaseModel):
    """Schema for updating interests."""
    add_interests: List[str] = []
    remove_interests: List[str] = []
