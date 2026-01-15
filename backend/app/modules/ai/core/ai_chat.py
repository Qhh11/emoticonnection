import os
import json
import importlib.util
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pathlib import Path
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def _load_weaviate_manager():
    """动态加载 WeaviateManager"""
    try:
        # 尝试多种路径查找 genai/app
        current_file = Path(__file__).resolve()
        
        # 方法1: 从 backend/app/modules/ai/core 向上走 5 层到项目根目录
        project_root = current_file.parents[5]  # backend 的父目录是 emoticonnection
        genai_app_path = project_root / "genai" / "app"
        
        # 方法2: 如果方法1失败，尝试 WSL 路径
        if not genai_app_path.exists():
            wsl_path = Path("/mnt/c/Users/10857/Desktop/emoticonnection/genai/app")
            if wsl_path.exists():
                genai_app_path = wsl_path
        
        if not genai_app_path.exists():
            print(f"⚠️  genai/app path not found: {genai_app_path}")
            return None
        
        # 加载 .env 文件
        env_path = genai_app_path / ".env"
        if env_path.exists():
            from dotenv import load_dotenv
            load_dotenv(env_path)
        
        # 导入 weaviate_client
        weaviate_spec = importlib.util.spec_from_file_location(
            "weaviate_client", genai_app_path / "weaviate_client.py"
        )
        weaviate_module = importlib.util.module_from_spec(weaviate_spec)
        weaviate_spec.loader.exec_module(weaviate_module)
        return weaviate_module.WeaviateManager()
    except Exception as e:
        print(f"⚠️  Failed to load WeaviateManager: {e}")
        import traceback
        traceback.print_exc()
        return None


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
            self.weaviate_manager = _load_weaviate_manager()
        
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

    async def generate_diary_summary(self, history: list) -> dict:
        """
        Generate a diary entry based on chat history.
        """
        if not history:
            return {"title": "Empty Diary", "content": "No conversation to record today.", "mood": "Neutral"}

        # Construct prompt
        conversation_text = ""
        for msg in history:
            role = "Me" if msg.get("role") == "user" else "AI Companion"
            # Handle parts list or string
            content = msg.get("parts", [""])[0] if isinstance(msg.get("parts"), list) else msg.get("parts", "")
            conversation_text += f"{role}: {content}\n"

        prompt = f"""
        Based on the following conversation, write a personal diary entry from the perspective of the user ("Me").
        
        The diary should:
        1. Capture the emotions and main thoughts discussed.
        2. Be written in a reflective, personal tone.
        3. Be concise (around 100-200 words).
        
        Also provide:
        1. A short, creative title for this entry.
        2. A single word mood describing the user's state (e.g., Anxious, Relieved, Happy, Sad).

        Output strictly in JSON format:
        {{
            "title": "...",
            "content": "...",
            "mood": "..."
        }}

        Conversation:
        {conversation_text}
        """
        
        try:
            if self.llm_provider == 'deepseek':
                text = await self._generate_with_deepseek(prompt)
            else:
                text = await self._generate_with_gemini(prompt)
            
            # Clean response text to ensure it's valid JSON (remove markdown ticks)
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            return json.loads(text)
        except Exception as e:
            print(f"Error generating diary: {e}")
            return {
                "title": "A Day to Remember", 
                "content": "I had a conversation today, but I'm having trouble putting it into words right now.",
                "mood": "Reflective"
            }
    
    async def _generate_with_gemini(self, prompt: str) -> str:
        """使用 Gemini 生成内容"""
        if not self.model:
            raise Exception("Gemini model not initialized")
        response = await self.model.generate_content_async(prompt)
        return response.text
    
    async def _generate_with_deepseek(self, prompt: str) -> str:
        """使用 DeepSeek 生成内容"""
        if not self.deepseek_client:
            raise Exception("DeepSeek client not initialized")
        response = self.deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Always respond in the requested format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2048,
            stream=False
        )
        return response.choices[0].message.content

    async def fetch_session_conversations(self, session_id: str) -> list:
        """
        从 Weaviate 读取指定 sessionId 的所有 AIConversations 记录
        
        Args:
            session_id: 会话ID
            
        Returns:
            按时间排序的对话记录列表
        """
        if not self.weaviate_manager or not self.weaviate_manager.client:
            print("⚠️  Weaviate not available")
            return []
        
        try:
            from weaviate.classes.query import Filter
            import weaviate.classes.query as wq
            
            if not self.weaviate_manager.client.is_connected():
                self.weaviate_manager.client.connect()
            
            collection = self.weaviate_manager.client.collections.get("AIConversations")
            
            response = collection.query.fetch_objects(
                filters=Filter.by_property("sessionId").equal(session_id),
                limit=1000,
                sort=wq.Sort.by_property("timestamp", ascending=True)
            )
            
            conversations = []
            for obj in response.objects:
                props = obj.properties
                # 标准化时间戳
                ts = props.get('timestamp', '')
                if isinstance(ts, datetime):
                    ts = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
                conversations.append({
                    'timestamp': ts,
                    'userQuery': props.get('userQuery', ''),
                    'aiResponse': props.get('aiResponse', ''),
                    'isNewSession': props.get('isNewSession', False)
                })
            
            print(f"✅ Fetched {len(conversations)} conversations for session {session_id}")
            return conversations
            
        except Exception as e:
            print(f"⚠️  Error fetching session conversations: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def generate_session_summary(self, session_id: str) -> dict:
        """
        读取指定 sessionId 的历史对话，生成对话总结
        
        Args:
            session_id: 会话ID
            
        Returns:
            包含总结信息的字典:
            {
                "session_id": "...",
                "message_count": 10,
                "summary": "总结内容",
                "key_topics": ["话题1", "话题2"],
                "emotional_journey": "情绪变化描述",
                "suggestions": ["建议1", "建议2"]
            }
        """
        # 1. 获取会话历史
        conversations = await self.fetch_session_conversations(session_id)
        
        if not conversations:
            return {
                "session_id": session_id,
                "message_count": 0,
                "summary": "该会话没有找到对话记录。",
                "key_topics": [],
                "emotional_journey": "",
                "dominant_emotion": "Joy",
                "suggestions": []
            }
        
        # 2. 构建对话文本
        conversation_text = ""
        for conv in conversations:
            timestamp = conv.get('timestamp', '')[:19].replace('T', ' ')  # 简化时间格式
            user_msg = conv.get('userQuery', '')
            ai_msg = conv.get('aiResponse', '')
            conversation_text += f"[{timestamp}]\n用户: {user_msg}\nAI: {ai_msg}\n\n"
        
        # 3. 构建 prompt
        prompt = f"""请基于以下用户与AI助手的对话历史，生成一份详细的对话总结。

【对话历史】
{conversation_text}

请返回严格的JSON格式:
{{
    "summary": "200字左右的对话内容总结，概括用户主要讨论了什么",
    "key_topics": ["话题1", "话题2"],
    "emotional_journey": "描述用户在对话中的情绪变化，从开始到结束的情绪轨迹",
    "dominant_emotion": "必须是以下情绪之一: Bored, Fear, Joy, Sad, Disgust, Anxious, Angry, Awkward, Envy",
    "user_needs": "分析用户的核心需求或关注点",
    "suggestions": ["基于对话给用户的建议1", "建议2", "建议3"]
}}

注意：
1. 用温暖、理解的语气撰写总结
2. key_topics 最多5个关键话题
3. suggestions 提供实用且有针对性的建议
4. dominant_emotion 必须严格从以下选项中选择一个最符合对话整体情绪的: Bored, Fear, Joy, Sad, Disgust, Anxious, Angry, Awkward, Envy
5. 只返回JSON，不要其他内容
"""

        # 4. 调用 LLM 生成总结
        try:
            if self.llm_provider == 'deepseek':
                text = await self._generate_with_deepseek(prompt)
            else:
                text = await self._generate_with_gemini(prompt)
            
            # 清理 JSON 格式
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            result = json.loads(text)
            result["session_id"] = session_id
            result["message_count"] = len(conversations)
            
            print(f"✅ Generated summary for session {session_id}")
            return result
            
        except Exception as e:
            print(f"⚠️  Error generating session summary: {e}")
            return {
                "session_id": session_id,
                "message_count": len(conversations),
                "summary": "无法生成总结，请稍后重试。",
                "key_topics": [],
                "emotional_journey": "",
                "suggestions": []
            }
