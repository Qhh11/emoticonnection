"""
清空所有post历史记录

这个脚本会删除:
- 所有posts
- 所有post评论
- 所有post点赞

但保留:
- 用户数据
- 聊天记录
- 关注关系

运行方法:
cd /Users/lyr22ryl/emoticonnection/database
python3 clear_post_history.py

用途: 清空post feed，但保留用户和社交关系
"""

from config.mongodb_config import get_sync_database

db = get_sync_database()

print("\n" + "="*80)
print("清空Post历史记录")
print("="*80)

# 统计当前数据
post_count = db.posts.count_documents({})
comment_count = db.post_comments.count_documents({})
like_count = db.post_likes.count_documents({})

print(f"\n当前Post数据:")
print(f"  - Posts: {post_count}")
print(f"  - 评论: {comment_count}")
print(f"  - 点赞: {like_count}")

if post_count == 0 and comment_count == 0 and like_count == 0:
    print("\n✅ Post数据已经是空的了!")
    exit(0)

# 确认删除
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
