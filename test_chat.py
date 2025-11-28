import requests
import json

def test_chat():
    """
    测试 AI 聊天 API 的脚本
    """
    # API 地址
    url = "http://127.0.0.1:8000/api/ai-chat"
    headers = {"Content-Type": "application/json"}
    
    # 测试用例 1: 初始问候
    payload = {
        "message": "Hello, I'm feeling a bit down today.",
        "history": []
    }
    
    print(f"发送请求: {payload['message']}")
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        print("响应:", response.json())
        
        # 测试用例 2: 后续对话 (这里为了简化，手动模拟了历史记录)
        # 在实际应用中，客户端会维护历史记录，或者后端会持久化存储。
        # 这里我们主要测试 API 是否能正确处理历史记录参数。
        history = [
            {"role": "user", "parts": ["Hello, I'm feeling a bit down today."]},
            {"role": "model", "parts": [response.json()['response']]}
        ]
        
        payload2 = {
            "message": "I had a fight with my friend.",
            "history": history
        }
        print(f"\n发送后续请求: {payload2['message']}")
        response2 = requests.post(url, headers=headers, data=json.dumps(payload2))
        response2.raise_for_status()
        print("响应:", response2.json())
        
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务器。请检查服务器是否已启动。")
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    test_chat()
