"""
Post Module Data Models

This file defines all data structures for post/feed functionality:
- Request models (client -> server)
- Response models (server -> client)
"""

from datetime import datetime
from typing import Optional, List, Union
from enum import Enum
from pydantic import BaseModel, Field


class PostType(str, Enum):
    """Type of post content"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    MIXED = "mixed"  # Text + media


class PostVisibility(str, Enum):
    """Post visibility settings"""
    PUBLIC = "public"
    ANONYMOUS = "anonymous"
    FRIENDS_ONLY = "friends_only"


# ============================================================================
# Post Models
# ============================================================================

class PostCreate(BaseModel):
    """
    Request model for creating a new post

    Example JSON:
    {
        "author_id": 1,
        "title": "My Thoughts",
        "content": "Feeling grateful today! #gratitude #mindfulness",
        "post_type": "text",
        "is_anonymous": true,
        "tags": ["gratitude", "mindfulness"]
    }

    Example with media:
    {
        "author_id": 1,
        "title": "Beautiful Sunset",
        "content": "Beautiful sunset! #nature",
        "post_type": "image",
        "media_urls": ["/static/uploads/sunset.jpg"],
        "is_anonymous": false,
        "tags": ["nature"]
    }
    """
    author_id: Union[int, str] = Field(..., description="Author user ID (ObjectId string or int)", example=1)
    title: Optional[str] = Field(
        None,
        description="Post title (optional)",
        max_length=100,
        example="My Thoughts"
    )
    content: str = Field(
        ...,
        description="Post text content",
        min_length=1,
        max_length=2000,
        example="Feeling grateful today! #gratitude"
    )
    post_type: PostType = Field(
        default=PostType.TEXT,
        description="Type of post: text, image, video, or mixed"
    )
    media_urls: Optional[List[str]] = Field(
        default=None,
        description="List of media URLs (images/videos)",
        example=["/static/uploads/image1.jpg"]
    )
    is_anonymous: bool = Field(
        default=False,
        description="Whether to post anonymously"
    )
    visibility: PostVisibility = Field(
        default=PostVisibility.PUBLIC,
        description="Post visibility setting"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        description="List of tags (without #)",
        example=["gratitude", "mindfulness"]
    )
    emotion: Optional[str] = Field(
        default=None,
        description="User-selected emotion for the post",
        example="happy"
    )


class PostUpdate(BaseModel):
    """Request model for updating a post"""
    title: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, max_length=2000)
    tags: Optional[List[str]] = None
    visibility: Optional[PostVisibility] = None


class PostOut(BaseModel):
    """
    Response model for a post

    Example JSON:
    {
        "id": "507f1f77bcf86cd799439011",
        "author_id": 1,
        "author_name": "User 1",
        "title": "My Thoughts",
        "content": "Feeling grateful today!",
        "post_type": "text",
        "media_urls": null,
        "is_anonymous": true,
        "visibility": "public",
        "tags": ["gratitude", "mindfulness"],
        "emotion": "happy",
        "ai_emotion": "Happiness",
        "like_count": 15,
        "comment_count": 3,
        "is_liked": false,
        "created_at": "2025-01-25T10:30:00Z",
        "updated_at": null
    }
    """
    id: str = Field(..., description="Post ID (MongoDB ObjectId)")
    author_id: Union[int, str] = Field(..., description="Author user ID (ObjectId string or int)")
    author_name: Optional[str] = Field(
        None,
        description="Author display name (null if anonymous)"
    )
    author_avatar: Optional[str] = Field(
        None,
        description="Author avatar ID (null if anonymous)"
    )
    title: Optional[str] = Field(None, description="Post title")
    content: str = Field(..., description="Post text content")
    post_type: PostType = Field(..., description="Type of post")
    media_urls: Optional[List[str]] = Field(None, description="Media URLs")
    is_anonymous: bool = Field(..., description="Whether post is anonymous")
    visibility: PostVisibility = Field(..., description="Visibility setting")
    tags: List[str] = Field(default_factory=list, description="Post tags")
    emotion: Optional[str] = Field(None, description="User-selected emotion")
    ai_emotion: Optional[str] = Field(None, description="AI-analyzed emotion")
    like_count: int = Field(default=0, description="Number of likes")
    comment_count: int = Field(default=0, description="Number of comments")
    is_liked: bool = Field(default=False, description="Whether current user liked this")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PostListResponse(BaseModel):
    """Paginated list of posts"""
    posts: List[PostOut]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# Comment Models
# ============================================================================

class CommentCreate(BaseModel):
    """
    Request model for creating a comment
    
    Example JSON:
    {
        "author_id": 2,
        "content": "This is so relatable! 💪",
        "is_anonymous": false
    }
    """
    author_id: Union[int, str] = Field(..., description="Comment author user ID (ObjectId string or int)")
    content: str = Field(
        ...,
        description="Comment text",
        min_length=1,
        max_length=500,
        example="This is so relatable!"
    )
    is_anonymous: bool = Field(
        default=False,
        description="Whether to comment anonymously"
    )
    parent_id: Optional[str] = Field(
        default=None,
        description="Parent comment ID for replies"
    )


class CommentOut(BaseModel):
    """
    Response model for a comment
    
    Example JSON:
    {
        "id": "507f1f77bcf86cd799439012",
        "post_id": "507f1f77bcf86cd799439011",
        "author_id": 2,
        "author_name": "User 2",
        "content": "This is so relatable!",
        "is_anonymous": false,
        "parent_id": null,
        "like_count": 5,
        "reply_count": 2,
        "created_at": "2025-01-25T11:00:00Z"
    }
    """
    id: str = Field(..., description="Comment ID")
    post_id: str = Field(..., description="Parent post ID")
    author_id: Union[int, str] = Field(..., description="Author user ID (ObjectId string or int)")
    author_name: Optional[str] = Field(None, description="Author name (null if anonymous)")
    content: str = Field(..., description="Comment content")
    is_anonymous: bool = Field(..., description="Whether comment is anonymous")
    parent_id: Optional[str] = Field(None, description="Parent comment ID")
    like_count: int = Field(default=0, description="Number of likes")
    reply_count: int = Field(default=0, description="Number of replies")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CommentListResponse(BaseModel):
    """Paginated list of comments"""
    comments: List[CommentOut]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# Like Models
# ============================================================================

class LikeCreate(BaseModel):
    """Request model for liking a post/comment"""
    user_id: Union[int, str] = Field(..., description="User who is liking (ObjectId string or int)")


class LikeResponse(BaseModel):
    """Response model for like/unlike action"""
    success: bool
    action: str  # "liked" or "unliked"
    new_like_count: int


# ============================================================================
# Tag Models
# ============================================================================

class TagInfo(BaseModel):
    """Information about a tag"""
    tag: str
    post_count: int
    trending_score: float = 0.0


class TrendingTagsResponse(BaseModel):
    """Response model for trending tags"""
    tags: List[TagInfo]