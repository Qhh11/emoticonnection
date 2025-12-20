"""
数据库重置脚本

这个脚本提供两个选项:
1. 完全重置 - 删除所有数据（用户、聊天、关注、posts）
2. 只清空posts - 删除posts但保留用户和聊天数据

运行方法:
cd /Users/lyr22ryl/emoticonnection/database
python3 reset_all_data.py

注意: 这是不可逆的操作！
"""

from config.mongodb_config import get_sync_database

db = get_sync_database()

print("\n" + "="*80)
print("数据库重置工具")
print("="*80)

# 统计当前数据
user_count = db.users.count_documents({})
session_count = db.chat_sessions.count_documents({})
message_count = db.chat_messages.count_documents({})
following_count = db.following.count_documents({})
post_count = db.posts.count_documents({})
comment_count = db.post_comments.count_documents({})
like_count = db.post_likes.count_documents({})

print(f"\n当前数据:")
print(f"  - 用户: {user_count}")
print(f"  - Chat Sessions: {session_count}")
print(f"  - Chat Messages: {message_count}")
print(f"  - 关注关系: {following_count}")
print(f"  - Posts: {post_count}")
print(f"  - Post评论: {comment_count}")
print(f"  - Post点赞: {like_count}")

# 显示选项菜单
print("\n" + "="*80)
print("请选择操作:")
print("="*80)
print("1. 完全重置 - 删除所有数据（用户、聊天、关注、posts）")
print("2. 只清空posts - 删除posts但保留用户和聊天数据")
print("0. 取消退出")
print("="*80)

choice = input("\n请输入选项 (0/1/2): ").strip()

if choice == "0":
    print("\n❌ 已取消")
    exit(0)
elif choice == "1":
    # 完全重置
    if (user_count == 0 and session_count == 0 and message_count == 0 and
        following_count == 0 and post_count == 0 and comment_count == 0 and like_count == 0):
        print("\n✅ 数据库已经是空的了!")
        exit(0)

    print("\n⚠️  警告: 这将删除所有数据,包括用户、聊天记录、关注关系和posts!")
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

    print("\n5. 删除所有posts...")
    result_posts = db.posts.delete_many({})
    print(f"   ✅ 删除了 {result_posts.deleted_count} 个posts")

    print("\n6. 删除所有post评论...")
    result_comments = db.post_comments.delete_many({})
    print(f"   ✅ 删除了 {result_comments.deleted_count} 条评论")

    print("\n7. 删除所有post点赞...")
    result_likes = db.post_likes.delete_many({})
    print(f"   ✅ 删除了 {result_likes.deleted_count} 条点赞")

    print("\n" + "="*80)
    print("所有数据已清空!")
    print("="*80)

    print("\n数据库现在是完全空的:")
    print(f"  - 用户: {db.users.count_documents({})}")
    print(f"  - Chat Sessions: {db.chat_sessions.count_documents({})}")
    print(f"  - Chat Messages: {db.chat_messages.count_documents({})}")
    print(f"  - 关注关系: {db.following.count_documents({})}")
    print(f"  - Posts: {db.posts.count_documents({})}")
    print(f"  - Post评论: {db.post_comments.count_documents({})}")
    print(f"  - Post点赞: {db.post_likes.count_documents({})}")

    print("\n下一步:")
    print("  1. 运行 create_test_users.py 创建测试用户:")
    print("     cd /Users/lyr22ryl/emoticonnection/database")
    print("     python3 create_test_users.py")
    print("\n  2. 打开浏览器访问 http://localhost:8000/static/login.html")
    print("  3. 使用 alice/bob/charlie/david 登录 (密码: password123)")
    print("\n现在可以从头开始测试完整流程了!")

elif choice == "2":
    # 只清空posts
    if post_count == 0 and comment_count == 0 and like_count == 0:
        print("\n✅ Post数据已经是空的了!")
        exit(0)

    print("\n⚠️  警告: 这将删除所有posts、评论和点赞!")
    print("✅  但会保留: 用户、聊天记录、关注关系")
    confirm = input("\n确认删除? (输入 'yes' 继续): ")

    if confirm.lower() != "yes":
        print("\n❌ 已取消")
        exit(0)

    print("\n开始删除...")

    # 删除post相关数据
    print("\n1. 删除所有posts...")
    result_posts = db.posts.delete_many({})
    print(f"   ✅ 删除了 {result_posts.deleted_count} 个posts")

    print("\n2. 删除所有post评论...")
    result_comments = db.post_comments.delete_many({})
    print(f"   ✅ 删除了 {result_comments.deleted_count} 条评论")

    print("\n3. 删除所有post点赞...")
    result_likes = db.post_likes.delete_many({})
    print(f"   ✅ 删除了 {result_likes.deleted_count} 条点赞")

    print("\n" + "="*80)
    print("Post历史已清空!")
    print("="*80)

    print("\n当前Post数据:")
    print(f"  - Posts: {db.posts.count_documents({})}")
    print(f"  - 评论: {db.post_comments.count_documents({})}")
    print(f"  - 点赞: {db.post_likes.count_documents({})}")

    print("\n保留的数据:")
    print(f"  - 用户: {db.users.count_documents({})}")
    print(f"  - Chat Sessions: {db.chat_sessions.count_documents({})}")
    print(f"  - Chat Messages: {db.chat_messages.count_documents({})}")
    print(f"  - 关注关系: {db.following.count_documents({})}")

    print("\n下一步:")
    print("  1. 打开 http://localhost:8000/static/post_feed.html")
    print("  2. 登录并开始发布新的posts")
    print("\n现在可以重新开始测试post功能了!")

else:
    print("\n❌ 无效的选项!")
    exit(1)
