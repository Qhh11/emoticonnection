import requests
import time
import random

BASE_URL = "http://localhost:8000/api/auth"

def test_auth():
    print("🔐 Testing Auth Integration...")
    
    # Random user to allow repeated runs
    rand_suffix = str(random.randint(1000, 9999))
    username = f"testuser_{rand_suffix}"
    password = "secretpassword"
    
    # 1. Register
    print(f"\n1. Registering user '{username}'...")
    payload = {
        "username": username,
        "password": password,
        "email": f"{username}@example.com",
        "nickname": f"Tester {rand_suffix}"
    }
    
    resp = requests.post(f"{BASE_URL}/register", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Registration Success! User ID: {data.get('user_id')}")
    else:
        print(f"❌ Registration Failed: {resp.status_code} {resp.text}")
        return

    # 2. Login
    print(f"\n2. Logging in as '{username}'...")
    login_payload = {
        "username": username,
        "password": password
    }
    
    resp = requests.post(f"{BASE_URL}/login", json=login_payload)
    if resp.status_code == 200:
        data = resp.json()
        print("✅ Login Success!")
        print(f"   Message: {data.get('message')}")
        print(f"   Nickname: {data.get('nickname')}")
        print(f"   User ID: {data.get('user_id')}")
    else:
        print(f"❌ Login Failed: {resp.status_code} {resp.text}")

    # 3. Login with wrong password
    print("\n3. Testing invalid login...")
    bad_payload = {"username": username, "password": "wrongpassword"}
    resp = requests.post(f"{BASE_URL}/login", json=bad_payload)
    if resp.status_code == 401:
        print("✅ Correctly rejected invalid credentials (401).")
    else:
        print(f"❌ Failed: Expected 401, got {resp.status_code}")

if __name__ == "__main__":
    test_auth()
