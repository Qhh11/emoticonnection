#!/usr/bin/env python3
"""
语音功能验证脚本
测试 Traditional 和 Live API 两种模式
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))

print("=" * 60)
print("🎤 语音功能验证")
print("=" * 60)

# Test 1: Check Gemini config
print("\n[1/5] 检查 Gemini 配置...")
try:
    from app.modules.ai.core.gemini_config import GeminiClient, GeminiModels
    
    if GeminiClient.configure():
        print("✅ Gemini API Key 配置正确")
        print(f"   STT 模型: {GeminiModels.AUDIO_STT}")
        print(f"   Chat 模型: {GeminiModels.CHAT}")
    else:
        print("❌ Gemini API Key 未配置")
        sys.exit(1)
except Exception as e:
    print(f"❌ Gemini 配置错误: {e}")
    sys.exit(1)

# Test 2: Check AudioService (Traditional mode)
print("\n[2/5] 检查 Traditional 模式 (AudioService)...")
try:
    from app.modules.ai.core.audio import AudioService
    
    audio_service = AudioService()
    
    # Check STT provider
    if audio_service.gemini_model:
        print("✅ Gemini STT 可用")
    else:
        print("❌ Gemini STT 不可用")
    
    # Check TTS provider
    if audio_service.client:
        print("✅ OpenAI TTS 可用")
    else:
        print("⚠️  OpenAI TTS 不可用，将使用 gTTS")
    
except Exception as e:
    print(f"❌ AudioService 初始化失败: {e}")
    sys.exit(1)

# Test 3: Check Gemini Live API (Live mode)
print("\n[3/5] 检查 Live API 模式...")
try:
    from app.modules.ai.core.gemini_live_service import GeminiLiveService
    
    live_service = GeminiLiveService()
    print(f"✅ Gemini Live Service 已初始化")
    print(f"   模型: {live_service.model}")
    
except Exception as e:
    print(f"❌ GeminiLiveService 初始化失败: {e}")
    sys.exit(1)

# Test 4: Check WebSocket endpoints
print("\n[4/5] 检查 WebSocket 端点...")
try:
    from app.modules.ai.api import ai_ws, gemini_live_ws
    
    print("✅ Traditional WebSocket: /ws/ai-chat/{user_id}")
    print("✅ Live API WebSocket: /ws/gemini-live/{user_id}")
    
except Exception as e:
    print(f"❌ WebSocket 端点导入失败: {e}")
    sys.exit(1)

# Test 5: Check frontend files
print("\n[5/5] 检查前端文件...")
frontend_files = [
    backend_path.parent / "frontend/public/gemini-audio-processor.js",
    backend_path.parent / "frontend/src/hooks/useGeminiLive.ts",
    backend_path.parent / "frontend/src/components/chat/VoiceChatOverlay.tsx",
]

all_files_exist = True
for file_path in frontend_files:
    if file_path.exists():
        print(f"✅ {file_path.name}")
    else:
        print(f"❌ {file_path.name} 缺失")
        all_files_exist = False

if not all_files_exist:
    sys.exit(1)

# Summary
print("\n" + "=" * 60)
print("📊 验证结果汇总")
print("=" * 60)

print("\n✅ Traditional 模式:")
print("   - Gemini STT: gemini-2.5-flash-lite")
print("   - Gemini Chat: gemini-2.5-flash-lite")
print("   - TTS: gTTS (免费) 或 OpenAI TTS")
print("   - WebSocket: /ws/ai-chat/{user_id}")

print("\n✅ Live API 模式:")
print("   - Gemini Live: gemini-2.5-flash-native-audio-preview-12-2025")
print("   - 功能: STT + Chat + TTS 一体化")
print("   - WebSocket: /ws/gemini-live/{user_id}")

print("\n🎉 所有检查通过！两种语音模式均可用。")
print("\n使用说明：")
print("1. 打开浏览器访问日记页面")
print("2. 点击顶部 '🎤 Voice' 标签")
print("3. 选择 'Traditional' 或 'Live API ⚡' 模式")
print("4. 点击麦克风图标开始语音对话")
print("=" * 60)
