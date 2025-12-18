
import os
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

# Force load from .env in current directory
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key present: {bool(api_key)}")
if api_key:
    # Print first few chars to verify (safe to show)
    print(f"API Key prefix: {api_key[:4]}...")

async def test_chat():
    try:
        if not api_key:
            print("❌ No API Key found")
            return

        genai.configure(api_key=api_key)
        
        model_name = "gemini-flash-latest"
        print(f"Creating model: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        print("Starting chat...")
        chat = model.start_chat(history=[])
        
        print("Sending message...")
        response = await chat.send_message_async("Hello, can you hear me?")
        print(f"✅ Response received: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
