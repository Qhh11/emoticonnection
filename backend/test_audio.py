import asyncio
import os
import sys
from pathlib import Path

# Add app to path
sys.path.append(os.getcwd())

from app.modules.ai.core.audio import AudioService

async def main():
    print("🎤 Testing AudioService...")
    try:
        service = AudioService()
        print("✅ Service initialized")
        
        print("🔊 Testing TTS (gTTS Fallback)...")
        # Ensure upload dir exists
        service.upload_dir.mkdir(parents=True, exist_ok=True)
        
        path = await service.generate_speech("Hello, this is a test of the voice chat system.")
        print(f"✅ TTS Generated: {path}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
