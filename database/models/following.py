"""
Following Model
Collection: followings

Manages user following relationships (one-way)
Similar to Twitter/Instagram Follow mechanism
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Following(BaseModel):
    """Following relationship (one-way)"""
    id: Optional[str] = Field(default=None, alias="_id")

    # Follower → Following relationship
    follower_id: str = Field(..., description="User ID who follows (ObjectId string)")
    following_id: str = Field(..., description="User ID being followed (ObjectId string)")

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Optional: Follow source/reason
    source: Optional[str] = Field(None, description="profile/search/recommendation/match")

    class Config:
        allow_population_by_field_name = True
        json_schema_extra = {
            "example": {
                "follower_id": "69444eed764be66c80bfdfdf",
                "following_id": "69444eed764be66c80bfdfe0",
                "source": "profile"
            }
        }


# ============================================================================
# API Request/Response Schemas
# ============================================================================

class FollowRequest(BaseModel):
    """Follow request (Frontend → Backend)"""
    target_user_id: str = Field(..., description="User ID to follow")


class UnfollowRequest(BaseModel):
    """Unfollow request (Frontend → Backend)"""
    target_user_id: str = Field(..., description="User ID to unfollow")


class FollowingListResponse(BaseModel):
    """Following list response"""
    user_id: str
    username: str
    nickname: str
    following_since: datetime


class FollowerListResponse(BaseModel):
    """Follower list response"""
    user_id: str
    username: str
    nickname: str
    followed_since: datetime


# ============================================================================
# Query Helpers
# ============================================================================
#
# Common queries:
#
# 1. Get all users that user A follows (A's following list):
#    db.followings.find({"follower_id": user_a_id})
#
# 2. Get all users following user A (A's followers):
#    db.followings.find({"following_id": user_a_id})
#
# 3. Check if A follows B:
#    db.followings.find_one({"follower_id": user_a_id, "following_id": user_b_id})
#
# 4. Get mutual following relationships:
#    Requires two queries or aggregation
#
# ============================================================================
