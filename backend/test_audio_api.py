
import requests
import os
import argparse
import json

def test_transcribe(base_url, file_path):
    print("\n--- Testing STT (Transcribe) ---")
    url = f"{base_url}/api/ai-chat/transcribe"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'audio/wav')}
        try:
            response = requests.post(url, files=files)
            if response.status_code == 200:
                print("✅ STT Success!")
                print("Transcribed Text:", response.json().get('text'))
            else:
                print(f"❌ STT Failed with status {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"❌ Error during request: {e}")

def test_full_chat(base_url, file_path, user_id="test_runner"):
    print("\n--- Testing Full AI Chat (Audio In -> Audio Out) ---")
    url = f"{base_url}/api/ai-chat/"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    with open(file_path, 'rb') as f:
        data = {
            'user_id': user_id,
            'voice_output': 'true',
            'message': 'This is a test message from automated script.'
        }
        files = {'file': (os.path.basename(file_path), f, 'audio/wav')}
        
        try:
            response = requests.post(url, data=data, files=files)
            if response.status_code == 200:
                res_data = response.json()
                print("✅ Chat Success!")
                print("User said:", res_data.get('transcribed_text'))
                print("AI Response:", res_data.get('response'))
                audio_url = res_data.get('audio_url')
                if audio_url:
                    print(f"🔊 Audio output generated: {audio_url}")
                else:
                    print("⚠️ No audio output URL returned.")
            else:
                print(f"❌ Chat Failed with status {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"❌ Error during request: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Backend Audio API")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--file", required=True, help="Path to a test audio file (.wav)")
    parser.add_argument("--user", default="test_user_api", help="User ID for testing")
    
    args = parser.parse_args()
    
    print(f"🚀 Starting Audio API Tests against {args.url}")
    
    # 1. Test Transcribe
    test_transcribe(args.url, args.file)
    
    # 2. Test Full Chat
    test_full_chat(args.url, args.file, args.user)
