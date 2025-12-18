
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8000/api/ai-chat"
USER_ID = "diary_tester"

def test_diary_flow():
    print(f"📘 Testing Diary Feature for user: {USER_ID}")

    # 1. Create New Session
    print("\n1. Creating Session...")
    resp = requests.post(f"{BASE_URL}/sessions", json={"user_id": USER_ID, "message": "hi", "history": []})
    if resp.status_code != 200:
        print(f"❌ Failed to create session: {resp.text}")
        return
    session_id = resp.json()['id']
    print(f"✅ Created Session: {session_id}")

    # 2. Chat a bit
    print("\n2. Simulating Conversation...")
    messages = [
        "I'm feeling a bit anxious about my upcoming exam.",
        "Thanks, that helps. I'll try to study in small chunks."
    ]
    for msg in messages:
        print(f"  User: {msg}")
        resp = requests.post(f"{BASE_URL}/", json={
            "user_id": USER_ID,
            "session_id": session_id,
            "message": msg,
            "history": []
        })
        if resp.status_code == 200:
            print(f"  AI: {resp.json().get('response')[:50]}...")
        else:
            print(f"❌ Chat failed: {resp.text}")

    # 3. Generate Diary
    print("\n3. Generating Diary Summary...")
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/diaries/generate", json={
        "user_id": USER_ID,
        "session_id": session_id
    })
    
    if resp.status_code != 200:
        print(f"❌ Failed to generate diary: {resp.text}")
        return
    
    diary = resp.json()
    print(f"✅ Diary Generated in {time.time() - start_time:.2f}s!")
    print(f"   Title: {diary.get('title')}")
    print(f"   Mood: {diary.get('mood')}")
    print(f"   Content Preview: {diary.get('content')[:100]}...")

    # 4. List Diaries
    print("\n4. Listing User Diaries...")
    resp = requests.get(f"{BASE_URL}/diaries", params={"user_id": USER_ID})
    diaries = resp.json()
    print(f"✅ Found {len(diaries)} diaries for user.")
    
    # Check if our new diary is there
    found = any(d['id'] == diary['id'] for d in diaries)
    if found:
        print("✅ SUCCESS: New diary is listed.")
    else:
        print("❌ FAILURE: New diary NOT found in list.")

if __name__ == "__main__":
    test_diary_flow()
