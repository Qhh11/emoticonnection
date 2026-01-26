"""
用户模型 (User Model)
Collection: users
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class MBTIProfile(BaseModel):
    """MBTI 档案"""
    type: str = Field(default="Unknown", description="MBTI 类型，如 INFP")
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class UserPreferences(BaseModel):
    """用户偏好设置"""
    chat_duration_preference: str = Field(default="medium", description="短聊/中聊/长聊")
    age_range_min: Optional[int] = Field(default=18, ge=13, le=100)
    age_range_max: Optional[int] = Field(default=35, ge=13, le=100)
    notification_enabled: bool = Field(default=True)
    theme: str = Field(default="default", description="主题风格")


class User(BaseModel):
    """用户主模型"""
    id: Optional[str] = Field(default=None, alias="_id")
    username: str = Field(..., min_length=3, max_length=30)
    email: Optional[EmailStr] = None
    hashed_password: str = Field(...)
    
    # 基础信息
    nickname: str = Field(..., description="昵称（匿名展示）")
    age: Optional[int] = Field(None, ge=13, le=100)
    gender: Optional[str] = Field(None, description="male/female/other/prefer_not_to_say")
    bio: Optional[str] = Field(default="", max_length=500, description="用户简介")
    
    # MBTI
    mbti: MBTIProfile = Field(default_factory=MBTIProfile)
    
    # 偏好设置
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    
    # 积分系统
    points: int = Field(default=300, description="总积分")
    level: int = Field(default=3, description="用户等级")
    
    # 个性化
    avatar: str = Field(default="blushy_female", description="用户头像 ID")
    avatar_url: Optional[str] = None
    unlocked_avatars: List[str] = Field(default_factory=list)
    unlocked_ai_styles: List[str] = Field(default_factory=list)
    
    # 账号状态
    is_active: bool = Field(default=True)
    is_banned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "username": "user123",
                "email": "user@example.com",
                "nickname": "vv",
                "age": 22,
                "gender": "prefer_not_to_say",
                "points": 150,
                "level": 2
            }
        }
    )
