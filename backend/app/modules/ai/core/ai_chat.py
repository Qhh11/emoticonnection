import os
import google.generativeai as genai
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class AIChatService:
    """
    封装了 Gemini API 
    """
    def __init__(self):
        # 获取 API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️  WARNING: GEMINI_API_KEY not found. AI chat功能将不可用.")
            print("   请创建 .env 文件并添加: GEMINI_API_KEY=your_key_here")
            self.model = None
            return

        # 配置 Gemini
        genai.configure(api_key=api_key)
        
    
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
        
        # 初始化 Gemini 模型
        self.model = genai.GenerativeModel(
            model_name="gemini-flash-latest", 
            system_instruction=self.system_instruction
        )

    async def chat_with_ai(self, message: str, history: list):
        """
        发送消息给 Gemini 并获取回复。
        
        Args:
            message: 用户发送的消息文本
            history: 聊天历史列表，包含 'role' ('user' 或 'model') 和 'parts' (消息内容列表)
            
        Returns:
            str: AI 的回复文本
        """
        # 开启聊天会话，传入历史记录
        chat = self.model.start_chat(history=history)
        # 异步发送消息
        response = await chat.send_message_async(message)
        return response.text


