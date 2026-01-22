import os
import importlib.util
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from .utils import load_weaviate_manager
from .gemini_config import get_chat_model, GeminiClient
from .personas import get_persona_instruction

load_dotenv()

class AIChatService:
    """
    封装了 Gemini API，提供温柔、理解和富有同理心的陪伴
    """
    def __init__(self, llm_provider: str = 'gemini', save_to_weaviate: bool = True):
        self.llm_provider = 'gemini' # 强制使用 gemini
        self.model_id = None
        self.client = None
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
        self.model_id = get_chat_model()
        self.client = GeminiClient.get_client()
        
        if not self.client:
            print("⚠️  WARNING: GEMINI_API_KEY not found. AI chat功能将不可用.")

    async def chat_with_ai(self, message: str, history: list, user_id: str = None, session_id: str = None, 
                          image_data: Optional[bytes] = None, image_mime_type: Optional[str] = None,
                          avatar_id: Optional[str] = None):
        """
        发送消息给 AI 并获取回复，同时保存到 Weaviate。
        """
        response_text, updated_history = await self._chat_with_gemini(message, history, image_data, image_mime_type, avatar_id)
        
        # 保存对话到 Weaviate
        if self.save_to_weaviate and user_id:
            is_new_session = len(history) == 0
            saved_query = message
            if image_data:
                saved_query = f"[Image Uploaded] {message}"
                
            await self._save_conversation_to_weaviate(user_id, saved_query, response_text, session_id, is_new_session)
        
        return response_text, updated_history
    
    async def _save_conversation_to_weaviate(self, user_id: str, user_query: str, ai_response: str, 
                                               session_id: str = None, is_new_session: bool = False):
        """保存 AI 对话记录到 Weaviate"""
        if not self.weaviate_manager or not self.weaviate_manager.client:
            print("⚠️  Weaviate not available, skipping conversation save.")
            return
        
        try:
            timestamp = datetime.now(timezone.utc)
            conversation_data = {
                "userId": user_id,
                "sessionId": session_id or "",
                "isNewSession": is_new_session,
                "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "userQuery": user_query,
                "aiResponse": ai_response,
                "confidenceScore": 1.0,  # 默认置信度
            }
            
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
        """使用 Gemini 进行聊天 (New google-genai SDK)"""
        if not self.client:
             return "AI 服务暂时不可用，请稍后再试。", history

        # 动态获取当前机器人的系统指令
        system_instruction = get_persona_instruction(avatar_id) if avatar_id else self.system_instruction
        
        from google.genai import types
        
        # 准备内容用于发送
        content_parts = []
        if image_data and image_mime_type:
            content_parts.append(types.Part.from_bytes(data=image_data, mime_type=image_mime_type))
        content_parts.append(message)

        try:
            # 格式化 history 以满足 new SDK 的要求
            formatted_history = []
            for item in history:
                role = item.get("role")
                parts = item.get("parts", [])
                # Ensure parts are dicts with 'text'
                formatted_parts = []
                for p in parts:
                    if isinstance(p, str):
                        formatted_parts.append({"text": p})
                    else:
                        formatted_parts.append(p)
                formatted_history.append({"role": role, "parts": formatted_parts})

            # 使用 new SDK 的 chat 接口
            chat = self.client.chats.create(
                model=self.model_id,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                ),
                history=formatted_history
            )
            
            response = chat.send_message(content_parts)
            
            # 获取更新后的历史，google-genai SDK 的 Chat 对象历史属性可能因版本而异
            # 探测可用属性: _curated_history, history, _history
            new_history_objects = []
            for attr in ['_curated_history', 'history', '_history']:
                if hasattr(chat, attr):
                    new_history_objects = getattr(chat, attr)
                    break
            
            serializable_history = []
            if new_history_objects:
                for item in new_history_objects:
                    parts = []
                    if hasattr(item, 'parts'):
                        for p in item.parts:
                            if hasattr(p, 'text') and p.text:
                                parts.append(p.text)
                    serializable_history.append({"role": getattr(item, 'role', 'unknown'), "parts": parts})

            return response.text, serializable_history
        except Exception as e:
            import traceback
            print(f"❌ Gemini Error: {e}")
            traceback.print_exc()
            return "抱歉，处理您的请求时遇到问题。", history


