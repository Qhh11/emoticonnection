"""
Post Module Data Models

This file defines all data structures for post/feed functionality:
- Request models (client -> server)
- Response models (server -> client)
"""

from datetime import datetime
from typing import Optional, List, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_serializer


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
    """
    author_id: Union[int, str] = Field(..., description="Author user ID (ObjectId string or int)", json_schema_extra={"example": 1})
    title: Optional[str] = Field(
        None,
        description="Post title (optional)",
        max_length=100,
        json_schema_extra={"example": "My Thoughts"}
    )
    content: str = Field(
        ...,
        description="Post text content",
        min_length=1,
        max_length=2000,
        json_schema_extra={"example": "Feeling grateful today! #gratitude"}
    )
    post_type: PostType = Field(
        default=PostType.TEXT,
        description="Type of post: text, image, video, or mixed"
    )
    media_urls: Optional[List[str]] = Field(
        default=None,
        description="List of media URLs (images/videos)",
        json_schema_extra={"example": ["/static/uploads/image1.jpg"]}
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
        json_schema_extra={"example": ["gratitude", "mindfulness"]}
    )
    emotion: Optional[str] = Field(
        default=None,
        description="User-selected emotion for the post",
        json_schema_extra={"example": "happy"}
    )
    emotion_color: Optional[str] = Field(
        default=None,
        description="Custom emotion color (hex)",
        json_schema_extra={"example": "#9381BA"}
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
    emotion_color: Optional[str] = Field(None, description="Custom emotion color")
    ai_emotion: Optional[str] = Field(None, description="AI-analyzed emotion")
    like_count: int = Field(default=0, description="Number of likes")
    comment_count: int = Field(default=0, description="Number of comments")
    is_liked: bool = Field(default=False, description="Whether current user liked this")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_serializer('created_at', 'updated_at')
    def serialize_dates(self, dt: datetime, _info):
        return dt.isoformat() if dt else None


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
    """
    author_id: Union[int, str] = Field(..., description="Comment author user ID (ObjectId string or int)")
    content: str = Field(
        ...,
        description="Comment text",
        min_length=1,
        max_length=500,
        json_schema_extra={"example": "This is so relatable!"}
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
    """
    id: str = Field(..., description="Comment ID")
    post_id: str = Field(..., description="Parent post ID")
    author_id: Union[int, str] = Field(..., description="Author user ID (ObjectId string or int)")
    author_name: Optional[str] = Field(None, description="Author name (null if anonymous)")
    author_avatar: Optional[str] = Field(None, description="Author avatar ID (null if anonymous)")
    content: str = Field(..., description="Comment content")
    is_anonymous: bool = Field(..., description="Whether comment is anonymous")
    parent_id: Optional[str] = Field(None, description="Parent comment ID")
    like_count: int = Field(default=0, description="Number of likes")
    reply_count: int = Field(default=0, description="Number of replies")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(
        from_attributes=True
    )

    @field_serializer('created_at')
    def serialize_dates(self, dt: datetime, _info):
        return dt.isoformat()


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