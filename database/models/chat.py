"""
聊天模型 (Chat Model)
Collections: chat_sessions, chat_messages
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatSession(BaseModel):
    """聊天会话"""
    id: Optional[str] = Field(default=None, alias="_id")

    # 会话类型
    session_type: str = Field(..., description="ai/peer")

    # 参与者
    user_id: str = Field(..., description="发起用户 ID")
    peer_user_id: Optional[str] = Field(None, description="对方用户 ID（Peer Chat）")

    # AI 模式（仅 AI Chat）
    ai_mode: Optional[str] = Field(None, description="venting/analytic/chill/stabilize/mindfulness")

    # 匹配信息（仅 Peer Chat）
    match_score: Optional[float] = Field(None, description="匹配度分数")
    match_criteria: Optional[dict] = Field(None, description="匹配条件")

    # 匿名聊天功能 (Backend requirement)
    is_anonymous: bool = Field(default=False, description="是否为匿名聊天")
    user1_revealed: bool = Field(default=True, description="用户1是否揭露身份")
    user2_revealed: bool = Field(default=True, description="用户2是否揭露身份")

    # 会话状态
    status: str = Field(default="active", description="active/ended/reported")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    # 会话后评价
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    peer_rating: Optional[int] = Field(None, ge=1, le=5)
    is_favorited: bool = Field(default=False)
    is_blocked: bool = Field(default=False)

    class Config:
        allow_population_by_field_name = True


class ChatMessage(BaseModel):
    """聊天消息"""
    id: Optional[str] = Field(default=None, alias="_id")
    session_id: Optional[str] = Field(..., description="所属会话 ID")

    # 发送者信息
    sender_id: Optional[str] = Field(..., description="发送者 ID")
    sender_type: str = Field(..., description="user/ai/peer")

    # 消息内容
    content: str = Field(..., description="消息文本")
    message_type: str = Field(default="text", description="text/emoji/image/video/audio/system")

    # 媒体支持 (Backend requirement)
    media_url: Optional[str] = Field(None, description="媒体文件 URL（图片/视频）")

    # AI 情绪分析 (Backend requirement)
    emotion: Optional[str] = Field(None, description="AI 分析的情绪标签")

    # AI 安全检测
    safety_flag: Optional[str] = Field(None, description="safe/warning/danger")
    safety_note: Optional[str] = Field(None, description="安全提示内容")

    # 时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = Field(default=False)

    class Config:
        allow_population_by_field_name = True