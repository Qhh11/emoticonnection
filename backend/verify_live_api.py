import os
import asyncio
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def verify_live_api():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found")
        return

    client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
    model = "gemini-2.5-flash-native-audio-preview-12-2025"
    
    config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {"prebuilt_voice_config": {"voice_name": "Kore"}}
        },
        "thinking_config": {
             "thinking_budget": 1024,
        }
    }

    print(f"Testing connection to {model}...")
    try:
        async with client.aio.live.connect(model=model, config=config) as session:
            print("✅ Successfully connected to Gemini Live session")
            
            # Send a simple text message
            print("Sending hello message...")
            await session.send_client_content(
                turns=[{"role": "user", "parts": [{"text": "Hello, can you hear me? Respond briefly."}]}],
                turn_complete=True
            )
            
            # Receive response
            print("Waiting for response...")
            async for response in session.receive():
                if response.server_content:
                    if response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.text:
                                print(f"🤖 AI Response (Text): {part.text}")
                            if part.inline_data:
                                print(f"🤖 AI Response (Audio): Received {len(part.inline_data.data)} bytes")
                    
                    if response.server_content.turn_complete:
                        print("✅ Turn complete")
                        break
                        
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_live_api())
