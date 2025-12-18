import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/ai-chat"
USER_ID = "sidebar_test_user"

def test_sidebar_flow():
    print(f"Testing Sidebar Flow for user: {USER_ID}")

    # 1. List Sessions (Expect empty or existing)
    print("\n1. Listing Sessions...")
    resp = requests.get(f"{BASE_URL}/sessions", params={"user_id": USER_ID})
    if resp.status_code != 200:
        print(f"FAILED to list sessions: {resp.text}")
        sys.exit(1)
    sessions = resp.json()
    print(f"Found {len(sessions)} sessions.")

    # 2. Create New Session
    print("\n2. Creating New Session...")
    payload = {"user_id": USER_ID, "message": "start", "history": []}
    resp = requests.post(f"{BASE_URL}/sessions", json=payload)
    if resp.status_code != 200:
        print(f"FAILED to create session: {resp.text}")
        sys.exit(1)
    new_session = resp.json()
    session_id = new_session['id']
    print(f"Created Session ID: {session_id}")

    # 3. Send Message in Session
    print(f"\n3. Sending Message to Session {session_id}...")
    chat_payload = {
        "user_id": USER_ID,
        "session_id": session_id,
        "message": "Hello sidebar!",
        "history": []
    }
    resp = requests.post(f"{BASE_URL}/", json=chat_payload)
    if resp.status_code != 200:
        print(f"FAILED to send message: {resp.text}")
        sys.exit(1)
    print("Message sent successfully and received response.")

    # 4. List Sessions Again (Should see new one)
    print("\n4. Verifying Session List Update...")
    resp = requests.get(f"{BASE_URL}/sessions", params={"user_id": USER_ID})
    sessions_after = resp.json()
    print(f"Found {len(sessions_after)} sessions.")
    
    # Check if our new session is there
    found = any(s['id'] == session_id for s in sessions_after)
    if found:
        print("✅ SUCCESS: New session found in list.")
    else:
        print("❌ FAILURE: New session NOT found in list.")
        sys.exit(1)

if __name__ == "__main__":
    test_sidebar_flow()
