"""
Pydantic schemas for gift-related requests and responses.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class GiftSuggestionRequest(BaseModel):
    """Schema for requesting gift suggestions."""
    recipient_id: str
    requester_id: str
    occasion: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    context: Optional[str] = None


class GiftSuggestionResponse(BaseModel):
    """Schema for gift suggestion response."""
    id: str
    gift_description: str
    gift_category: str
    reasoning: str
    relevance_score: float
    matched_interests: List[str]
    occasion: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScenarioGiftRequest(BaseModel):
    """Schema for scenario-based gift matching."""
    recipient_id: str
    scenario_description: str
    context: Optional[Dict] = None
