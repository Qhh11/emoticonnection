#!/usr/bin/env python3
"""
测试所有 AI 服务是否正常工作
"""
import sys
import os
from pathlib import Path
import asyncio

# Add backend to path
backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))

print("=" * 60)
print("🧪 Testing All AI Services")
print("=" * 60)

# Test 1: Gemini Config
print("\n[1/5] Testing Gemini Config...")
try:
    from app.modules.ai.core.gemini_config import (
        GeminiModels, GeminiClient,
        get_chat_model, get_audio_model, get_emotion_model, 
        get_diary_model
    )
    
    print(f"  ✅ GeminiModels.CHAT: {GeminiModels.CHAT}")
    print(f"  ✅ GeminiModels.AUDIO_STT: {GeminiModels.AUDIO_STT}")
    print(f"  ✅ GeminiModels.EMOTION: {GeminiModels.EMOTION}")
    print(f"  ✅ GeminiModels.DIARY: {GeminiModels.DIARY}")
    
    # Test client availability
    is_available = GeminiClient.is_available()
    print(f"  ✅ Gemini API Available: {is_available}")
    
    if is_available:
        chat_model = get_chat_model("You are a test assistant")
        print(f"  ✅ Chat Model: {chat_model.model_name if chat_model else 'None'}")
        
        audio_model = get_audio_model()
        print(f"  ✅ Audio Model: {audio_model.model_name if audio_model else 'None'}")
    
    print("  ✅ Gemini Config: PASS")
except Exception as e:
    print(f"  ❌ Gemini Config: FAIL - {e}")
    import traceback
    traceback.print_exc()

# Test 2: AI Chat Service
print("\n[2/5] Testing AI Chat Service...")
try:
    from app.modules.ai.core.ai_chat import AIChatService
    
    service = AIChatService(save_to_weaviate=False)
    if service.model:
        print(f"  ✅ Model initialized: {service.model.model_name}")
        print("  ✅ AI Chat Service: PASS")
    else:
        print("  ⚠️  Model not initialized (check GEMINI_API_KEY)")
except Exception as e:
    print(f"  ❌ AI Chat Service: FAIL - {e}")
    import traceback
    traceback.print_exc()

# Test 3: Emotion Service
print("\n[3/5] Testing Emotion Service...")
try:
    from app.modules.ai.core.emotion import EmotionService
    
    service = EmotionService()
    if service.model:
        print(f"  ✅ Model initialized: {service.model.model_name}")
        print("  ✅ Emotion Service: PASS")
    else:
        print("  ⚠️  Model not initialized (check GEMINI_API_KEY)")
except Exception as e:
    print(f"  ❌ Emotion Service: FAIL - {e}")
    import traceback
    traceback.print_exc()

# Test 4: Diary Service
print("\n[4/5] Testing Diary Service...")
try:
    from app.modules.ai.core.diary import DiaryService
    
    service = DiaryService()
    if service.model:
        print(f"  ✅ Model initialized: {service.model.model_name}")
        print("  ✅ Diary Service: PASS")
    else:
        print("  ⚠️  Model not initialized (check GEMINI_API_KEY)")
except Exception as e:
    print(f"  ❌ Diary Service: FAIL - {e}")
    import traceback
    traceback.print_exc()

# Test 5: Audio Service
print("\n[5/5] Testing Audio Service...")
try:
    from app.modules.ai.core.audio import AudioService
    
    service = AudioService()
    
    has_openai = service.client is not None
    has_gemini = service.gemini_model is not None
    
    print(f"  {'✅' if has_openai else '⚠️ '} OpenAI Client: {'Available' if has_openai else 'Not configured'}")
    print(f"  {'✅' if has_gemini else '⚠️ '} Gemini Model: {'Available' if has_gemini else 'Not configured'}")
    
    if has_gemini:
        print(f"  ✅ Gemini Model Name: {service.gemini_model.model_name}")
    
    if has_openai or has_gemini:
        print("  ✅ Audio Service: PASS")
    else:
        print("  ⚠️  Audio Service: No STT provider available")
        
except Exception as e:
    print(f"  ❌ Audio Service: FAIL - {e}")
    import traceback
    traceback.print_exc()

# Test 6: Quick functional test
print("\n[6/6] Running Quick Functional Test...")
try:
    from app.modules.ai.core.ai_chat import AIChatService
    
    async def test_chat():
        service = AIChatService(save_to_weaviate=False)
        if service.model:
            # Simple test
            response = await service.chat_with_ai(
                message="Say 'test successful' and nothing else",
                history=[],
                user_id=None
            )
            print(f"  ✅ AI Response: {response[:50]}...")
            return True
        else:
            print("  ⚠️  Skipping functional test (no API key)")
            return False
    
    # Run async test
    result = asyncio.run(test_chat())
    if result:
        print("  ✅ Functional Test: PASS")
        
except Exception as e:
    print(f"  ❌ Functional Test: FAIL - {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("✅ Testing Complete!")
print("=" * 60)
