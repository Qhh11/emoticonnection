from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.modules.ai.core.ai_chat import AIChatService
from app.modules.ai.repository.ai_repository import AIChatRepository
from config.mongodb_config import get_database

router = APIRouter()
# 初始化 AI 服务实例
ai_service = AIChatService()

def get_ai_repo() -> AIChatRepository:
    """Dependency to get AIChatRepository instance"""
    db = get_database()
    return AIChatRepository(db)

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
    user_id: str # Added for persistence
    session_id: Optional[str] = None # Optional: continue specific session
    message: str # 当前用户发送的消息
    history: Optional[List[ChatMessage]] = [] # 历史聊天记录

class ChatResponse(BaseModel):
    """
    聊天响应模型
    """
    response: str # AI 的回复内容

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, repo: AIChatRepository = Depends(get_ai_repo)):
    """
    AI 聊天接口
    
    接收用户的消息和历史记录，调用 Gemini API 获取回复，并保存到数据库。
    """
    try:
        # 1.获取或创建 AI 会话
        if request.session_id:
            # Continue specific session (assuming it exists and belongs to user)
            # For robustness we could verify it, but simplest is to trust ID for now or it fails
            session_id = request.session_id
        else:
            session = await repo.get_or_create_ai_session(request.user_id)
            session_id = session["id"]

        # 2. 保存用户消息
        await repo.save_message(
            session_id=session_id,
            sender_id=request.user_id,
            content=request.message,
            sender_type="user"
        )

        # 将 Pydantic 模型转换为 Gemini SDK 需要的格式 (list of dicts)
        history_data = [
            {"role": msg.role, "parts": msg.parts} for msg in request.history
        ]
        
        # 调用 AI 服务获取回复
        response_text = await ai_service.chat_with_ai(request.message, history_data)
        
        # 3. 保存 AI 回复
        # AI 的 sender_id 可以设为 "ai_assistant" 或固定值
        await repo.save_message(
            session_id=session_id,
            sender_id="ai_assistant",
            content=response_text,
            sender_type="ai"
        )

        return ChatResponse(response=response_text)
    except Exception as e:
        # 异常处理，返回 500 错误
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[dict])
async def get_user_sessions(user_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get all AI chat sessions for a user"""
    return await repo.get_user_sessions(user_id)

@router.post("/sessions", response_model=dict)
async def create_new_session(request: ChatRequest, repo: AIChatRepository = Depends(get_ai_repo)):
    """Force create a new AI chat session"""
    return await repo.create_session(request.user_id)

@router.get("/sessions/{session_id}/messages", response_model=List[dict])
async def get_session_history(session_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get message history for a session"""
    return await repo.get_session_messages(session_id)
