import os
import google.generativeai as genai
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class EmotionService:
    """
    情绪分析服务类
    """
    def __init__(self):
        # 获取 API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️  WARNING: GEMINI_API_KEY not found. Emotion分析功能将不可用.")
            self.model = None
            return

        # 配置 Gemini
        genai.configure(api_key=api_key)
        
        # 初始化 Gemini 模型
        self.model = genai.GenerativeModel(
            model_name="gemini-flash-latest"
        )

    async def analyze_emotion(self, text: str):
        """
        分析文本的情绪。
        
        Args:
            text: 需要分析的文本
            
        Returns:
            str: 情绪分类结果 (例如: 焦虑, 难过, 疲惫, 开心, 平静)
        """
        prompt = f"""
        Please analyze the emotion of the following text and categorize it into one of these categories:
        [Anxiety, Sadness, Fatigue, Happiness, Calm, Anger, Confusion].
        
        Text: "{text}"
        
        Return ONLY the category name.
        """
        response = await self.model.generate_content_async(prompt)
        return response.text.strip()
