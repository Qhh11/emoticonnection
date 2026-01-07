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
    mood: str = Field(..., description="情绪")
    points_earned: int = Field(default=10, description="获得积分")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        validate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "date": "2025-01-07",
                "mood": "Joy",
                "points_earned": 10
            }
        }
