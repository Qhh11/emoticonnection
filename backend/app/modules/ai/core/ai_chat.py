import os
import importlib.util
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from .utils import load_weaviate_manager
from .gemini_config import get_chat_model
from .personas import get_persona_instruction

load_dotenv()

class AIChatService:
    """
    封装了 Gemini API，提供温柔、理解和富有同理心的陪伴
    """
    def __init__(self, llm_provider: str = 'gemini', save_to_weaviate: bool = True):
        """
        初始化 AI 聊天服务
        
        Args:
            llm_provider: 使用的 LLM 提供商 (当前仅支持 'gemini')
            save_to_weaviate: 是否保存对话到 Weaviate (默认: True)
        """
        self.llm_provider = 'gemini' # 强制使用 gemini
        self.model = None
        self.save_to_weaviate = save_to_weaviate
        self.weaviate_manager = None
        
        if self.save_to_weaviate:
            self.weaviate_manager = load_weaviate_manager()
        
        # 设定 AI 为一个温柔、理解和富有同理心的陪伴者
        self.system_instruction = """
        You are a gentle, understanding, and empathetic AI companion in the EmotionConnect app.
        Your goal is to provide emotional support, listen actively, and offer comforting advice when appropriate.
        
        Key traits:
        - Warm, non-judgmental tone.
        - Validate the user's feelings first.
        - If the user seems distressed, offer calming techniques (e.g., deep breathing) or suggest seeking professional help if it sounds serious (self-harm, etc.).
        - Keep responses concise but meaningful.
        """
        
        self._init_gemini()
    
    def _init_gemini(self):
        """初始化 Gemini 客户端"""
        # 使用统一的 Gemini 配置
        self.model = get_chat_model(self.system_instruction)
        
        if not self.model:
            print("⚠️  WARNING: GEMINI_API_KEY not found. AI chat功能将不可用.")
            print("   请创建 .env 文件并添加: GEMINI_API_KEY=your_key_here")

    async def chat_with_ai(self, message: str, history: list, user_id: str = None, session_id: str = None, 
                          image_data: Optional[bytes] = None, image_mime_type: Optional[str] = None,
                          avatar_id: Optional[str] = None):
        """
        发送消息给 AI 并获取回复，同时保存到 Weaviate。
        
        Args:
            message: 用户发送的消息文本
            history: 聊天历史列表，包含 'role' ('user' 或 'model') 和 'parts' (消息内容列表)
            user_id: 用户ID，用于保存到 Weaviate
            session_id: 会话ID，用于关联同一会话的消息
            image_data: 图片二进制数据 (Optional, 仅支持 Gemini)
            image_mime_type: 图片 MIME 类型 (e.g. 'image/jpeg')
            avatar_id: 机器人 ID，用于加载不同的人设
            
        Returns:
            str: AI 的回复文本
        """
        response_text = await self._chat_with_gemini(message, history, image_data, image_mime_type, avatar_id)
        
        # 保存对话到 Weaviate
        if self.save_to_weaviate and user_id:
            # 判断是否为新会话 (history 为空或只有当前消息)
            is_new_session = len(history) == 0
            # Note: storing image content in Weaviate is not implemented here, saving text only for now.
            # Might consider adding a marker [Image Uploaded] to the saved query.
            saved_query = message
            if image_data:
                saved_query = f"[Image Uploaded] {message}"
                
            await self._save_conversation_to_weaviate(user_id, saved_query, response_text, session_id, is_new_session)
        
        return response_text
    
    async def _save_conversation_to_weaviate(self, user_id: str, user_query: str, ai_response: str, 
                                               session_id: str = None, is_new_session: bool = False):
        """
        保存 AI 对话记录到 Weaviate
        
        Args:
            user_id: 用户ID
            user_query: 用户的消息
            ai_response: AI 的回复
            session_id: 会话ID
            is_new_session: 是否为新会话的第一条消息
        """
        if not self.weaviate_manager or not self.weaviate_manager.client:
            print("⚠️  Weaviate not available, skipping conversation save.")
            return
        
        try:
            timestamp = datetime.now(timezone.utc)
            
            # 构造 AIConversationRecord 格式的数据
            conversation_data = {
                "userId": user_id,
                "sessionId": session_id or "",
                "isNewSession": is_new_session,
                "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "userQuery": user_query,
                "aiResponse": ai_response,
                "confidenceScore": 1.0,  # 默认置信度
            }
            
            # 写入 Weaviate (使用 AIConversations 集合)
            success = self.weaviate_manager.write_data("AIConversations", [conversation_data])
            if success:
                print(f"✅ AI conversation saved to Weaviate for user {user_id}, session {session_id}")
            else:
                print(f"⚠️  Failed to save AI conversation to Weaviate")
        except Exception as e:
            print(f"⚠️  Error saving conversation to Weaviate: {e}")
    
    async def _chat_with_gemini(self, message: str, history: list, 
                               image_data: Optional[bytes] = None, image_mime_type: Optional[str] = None,
                               avatar_id: Optional[str] = None):
        """使用 Gemini 进行聊天"""
        # 动态获取当前机器人的系统指令
        system_instruction = get_persona_instruction(avatar_id) if avatar_id else self.system_instruction
        
        # 每次聊天重新初始化模型以应用正确的系统指令
        model = get_chat_model(system_instruction)
        
        if not model:
            return "AI 服务暂时不可用，请稍后再试。"
        
        # 开启聊天会话，传入历史记录
        chat = model.start_chat(history=history)
        
        try:
            content = []
            if image_data and image_mime_type:
                content.append({
                    "mime_type": image_mime_type,
                    "data": image_data
                })
            content.append(message)
            
            # 异步发送消息
            response = await chat.send_message_async(content)
            return response.text
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            return "抱歉，处理您的请求时遇到问题。"


