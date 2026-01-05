"""
Following CRUD operations
Handles user following relationships
"""
from typing import List, Optional, Dict
from bson import ObjectId
from datetime import datetime

try:
    from database.config.mongodb_config import get_sync_database
    from database.models.following import Following
except ImportError:
    from config.mongodb_config import get_sync_database
    from models.following import Following


db = get_sync_database()
followings = db.followings


def follow_user(follower_id: str, following_id: str, source: str = "profile") -> Optional[str]:
    """
    Create a following relationship

    Args:
        follower_id: User who is following
        following_id: User being followed
        source: Where the follow came from (profile/search/recommendation/match)

    Returns:
        Following relationship ID or None if already exists
    """
    # Check if already following
    existing = followings.find_one({
        "follower_id": follower_id,
        "following_id": following_id
    })

    if existing:
        return None  # Already following

    # Create new following relationship
    following_doc = {
        "follower_id": follower_id,
        "following_id": following_id,
        "created_at": datetime.utcnow(),
        "source": source
    }

    result = followings.insert_one(following_doc)
    return str(result.inserted_id)


def unfollow_user(follower_id: str, following_id: str) -> bool:
    """
    Remove a following relationship

    Returns:
        True if unfollowed successfully, False otherwise
    """
    result = followings.delete_one({
        "follower_id": follower_id,
        "following_id": following_id
    })

    return result.deleted_count > 0


def get_following_list(user_id: str) -> List[str]:
    """
    Get list of user IDs that this user follows

    Args:
        user_id: The user whose following list to get

    Returns:
        List of user IDs (as strings)
    """
    cursor = followings.find({"follower_id": user_id})
    return [doc["following_id"] for doc in cursor]


def get_followers_list(user_id: str) -> List[str]:
    """
    Get list of user IDs that follow this user

    Args:
        user_id: The user whose followers list to get

    Returns:
        List of user IDs (as strings)
    """
    cursor = followings.find({"following_id": user_id})
    return [doc["follower_id"] for doc in cursor]


def is_following(follower_id: str, following_id: str) -> bool:
    """
    Check if user A follows user B

    Returns:
        True if following, False otherwise
    """
    return followings.find_one({
        "follower_id": follower_id,
        "following_id": following_id
    }) is not None


def get_mutual_following(user_id: str) -> List[str]:
    """
    Get list of users who have mutual following relationship with this user
    (Both users follow each other)

    Returns:
        List of user IDs with mutual following
    """
    # Get users this user follows
    following = get_following_list(user_id)

    # Check which ones also follow back
    mutual = []
    for other_user_id in following:
        if is_following(other_user_id, user_id):
            mutual.append(other_user_id)

    return mutual


def get_following_stats(user_id: str) -> Dict[str, int]:
    """
    Get following statistics for a user

    Returns:
        Dict with following_count and followers_count
    """
    following_count = followings.count_documents({"follower_id": user_id})
    followers_count = followings.count_documents({"following_id": user_id})

    return {
        "following_count": following_count,
        "followers_count": followers_count
    }
