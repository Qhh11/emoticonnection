import os
import json
from datetime import datetime
import google.generativeai as genai
from .utils import load_weaviate_manager

class DiaryService:
    """
    负责日记生成和会话总结的服务类
    """
    def __init__(self, llm_provider: str = 'gemini'):
        """
        初始化 Diary 服务
        
        Args:
            llm_provider: 使用的 LLM 提供商 (当前仅支持 'gemini')
        """
        self.llm_provider = 'gemini' # 强制使用 gemini
        self.model = None
        self.weaviate_manager = load_weaviate_manager()
        
        self._init_gemini()

    def _init_gemini(self):
        """初始化 Gemini 客户端"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️  WARNING: GEMINI_API_KEY not found. Diary Generation feature will be unavailable.")
            return

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name="gemini-flash-latest")
    
    async def _generate_with_gemini(self, prompt: str) -> str:
        """使用 Gemini 生成内容"""
        if not self.model:
            raise Exception("Gemini model not initialized")
        response = await self.model.generate_content_async(prompt)
        return response.text
    
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

    async def generate_from_text(self, text: str) -> dict:
        """
        Summarize raw manual text into a diary entry.
        """
        if not text.strip():
            return {"title": "Empty Thought", "content": "I didn't write much today.", "mood": "Neutral"}

        prompt = f"""
        Please refine and summarize the following personal thoughts into a beautiful diary entry.
        
        The diary entry should:
        1. Capture the core essence of what I wrote.
        2. Use a reflective, personal, and poetic tone.
        3. Be concise (around 50-150 words).
        
        Also provide:
        1. A short, creative title for this entry.
        2. A single word mood describing my state (e.g., Anxious, Relieved, Happy, Sad, Bored, Fear, Disgust, Awkward, Envy).

        Output strictly in JSON format:
        {{
            "title": "...",
            "content": "...",
            "mood": "..."
        }}

        Raw thoughts:
        {text}
        """
        
        try:
            res_text = await self._generate_with_gemini(prompt)
            
            res_text = res_text.strip()
            if res_text.startswith("```json"):
                res_text = res_text[7:]
            if res_text.startswith("```"):
                res_text = res_text[3:]
            if res_text.endswith("```"):
                res_text = res_text[:-3]
            res_text = res_text.strip()
            
            return json.loads(res_text)
        except Exception as e:
            print(f"Error processing manual diary: {e}")
            return {
                "title": "Reflections", 
                "content": text[:500], # Fallback to original text if AI fails
                "mood": "Neutral"
            }

    async def fetch_session_conversations(self, session_id: str) -> list:
        """
        从 Weaviate 读取指定 sessionId 的所有 AIConversations 记录
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
