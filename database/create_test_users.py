"""
通过API创建测试用户

运行方法:
1. 确保后端服务器正在运行 (http://localhost:8000)
2. python3 create_test_users.py

这个脚本会通过后端的注册API创建4个测试用户
"""

import requests
import json

API_BASE = "http://localhost:8000/api/auth"

print("\n" + "="*80)
print("通过API创建测试用户")
print("="*80)

# 定义4个测试用户
test_users = [
    {"username": "alice", "password": "password123", "nickname": "Alice", "email": "alice@test.com"},
    {"username": "bob", "password": "password123", "nickname": "Bob", "email": "bob@test.com"},
    {"username": "charlie", "password": "password123", "nickname": "Charlie", "email": "charlie@test.com"},
    {"username": "david", "password": "password123", "nickname": "David", "email": "david@test.com"}
]

print("\n创建用户:")
created_users = []

for user_data in test_users:
    try:
        # 尝试注册用户
        response = requests.post(
            f"{API_BASE}/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ {user_data['nickname']} ({user_data['username']}) - 创建成功")
            print(f"     User ID: {result.get('user_id')}")
            created_users.append({
                "username": user_data['username'],
                "nickname": user_data['nickname'],
                "user_id": result.get('user_id')
            })
        elif response.status_code == 400:
            # 用户已存在
            print(f"  ℹ️  {user_data['nickname']} ({user_data['username']}) - 已存在")
        else:
            print(f"  ❌ {user_data['nickname']} ({user_data['username']}) - 失败: {response.text}")

    except requests.exceptions.ConnectionError:
        print(f"\n❌ 错误: 无法连接到后端服务器!")
        print(f"   请确保后端服务器正在运行:")
        print(f"   cd backend && ./start.sh")
        exit(1)
    except Exception as e:
        print(f"  ❌ {user_data['nickname']} - 错误: {e}")

print("\n" + "="*80)
print("测试用户创建完成!")
print("="*80)

if created_users:
    print("\n新创建的用户:")
    for user in created_users:
        print(f"  - {user['nickname']} ({user['username']})")

print("\n登录信息 (所有密码都是: password123):")
for user_data in test_users:
    print(f"  用户名: {user_data['username']}")

print("\n下一步:")
print("  1. 打开 http://localhost:8000/static/login.html")
print("  2. 使用上述任一用户名和密码 'password123' 登录")
print("  3. 登录后会跳转到 Dashboard")
print("  4. 点击 'Peer Chat' 进入真人聊天")
print("  5. 在联系人列表中可以看到其他3个用户")
print("  6. 点击任意用户即可开始聊天")
print("\n提示: 可以在多个浏览器标签页中用不同用户登录测试实时聊天!")
