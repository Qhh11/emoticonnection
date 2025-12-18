"""
完全重置所有数据

这个脚本会删除:
- 所有用户
- 所有聊天sessions
- 所有聊天messages
- 所有关注关系

运行方法:
cd /Users/lyr22ryl/emoticonnection/database
python3 reset_all_data.py

注意: 这是不可逆的操作！所有数据都会被删除！
"""

from config.mongodb_config import get_sync_database

db = get_sync_database()

print("\n" + "="*80)
print("完全重置数据库")
print("="*80)

# 统计当前数据
user_count = db.users.count_documents({})
session_count = db.chat_sessions.count_documents({})
message_count = db.chat_messages.count_documents({})
following_count = db.following.count_documents({})

print(f"\n当前数据:")
print(f"  - 用户: {user_count}")
print(f"  - Sessions: {session_count}")
print(f"  - Messages: {message_count}")
print(f"  - 关注关系: {following_count}")

if user_count == 0 and session_count == 0 and message_count == 0 and following_count == 0:
    print("\n✅ 数据库已经是空的了!")
    exit(0)

# 确认删除
print("\n⚠️  警告: 这将删除所有数据,包括用户、聊天记录和关注关系!")
print("⚠️  这是不可逆的操作!")
confirm = input("\n确认删除所有数据? (输入 'DELETE ALL' 继续): ")

if confirm != "DELETE ALL":
    print("\n❌ 已取消")
    exit(0)

print("\n开始删除...")

# 删除所有数据
print("\n1. 删除所有用户...")
result_users = db.users.delete_many({})
print(f"   ✅ 删除了 {result_users.deleted_count} 个用户")

print("\n2. 删除所有sessions...")
result_sessions = db.chat_sessions.delete_many({})
print(f"   ✅ 删除了 {result_sessions.deleted_count} 个sessions")

print("\n3. 删除所有messages...")
result_messages = db.chat_messages.delete_many({})
print(f"   ✅ 删除了 {result_messages.deleted_count} 条messages")

print("\n4. 删除所有关注关系...")
result_following = db.following.delete_many({})
print(f"   ✅ 删除了 {result_following.deleted_count} 条关注关系")

print("\n" + "="*80)
print("所有数据已清空!")
print("="*80)

print("\n数据库现在是完全空的:")
print(f"  - 用户: {db.users.count_documents({})}")
print(f"  - Sessions: {db.chat_sessions.count_documents({})}")
print(f"  - Messages: {db.chat_messages.count_documents({})}")
print(f"  - 关注关系: {db.following.count_documents({})}")

print("\n下一步:")
print("  1. 运行 create_test_users.py 创建测试用户:")
print("     cd /Users/lyr22ryl/emoticonnection/database")
print("     python3 create_test_users.py")
print("\n  2. 打开浏览器访问 http://localhost:8000/static/login.html")
print("  3. 使用 alice/bob/charlie/david 登录 (密码: password123)")
print("\n现在可以从头开始测试完整流程了!")
