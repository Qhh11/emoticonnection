import os
from dotenv import load_dotenv
from .gemini_config import get_emotion_model, GeminiClient

# 加载环境变量
load_dotenv()

class EmotionService:
    """
    情绪分析服务类
    """
    def __init__(self):
        # 使用统一的 Gemini 配置
        self.model_id = get_emotion_model()
        self.client = GeminiClient.get_client()
        
        if not self.client:
            print("⚠️  WARNING: GEMINI_API_KEY not found. Emotion分析功能将不可用.")

    async def analyze_emotion(self, text: str):
        """
        分析文本的情绪。
        """
        if not self.client:
            return "Emotion分析不可用"

        prompt = f"""
        Please analyze the emotion of the following text.
        Identify the top 2 emotions and their approximate percentages.
        
        Categories to choose from:
        [Anxiety, Sadness, Fatigue, Happiness, Calm, Anger, Confusion]
        
        Text: "{text}"
        
        Return the result in EXACTLY this format:
        "Emotion1: X%, Emotion2: Y%"
        
        Example:
        "Happiness: 80%, Calm: 20%"
        """
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt
        )
        return response.text.strip()
