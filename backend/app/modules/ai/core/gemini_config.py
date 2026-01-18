"""
Gemini Model Configuration
统一管理所有 Gemini 模型配置
"""
import os
from pathlib import Path
import google.generativeai as genai
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
    AUDIO_STT = "gemini-2.5-flash-preview-tts"
    
    # 情绪分析模型
    EMOTION = "gemini-2.5-flash-lite"
    
    # 日记生成模型
    DIARY = "gemini-2.5-flash-lite"
    
    # 数据分析模型
    ANALYTICS = "gemini-2.5-flash-lite"
    
    # 原生语音对话模型 (Sustainable Voice)
    NATIVE_AUDIO = "gemini-2.5-flash-native-audio-preview-12-2025"
    
    # 助手功能模型 (Rewrite, Reply, Topic)
    HELPER = "gemini-3-flash-preview"


class GeminiClient:
    """统一的 Gemini 客户端管理器"""
    
    _instance = None
    _api_key = None
    _configured = False
    
    @classmethod
    def configure(cls):
        """配置 Gemini API"""
        if cls._configured:
            return True  # Already configured - return success
            
        cls._api_key = os.getenv("GEMINI_API_KEY")
        if not cls._api_key:
            print("⚠️  WARNING: GEMINI_API_KEY not found.")
            return False
            
        genai.configure(api_key=cls._api_key)
        cls._configured = True
        return True
    
    @classmethod
    def get_model(cls, model_name: str = None, system_instruction: str = None):
        """
        获取 Gemini 模型实例
        
        Args:
            model_name: 模型名称，如果为 None 则使用默认的 CHAT 模型
            system_instruction: 系统指令（可选）
            
        Returns:
            GenerativeModel 实例或 None
        """
        if not cls.configure():
            return None
            
        if model_name is None:
            model_name = GeminiModels.CHAT
            
        if system_instruction:
            return genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
        else:
            return genai.GenerativeModel(model_name=model_name)
    
    @classmethod
    def is_available(cls) -> bool:
        """检查 Gemini API 是否可用"""
        return cls._api_key is not None or os.getenv("GEMINI_API_KEY") is not None


# 便捷函数
def get_chat_model(system_instruction: str = None):
    """获取对话模型"""
    return GeminiClient.get_model(GeminiModels.CHAT, system_instruction)

def get_audio_model():
    """获取音频转文字模型"""
    return GeminiClient.get_model(GeminiModels.AUDIO_STT)

def get_emotion_model():
    """获取情绪分析模型"""
    return GeminiClient.get_model(GeminiModels.EMOTION)

def get_diary_model():
    """获取日记生成模型"""
    return GeminiClient.get_model(GeminiModels.DIARY)

def get_analytics_model():
    """获取数据分析模型"""
    return GeminiClient.get_model(GeminiModels.ANALYTICS)

def get_helper_model(system_instruction: str = None):
    """获取助手功能模型"""
    return GeminiClient.get_model(GeminiModels.HELPER, system_instruction)
