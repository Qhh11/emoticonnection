import os
import json
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class AIChatService:
    """
    封装了 Gemini 和 DeepSeek API，支持切换 LLM provider
    """
    def __init__(self, llm_provider: str = 'deepseek'):
        """
        初始化 AI 聊天服务
        
        Args:
            llm_provider: 使用的 LLM 提供商 - 'gemini' 或 'deepseek' (默认: 'deepseek')
        """
        self.llm_provider = llm_provider.lower()
        self.model = None
        self.deepseek_client = None
        
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

    async def chat_with_ai(self, message: str, history: list):
        """
        发送消息给 AI 并获取回复。
        
        Args:
            message: 用户发送的消息文本
            history: 聊天历史列表，包含 'role' ('user' 或 'model') 和 'parts' (消息内容列表)
            
        Returns:
            str: AI 的回复文本
        """
        if self.llm_provider == 'deepseek':
            return await self._chat_with_deepseek(message, history)
        else:
            return await self._chat_with_gemini(message, history)
    
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
