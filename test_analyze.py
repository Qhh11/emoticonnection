import requests
import json

def test_analyze_emotion():
    """
    测试情绪分析 API
    """
    url = "http://127.0.0.1:8000/api/emotion/analyze"
    headers = {"Content-Type": "application/json"}
    
    test_cases = [
        "I am so worried about my exam tomorrow.",
        "My dog died yesterday, I feel terrible.",
        "I just got a promotion! I'm so happy!",
        "I've been working for 12 hours straight, I need sleep.",
        "I'm just sitting here reading a book."
    ]
    
    for text in test_cases:
        payload = {"text": text}
        print(f"Analyzing: '{text}'")
        try:
            response = requests.post(url, headers=headers, data=json.dumps(payload))
            response.raise_for_status()
            print(f"Result: {response.json()['emotion']}\n")
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    test_analyze_emotion()
