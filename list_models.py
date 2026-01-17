
import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Try to find .env in root
root_env = Path(__file__).resolve().parent / ".env"
load_dotenv(root_env)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("No GEMINI_API_KEY found")
    exit(1)

genai.configure(api_key=api_key)
print("Listing available Gemini models...\n")
try:
    for m in genai.list_models():
        # Show models that support generateContent (for text/audio)
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ {m.name}")
            print(f"   Methods: {', '.join(m.supported_generation_methods)}")
            print()
except Exception as e:
    print(f"Error: {e}")
