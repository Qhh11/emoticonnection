"""
Following API endpoints
Handles user following relationships
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from pydantic import BaseModel

# Database imports
import sys
from pathlib import Path

database_path = Path(__file__).resolve().parents[5] / "database"
if str(database_path) not in sys.path:
    sys.path.insert(0, str(database_path))

try:
    from crud.following_crud import (
        follow_user,
        unfollow_user,
        get_following_list,
        get_followers_list,
        is_following,
        get_mutual_following,
        get_following_stats
    )
    from crud.user_crud import get_all_users
except ImportError:
    from database.crud.following_crud import (
        follow_user,
        unfollow_user,
        get_following_list,
        get_followers_list,
        is_following,
        get_mutual_following,
        get_following_stats
    )
    from database.crud.user_crud import get_all_users


router = APIRouter(
    prefix="/social",
    tags=["social"]
)


# ============================================================================
# Request/Response Models
# ============================================================================

class FollowRequest(BaseModel):
    """Follow a user"""
    target_user_id: str


class UnfollowRequest(BaseModel):
    """Unfollow a user"""
    target_user_id: str


class UserInfo(BaseModel):
    """User information"""
    id: str
    username: str
    nickname: str
    is_following: bool = False
    is_follower: bool = False
    is_mutual: bool = False


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/follow")
def follow(request: FollowRequest, user_id: str):
    """
    Follow a user

    Request body:
    {
        "target_user_id": "69444eed764be66c80bfdfe0"
    }

    Query params:
    - user_id: Current user's ID
    """
    if user_id == request.target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    result = follow_user(user_id, request.target_user_id)

    if result is None:
        raise HTTPException(status_code=400, detail="Already following this user")

    return {
        "success": True,
        "message": "Successfully followed user",
        "following_id": result
    }


@router.post("/unfollow")
def unfollow(request: UnfollowRequest, user_id: str):
    """
    Unfollow a user

    Query params:
    - user_id: Current user's ID
    """
    success = unfollow_user(user_id, request.target_user_id)

    if not success:
        raise HTTPException(status_code=400, detail="Not following this user")

    return {
        "success": True,
        "message": "Successfully unfollowed user"
    }


@router.get("/following/{user_id}")
def get_following(user_id: str) -> List[UserInfo]:
    """
    Get list of users that this user follows

    Returns enriched user info with following status
    """
    following_ids = get_following_list(user_id)

    # Get all users info
    all_users = get_all_users()

    # Filter and enrich
    result = []
    for user in all_users:
        user_id_str = str(user["_id"])
        if user_id_str in following_ids:
            result.append(UserInfo(
                id=user_id_str,
                username=user.get("username", ""),
                nickname=user.get("nickname", user.get("username", "")),
                is_following=True,
                is_follower=is_following(user_id_str, user_id),
                is_mutual=is_following(user_id_str, user_id)
            ))

    return result


@router.get("/followers/{user_id}")
def get_followers(user_id: str) -> List[UserInfo]:
    """
    Get list of users that follow this user
    """
    follower_ids = get_followers_list(user_id)

    # Get all users info
    all_users = get_all_users()

    # Filter and enrich
    result = []
    for user in all_users:
        user_id_str = str(user["_id"])
        if user_id_str in follower_ids:
            result.append(UserInfo(
                id=user_id_str,
                username=user.get("username", ""),
                nickname=user.get("nickname", user.get("username", "")),
                is_following=is_following(user_id, user_id_str),
                is_follower=True,
                is_mutual=is_following(user_id, user_id_str)
            ))

    return result


@router.get("/contacts/{user_id}")
def get_contacts(user_id: str) -> List[UserInfo]:
    """
    Get contact list for peer chat
    Returns users that this user follows

    This is the main endpoint for peer_chat.html to get contact list
    """
    following_ids = get_following_list(user_id)

    if not following_ids:
        # If not following anyone, return empty list
        return []

    # Get all users info
    all_users = get_all_users()

    # Filter and enrich
    result = []
    for user in all_users:
        user_id_str = str(user["_id"])
        if user_id_str in following_ids:
            result.append(UserInfo(
                id=user_id_str,
                username=user.get("username", ""),
                nickname=user.get("nickname", user.get("username", "")),
                is_following=True,
                is_follower=is_following(user_id_str, user_id),
                is_mutual=is_following(user_id_str, user_id)
            ))

    return result


@router.get("/discover/{user_id}")
def discover_users(user_id: str) -> List[UserInfo]:
    """
    Discover new users to follow
    Returns all users except self and those already followed
    """
    following_ids = get_following_list(user_id)
    following_set = set(following_ids)

    # Get all users
    all_users = get_all_users()

    # Filter out self and already following
    result = []
    for user in all_users:
        user_id_str = str(user["_id"])
        if user_id_str != user_id and user_id_str not in following_set:
            result.append(UserInfo(
                id=user_id_str,
                username=user.get("username", ""),
                nickname=user.get("nickname", user.get("username", "")),
                is_following=False,
                is_follower=is_following(user_id_str, user_id),
                is_mutual=False
            ))

    return result


@router.get("/stats/{user_id}")
def get_stats(user_id: str):
    """
    Get following statistics for a user
    """
    stats = get_following_stats(user_id)
    return {
        "user_id": user_id,
        "following_count": stats["following_count"],
        "followers_count": stats["followers_count"]
    }


@router.get("/check/{user_id}/{target_user_id}")
def check_following(user_id: str, target_user_id: str):
    """
    Check if user follows target user
    """
    return {
        "is_following": is_following(user_id, target_user_id),
        "is_follower": is_following(target_user_id, user_id),
        "is_mutual": is_following(user_id, target_user_id) and is_following(target_user_id, user_id)
    }
