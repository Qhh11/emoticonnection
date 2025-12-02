"""
情绪日志与分析模型 (Emotion Log & Analytics Model)
Collections: emotion_logs, emotion_analytics
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from bson import ObjectId
from .user import PyObjectId


class EmotionLog(BaseModel):
    """情绪日志（细粒度记录）"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(...)
    
    # 情绪数据
    primary_emotion: str = Field(...)
    mood_score: float = Field(..., ge=0, le=10)
    intensity: float = Field(default=5.0, ge=0, le=10, description="情绪强度")
    
    # 来源
    source: str = Field(..., description="diary/chat/community")
    source_id: Optional[PyObjectId] = Field(None, description="来源记录 ID")
    
    # 时间
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class EmotionAnalytics(BaseModel):
    """情绪分析报告（周报/月报）"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(...)
    
    # 报告周期
    period_type: str = Field(..., description="weekly/monthly")
    start_date: datetime = Field(...)
    end_date: datetime = Field(...)
    
    # 分析结果
    average_mood_score: float = Field(...)
    most_frequent_emotion: str = Field(...)
    emotion_distribution: Dict[str, int] = Field(default_factory=dict)
    emotion_trend: List[Dict] = Field(default_factory=list, description="情绪波动曲线数据")
    
    # 触发因素
    common_triggers: List[str] = Field(default_factory=list)
    high_risk_periods: List[Dict] = Field(default_factory=list, description="高风险时段")
    
    # 建议
    ai_suggestions: List[str] = Field(default_factory=list)
    improvement_areas: List[str] = Field(default_factory=list)
    
    # 生成时间
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
