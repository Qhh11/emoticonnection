import requests
import json

url = "http://localhost:8000/api/ai-chat/"
headers = {"Content-Type": "application/json"}
data = {
    "user_id": "manual_test_user",
    "message": "你好",
    "history": []
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
