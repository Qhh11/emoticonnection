"""
打卡记录模型 (Check-in Model)
Collection: check_ins
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class CheckIn(BaseModel):
    """打卡记录模型"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(..., description="用户ID")
    date: str = Field(..., description="打卡日期 (YYYY-MM-DD)")
    mood: str = Field(..., description="情绪标签")
    points_earned: int = Field(default=10, description="获得积分")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # 情绪坐标轴相关字段
    coordinate_x: Optional[float] = Field(default=None, description="情绪坐标X: -1(消极)到1(积极)")
    coordinate_y: Optional[float] = Field(default=None, description="情绪坐标Y: -1(低能量)到1(高能量)")
    color: Optional[str] = Field(default=None, description="计算出的颜色HEX值")
    emoji: Optional[str] = Field(default=None, description="表情图标: angry/happy/sad/calm")

    class Config:
        validate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "date": "2025-01-07",
                "mood": "Excited",
                "points_earned": 10,
                "coordinate_x": 0.5,
                "coordinate_y": 0.8,
                "color": "#F9A825",
                "emoji": "happy"
            }
        }
