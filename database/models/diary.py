"""
情绪日记模型 (Emotion Diary Model)
Collection: diary_entries
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId
from .user import PyObjectId


class EmotionTags(BaseModel):
    """情绪标签"""
    primary_emotion: str = Field(..., description="主情绪：开心/悲伤/焦虑/愤怒/平静")
    secondary_emotions: List[str] = Field(default_factory=list, description="副情绪：愉悦/紧张/无助/暴躁等")
    physical_feelings: List[str] = Field(default_factory=list, description="身体感受：疲惫/轻松/头胀等")
    event_type: Optional[str] = Field(None, description="事件类型：人际/学习/恋爱/家庭/工作")


class MediaAttachment(BaseModel):
    """媒体附件"""
    type: str = Field(..., description="image/audio")
    url: str = Field(..., description="文件存储 URL")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class DiaryEntry(BaseModel):
    """情绪日记条目"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="用户 ID")
    
    # 日记内容
    content: str = Field(..., min_length=1, description="日记文本内容")
    emotion_tags: EmotionTags = Field(..., description="情绪标签")
    
    # 媒体附件
    attachments: List[MediaAttachment] = Field(default_factory=list)
    
    # AI 分析结果
    ai_analysis: Optional[dict] = Field(None, description="AI 自动分析结果")
    mood_score: Optional[float] = Field(None, ge=0, le=10, description="心情评分 0-10")
    
    # 用户期望的陪伴方式
    desired_support_type: Optional[str] = Field(None, description="倾听/建议/陪伴")
    
    # 时间信息
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # 是否已删除
    is_deleted: bool = Field(default=False)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "content": "今天考试没考好，感觉很沮丧...",
                "emotion_tags": {
                    "primary_emotion": "悲伤",
                    "secondary_emotions": ["无助", "焦虑"],
                    "physical_feelings": ["疲惫"],
                    "event_type": "学习"
                },
                "mood_score": 4.5,
                "desired_support_type": "倾听"
            }
        }
