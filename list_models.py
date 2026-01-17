
import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Try to find .env in root
root_env = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(root_env)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("No GEMINI_API_KEY found")
    exit(1)

client = genai.Client(api_key=api_key)
print("Listing models...")
try:
    for m in client.models.list():
        print(f"- {m.name}")
except Exception as e:
    print(f"Error: {e}")
