from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from config.mongodb_config import get_sync_database

db = get_sync_database()
community_posts = db.community_posts
post_comments = db.post_comments
post_likes = db.post_likes


# ============================================================
# 🔵 Utility Functions
# ============================================================

def to_obj_id(value: str):
    """Convert string ID → ObjectId safely"""
    if value is None:
        return None
    return ObjectId(value) if ObjectId.is_valid(value) else value


# ============================================================
# 🟦 Community Posts CRUD
# ============================================================

def create_post(post_data: dict) -> str:
    """Create a new community post."""
    post_data["_id"] = ObjectId()
    post_data["created_at"] = datetime.utcnow()
    post_data["updated_at"] = None
    post_data["likes_count"] = 0
    post_data["comments_count"] = 0
    post_data["views_count"] = 0
    post_data["is_deleted"] = False

    community_posts.insert_one(post_data)
    return str(post_data["_id"])


def get_post_by_id(post_id: str) -> Optional[Dict]:
    """Retrieve one post."""
    oid = to_obj_id(post_id)
    doc = community_posts.find_one({"_id": oid, "is_deleted": False})
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    return doc


def get_posts(page: int = 1, page_size: int = 20,
              emotion: Optional[str] = None,
              sort_by: str = "created_at") -> Dict:
    """
    Paginated community posts.
    sort_by: created_at / likes_count / views_count
    """
    query = {"is_deleted": False}
    if emotion:
        query["emotion_category"] = emotion

    skip = (page - 1) * page_size

    cursor = community_posts.find(query).sort(sort_by, -1).skip(skip).limit(page_size)
    posts = list(cursor)
    
    total = community_posts.count_documents(query)
    for p in posts:
        p["id"] = str(p["_id"])

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "posts": posts,
        "has_more": skip + len(posts) < total
    }


def update_post(post_id: str, updates: dict) -> bool:
    """Update post fields."""
    oid = to_obj_id(post_id)
    updates["updated_at"] = datetime.utcnow()

    result = community_posts.update_one({"_id": oid}, {"$set": updates})
    return result.modified_count > 0


def soft_delete_post(post_id: str) -> bool:
    """Soft delete."""
    oid = to_obj_id(post_id)
    result = community_posts.update_one(
        {"_id": oid},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


def increase_view(post_id: str):
    """Increment view count."""
    oid = to_obj_id(post_id)
    community_posts.update_one({"_id": oid}, {"$inc": {"views_count": 1}})


def feature_post(post_id: str, featured: bool = True) -> bool:
    """Set post as featured."""
    return update_post(post_id, {"is_featured": featured})


def moderate_post(post_id: str, status: str) -> bool:
    """Moderation: pending / approved / rejected"""
    return update_post(post_id, {"moderation_status": status})


# ============================================================
# 🟩 Post Comment CRUD
# ============================================================

def create_comment(comment_data: dict) -> str:
    """Create a comment for a post."""
    comment_data["_id"] = ObjectId()
    comment_data["created_at"] = datetime.utcnow()
    comment_data["is_deleted"] = False

    # convert IDs
    comment_data["post_id"] = to_obj_id(comment_data["post_id"])
    comment_data["user_id"] = comment_data["user_id"]

    post_comments.insert_one(comment_data)

    # increase post's comment count
    community_posts.update_one(
        {"_id": comment_data["post_id"]},
        {"$inc": {"comments_count": 1}}
    )

    return str(comment_data["_id"])


def get_comments(post_id: str, page: int = 1, page_size: int = 20) -> Dict:
    """Get comments for a post."""
    oid = to_obj_id(post_id)
    query = {"post_id": oid, "is_deleted": False}

    skip = (page - 1) * page_size

    cursor = post_comments.find(query).sort("created_at", 1).skip(skip).limit(page_size)
    comments = list(cursor)

    total = post_comments.count_documents(query)
    for c in comments:
        c["id"] = str(c["_id"])

    return {
        "comments": comments,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": skip + len(comments) < total
    }


def delete_comment(comment_id: str) -> bool:
    """Soft delete a comment."""
    oid = to_obj_id(comment_id)

    comment = post_comments.find_one({"_id": oid})
    if not comment:
        return False

    # Soft delete
    result = post_comments.update_one(
        {"_id": oid},
        {"$set": {"is_deleted": True}}
    )

    if result.modified_count > 0:
        # reduce comment count in post
        community_posts.update_one(
            {"_id": comment["post_id"]},
            {"$inc": {"comments_count": -1}}
        )
        return True    

    return False


def like_comment(comment_id: str, user_id: str) -> bool:
    """Quick like for comments."""
    oid = to_obj_id(comment_id)

    # Avoid duplicate likes
    exists = post_likes.find_one({
        "comment_id": oid,
        "user_id": user_id
    })

    if exists:
        return False

    post_likes.insert_one({
        "_id": ObjectId(),
        "comment_id": oid,
        "user_id": user_id,
        "created_at": datetime.utcnow()
    })

    post_comments.update_one({"_id": oid}, {"$inc": {"likes_count": 1}})

    return True


# ============================================================
# 🟨 Post Like CRUD (Post level)
# ============================================================

def like_post(post_id: str, user_id: str) -> bool:
    oid = to_obj_id(post_id)

    exists = post_likes.find_one({
        "post_id": oid,
        "user_id": user_id
    })

    if exists:
        return False

    post_likes.insert_one({
        "_id": ObjectId(),
        "post_id": oid,
        "user_id": user_id,
        "created_at": datetime.utcnow()
    })

    community_posts.update_one({"_id": oid}, {"$inc": {"likes_count": 1}})
    return True


def unlike_post(post_id: str, user_id: str) -> bool:
    oid = to_obj_id(post_id)

    result = post_likes.delete_one({
        "post_id": oid,
        "user_id": user_id
    })

    if result.deleted_count == 0:
        return False

    community_posts.update_one({"_id": oid}, {"$inc": {"likes_count": -1}})
    return True


def count_post_likes(post_id: str) -> int:
    oid = to_obj_id(post_id)
    return post_likes.count_documents({"post_id": oid})
