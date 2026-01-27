"""
Gemini Model Configuration
统一管理所有 Gemini 模型配置
"""
import os
from pathlib import Path
from google import genai
from dotenv import load_dotenv

# Load .env from project root: emoticonnection/.env
# This file: emoticonnection/backend/app/modules/ai/core/gemini_config.py
root_env = Path(__file__).resolve().parents[5] / ".env"
load_dotenv(root_env)

# Gemini 模型名称配置
class GeminiModels:
    """Gemini 模型名称常量"""
    # 主要模型 - 用于 AI 对话、情绪分析、日记生成
    CHAT = "gemini-2.5-flash-lite-preview-09-2025"
    
    # 音频转文字模型 - 用于语音识别
    AUDIO_STT = "gemini-2.5-flash-native-audio-preview-12-2025"
    
    # Live API 模型
    NATIVE_AUDIO = "gemini-2.5-flash-native-audio-preview-12-2025"


    
    # 情绪分析模型
    EMOTION = "gemini-2.5-flash-lite"
    
    # 日记生成模型
    DIARY = "gemini-2.5-flash-lite"
    
    # 数据分析模型
    ANALYTICS = "gemini-2.5-flash-lite"
    
    # 助手功能模型 (Rewrite, Reply, Topic)
    HELPER = "gemini-2.5-flash-lite"


class GeminiClient:
    """统一的 Gemini 客户端管理器"""
    
    _client = None
    
    @classmethod
    def get_client(cls):
        """获取或创建 google.genai.Client 实例"""
        if cls._client:
            return cls._client
            
        # Try finding the API key from multiple environment variable names
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
        
        if not api_key:
            print("⚠️  WARNING: GEMINI_API_KEY or VITE_GEMINI_API_KEY not found.")
            return None
            
        # Initialize the new SDK client
        cls._client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        return cls._client

    @classmethod
    def is_available(cls) -> bool:
        """检查 Gemini API 是否可用"""
        return (os.getenv("GEMINI_API_KEY") is not None or 
                os.getenv("VITE_GEMINI_API_KEY") is not None)


# 便捷函数 - 返回模型 ID
def get_chat_model(system_instruction: str = None):
    return GeminiModels.CHAT

def get_audio_model():
    return GeminiModels.AUDIO_STT

def get_emotion_model():
    return GeminiModels.EMOTION

def get_diary_model(system_instruction: str = None):
    return GeminiModels.DIARY

def get_analytics_model():
    return GeminiModels.ANALYTICS

def get_helper_model(system_instruction: str = None):
    return GeminiModels.HELPER
