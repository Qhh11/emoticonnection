from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.core.ai_chat import AIChatService

router = APIRouter()
# 初始化 AI 服务实例
ai_service = AIChatService()

# 定义请求和响应的数据模型

class ChatMessage(BaseModel):
    """
    单条聊天记录模型
    """
    role: str # "user" (用户) 或 "model" (AI)
    parts: List[str] # 消息内容部分

class ChatRequest(BaseModel):
    """
    聊天请求模型
    """
    message: str # 当前用户发送的消息
    history: Optional[List[ChatMessage]] = [] # 历史聊天记录

class ChatResponse(BaseModel):
    """
    聊天响应模型
    """
    response: str # AI 的回复内容

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI 聊天接口
    
    接收用户的消息和历史记录，调用 Gemini API 获取回复。
    """
    try:
        # 将 Pydantic 模型转换为 Gemini SDK 需要的格式 (list of dicts)
        history_data = [
            {"role": msg.role, "parts": msg.parts} for msg in request.history
        ]
        
        # 调用 AI 服务获取回复
        response_text = await ai_service.chat_with_ai(request.message, history_data)
        return ChatResponse(response=response_text)
    except Exception as e:
        # 异常处理，返回 500 错误
        raise HTTPException(status_code=500, detail=str(e))


