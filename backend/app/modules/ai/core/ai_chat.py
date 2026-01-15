import os
import importlib.util
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv
from .utils import load_weaviate_manager

load_dotenv()

class AIChatService:
    """
    封装了 Gemini 和 DeepSeek API，支持切换 LLM provider
    """
    def __init__(self, llm_provider: str = 'deepseek', save_to_weaviate: bool = True):
        """
        初始化 AI 聊天服务
        
        Args:
            llm_provider: 使用的 LLM 提供商 - 'gemini' 或 'deepseek' (默认: 'deepseek')
            save_to_weaviate: 是否保存对话到 Weaviate (默认: True)
        """
        self.llm_provider = llm_provider.lower()
        self.model = None
        self.deepseek_client = None
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
        
        if self.llm_provider == 'deepseek':
            self._init_deepseek()
        else:
            self._init_gemini()
    
    def _init_gemini(self):
        """初始化 Gemini 客户端"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️  WARNING: GEMINI_API_KEY not found. AI chat功能将不可用.")
            print("   请创建 .env 文件并添加: GEMINI_API_KEY=your_key_here")
            return

        # 配置 Gemini
        genai.configure(api_key=api_key)
        
        # 初始化 Gemini 模型
        self.model = genai.GenerativeModel(
            model_name="gemini-flash-latest", 
            system_instruction=self.system_instruction
        )
    
    def _init_deepseek(self):
        """初始化 DeepSeek 客户端"""
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            print("⚠️  WARNING: DEEPSEEK_API_KEY not found. AI chat功能将不可用.")
            print("   请创建 .env 文件并添加: DEEPSEEK_API_KEY=your_key_here")
            return
        
        self.deepseek_client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )

    async def chat_with_ai(self, message: str, history: list, user_id: str = None, session_id: str = None):
        """
        发送消息给 AI 并获取回复，同时保存到 Weaviate。
        
        Args:
            message: 用户发送的消息文本
            history: 聊天历史列表，包含 'role' ('user' 或 'model') 和 'parts' (消息内容列表)
            user_id: 用户ID，用于保存到 Weaviate
            session_id: 会话ID，用于关联同一会话的消息
            
        Returns:
            str: AI 的回复文本
        """
        if self.llm_provider == 'deepseek':
            response_text = await self._chat_with_deepseek(message, history)
        else:
            response_text = await self._chat_with_gemini(message, history)
        
        # 保存对话到 Weaviate
        if self.save_to_weaviate and user_id:
            # 判断是否为新会话 (history 为空或只有当前消息)
            is_new_session = len(history) == 0
            await self._save_conversation_to_weaviate(user_id, message, response_text, session_id, is_new_session)
        
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
    
    async def _chat_with_gemini(self, message: str, history: list):
        """使用 Gemini 进行聊天"""
        if not self.model:
            return "AI 服务暂时不可用，请稍后再试。"
        # 开启聊天会话，传入历史记录
        chat = self.model.start_chat(history=history)
        # 异步发送消息
        response = await chat.send_message_async(message)
        return response.text
    
    async def _chat_with_deepseek(self, message: str, history: list):
        """使用 DeepSeek 进行聊天"""
        if not self.deepseek_client:
            return "AI 服务暂时不可用，请稍后再试。"
        
        # 转换历史记录格式为 OpenAI 格式
        messages = [{"role": "system", "content": self.system_instruction}]
        
        for msg in history:
            role = msg.get("role", "user")
            # 将 'model' 转换为 'assistant'
            if role == "model":
                role = "assistant"
            # 处理 parts 列表或字符串
            content = msg.get("parts", [""])[0] if isinstance(msg.get("parts"), list) else msg.get("parts", "")
            messages.append({"role": role, "content": content})
        
        # 添加当前消息
        messages.append({"role": "user", "content": message})
        
        # 调用 DeepSeek API (同步调用，但在 async 函数中)
        response = self.deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            stream=False
        )
        return response.choices[0].message.content
