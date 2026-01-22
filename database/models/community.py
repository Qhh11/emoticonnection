"""
社区模型 (Community Model)
Collections: community_posts, post_comments
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class CommunityPost(BaseModel):
    """树洞社区帖子"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: Optional[str] = Field(..., description="发帖用户 ID（匿名）")
    
    # 帖子内容
    content: str = Field(..., min_length=1, max_length=5000, description="帖子内容")
    emotion_category: str = Field(..., description="焦虑/人际/学业压力/开心/失眠/失落")
    
    # 匿名信息
    anonymous_nickname: str = Field(..., description="匿名昵称，如 '小鹿#1234'")
    
    # 互动数据
    likes_count: int = Field(default=0)
    comments_count: int = Field(default=0)
    views_count: int = Field(default=0)
    
    # 推荐标记
    is_featured: bool = Field(default=False, description="是否精选推荐")
    is_need_response: bool = Field(default=False, description="是否需要回应（反向树洞）")
    
    # 审核状态
    moderation_status: str = Field(default="pending", description="pending/approved/rejected")
    is_reported: bool = Field(default=False)
    
    # 时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_deleted: bool = Field(default=False)
    
    class Config:
        allow_population_by_field_name = True


class PostComment(BaseModel):
    """帖子评论"""
    id: Optional[str] = Field(default=None, alias="_id")
    post_id: Optional[str] = Field(..., description="所属帖子 ID")
    user_id: Optional[str] = Field(..., description="评论用户 ID")
    
    # 评论内容
    content: str = Field(..., min_length=1, max_length=1000)
    anonymous_nickname: str = Field(..., description="匿名昵称")
    
    # 互动
    likes_count: int = Field(default=0)
    
    # 审核
    moderation_status: str = Field(default="approved")
    is_reported: bool = Field(default=False)
    
    # 时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = Field(default=False)
    
    class Config:
        allow_population_by_field_name = True


class PostLike(BaseModel):
    """点赞记录"""
    id: Optional[str] = Field(default=None, alias="_id")
    post_id: Optional[str] = Field(None)
    comment_id: Optional[str] = Field(None)
    user_id: Optional[str] = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
