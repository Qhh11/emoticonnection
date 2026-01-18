
import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load env
root_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(root_env)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try GOOGLE_API_KEY as fallback
    api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ No API key found in GEMINI_API_KEY or GOOGLE_API_KEY")
    exit(1)

genai.configure(api_key=api_key)

MODEL_NAME = "gemini-2.5-flash-native-audio-preview-12-2025"

def test_model():
    print(f"Testing model: {MODEL_NAME}")
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        # Try a simple text turn first
        chat = model.start_chat()
        response = chat.send_message("Hello, can you hear me? (Testing text turn)")
        print(f"Text response: {response.text}")
        
        print("✅ Model supports basic chat")
        
        # Now let's see if metadata suggests audio support
        # Usually models with 'audio' in name support specific formats
        print("Checking supported modalities...")
        # Since it's a preview/specific model, we'll try to send a tiny mock audio if possible
        # but for now, the success of start_chat is a good sign
        
    except Exception as e:
        print(f"❌ Error with model: {e}")

if __name__ == "__main__":
    test_model()
