"""
MongoDB 数据库初始化脚本
创建索引和集合，设置验证规则
"""
from pymongo import ASCENDING, DESCENDING, TEXT
from config.mongodb_config import get_sync_database


def create_indexes():
    """创建所有必要的索引"""
    db = get_sync_database()
    
    print("📝 Creating indexes...")
    
    # ========== Users Collection ==========
    db.users.create_index([("username", ASCENDING)], unique=True)
    db.users.create_index([("email", ASCENDING)], unique=True, partialFilterExpression={"email": {"$type": "string"}})
    db.users.create_index([("created_at", DESCENDING)])
    print("✅ Users indexes created")
    
    # ========== Diary Entries Collection ==========
    db.diary_entries.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.diary_entries.create_index([("emotion_tags.primary_emotion", ASCENDING)])
    db.diary_entries.create_index([("created_at", DESCENDING)])
    db.diary_entries.create_index([("content", TEXT)])  # 全文搜索
    print("✅ Diary entries indexes created")
    
    # ========== Chat Sessions Collection ==========
    db.chat_sessions.create_index([("user_id", ASCENDING), ("started_at", DESCENDING)])
    db.chat_sessions.create_index([("peer_user_id", ASCENDING), ("started_at", DESCENDING)])
    db.chat_sessions.create_index([("session_type", ASCENDING), ("status", ASCENDING)])
    print("✅ Chat sessions indexes created")
    
    # ========== Chat Messages Collection ==========
    db.chat_messages.create_index([("session_id", ASCENDING), ("created_at", ASCENDING)])
    db.chat_messages.create_index([("sender_id", ASCENDING)])
    print("✅ Chat messages indexes created")
    
    # ========== Community Posts Collection ==========
    db.community_posts.create_index([("created_at", DESCENDING)])
    db.community_posts.create_index([("emotion_category", ASCENDING)])
    db.community_posts.create_index([("user_id", ASCENDING)])
    db.community_posts.create_index([("is_featured", ASCENDING), ("created_at", DESCENDING)])
    db.community_posts.create_index([("is_need_response", ASCENDING), ("created_at", DESCENDING)])
    db.community_posts.create_index([("content", TEXT)])  # 全文搜索
    print("✅ Community posts indexes created")
    
    # ========== Post Comments Collection ==========
    db.post_comments.create_index([("post_id", ASCENDING), ("created_at", DESCENDING)])
    db.post_comments.create_index([("user_id", ASCENDING)])
    print("✅ Post comments indexes created")
    
    # ========== Post Likes Collection ==========
    db.post_likes.create_index([("post_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    db.post_likes.create_index([("comment_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    print("✅ Post likes indexes created")
    
    # ========== Emotion Logs Collection ==========
    db.emotion_logs.create_index([("user_id", ASCENDING), ("recorded_at", DESCENDING)])
    db.emotion_logs.create_index([("primary_emotion", ASCENDING)])
    print("✅ Emotion logs indexes created")
    
    # ========== Emotion Analytics Collection ==========
    db.emotion_analytics.create_index([("user_id", ASCENDING), ("period_type", ASCENDING), ("start_date", DESCENDING)])
    print("✅ Emotion analytics indexes created")


def create_collections():
    """创建集合并设置验证规则（可选）"""
    db = get_sync_database()
    
    collections = [
        "users",
        "diary_entries",
        "chat_sessions",
        "chat_messages",
        "community_posts",
        "post_comments",
        "post_likes",
        "emotion_logs",
        "emotion_analytics"
    ]
    
    print("📦 Creating collections...")
    for collection_name in collections:
        if collection_name not in db.list_collection_names():
            db.create_collection(collection_name)
            print(f"✅ Collection '{collection_name}' created")
        else:
            print(f"ℹ️  Collection '{collection_name}' already exists")


def initialize_database():
    """初始化数据库"""
    print("🚀 Starting database initialization...")
    create_collections()
    create_indexes()
    print("✨ Database initialization completed!")


if __name__ == "__main__":
    initialize_database()
