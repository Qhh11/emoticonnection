"""
Post HTTP API Routes

This file implements REST API endpoints for:
- Creating/getting/deleting posts
- Liking/unliking posts
- Creating/getting comments
- Tag-based filtering and trending tags

Database: MongoDB (via PostRepository)
"""

from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.post.schemas.post import (
    PostCreate, PostUpdate, PostOut, PostListResponse,
    CommentCreate, CommentOut, CommentListResponse,
    LikeCreate, LikeResponse,
    TagInfo, TrendingTagsResponse
)
from app.modules.post.repository.post_repository import PostRepository
# Use unified database configuration
import sys
import os
from pathlib import Path
database_path = Path(__file__).resolve().parents[5] / "database"
sys.path.insert(0, str(database_path))
from config.mongodb_config import get_database  # type: ignore

# Import points system
from crud.check_in_crud import add_points_to_user  # type: ignore
# Import notification system
from crud.notification_crud import create_notification  # type: ignore

# Import WebSocket manager for real-time notifications
def get_ws_manager():
    from app.modules.chat.api.chat_ws import manager
    return manager

# ============================================================================
# Initialize Router
# ============================================================================

router = APIRouter(
    prefix="/posts",
    tags=["posts"]
)


# ============================================================================
# Dependencies
# ============================================================================

def get_post_repo() -> PostRepository:
    """Dependency to get PostRepository instance"""
    db = get_database()
    return PostRepository(db)


# ============================================================================
# Post Endpoints
# ============================================================================

@router.post("", response_model=PostOut)
async def create_post(
    post_data: PostCreate,
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Create a new post
    
    POST /api/posts
    
    Request:
    {
        "author_id": 1,
        "content": "Feeling grateful today! #gratitude #mindfulness",
        "post_type": "text",
        "is_anonymous": true,
        "tags": ["gratitude", "mindfulness"],
        "emotion": "happy"
    }
    
    Features:
    - Supports text, image, video, mixed content
    - Auto-extracts #hashtags from content
    - AI analyzes emotion of text content
    - Anonymous posting supported
    """
    # AI Emotion Analysis for text content
    ai_emotion = None
    if post_data.content:
        try:
            import importlib.util
            from google import genai
            
            # 动态导入 genai/app 模块
            genai_app_path = Path(__file__).resolve().parents[5] / "genai" / "app"
            
            # 导入 weaviate_client
            weaviate_spec = importlib.util.spec_from_file_location(
                "weaviate_client", genai_app_path / "weaviate_client.py"
            )
            weaviate_module = importlib.util.module_from_spec(weaviate_spec)
            weaviate_spec.loader.exec_module(weaviate_module)
            WeaviateManager = weaviate_module.WeaviateManager
            
            # 导入 emotion_analytics
            analytics_spec = importlib.util.spec_from_file_location(
                "emotion_analytics", genai_app_path / "emotion_analytics.py"
            )
            analytics_module = importlib.util.module_from_spec(analytics_spec)
            analytics_spec.loader.exec_module(analytics_module)
            EmotionAnalytics = analytics_module.EmotionAnalytics
            
            # 初始化 Gemini 客户端和 WeaviateManager
            api_key = os.getenv("GEMINI_API_KEY")
            gemini_client = genai.Client(api_key=api_key)
            weaviate_manager = WeaviateManager()
            analytics = EmotionAnalytics(weaviate_manager, gemini_client)
            # 构造单条对话格式
            conversations = [{"timestamp": "", "userQuery": post_data.content}]
            data_points = analytics.analyze_emotions_from_text(conversations)
            if data_points:
                ai_emotion = data_points[0].emotion
                print(f"[AI] Post emotion analyzed: {ai_emotion}")
        except Exception as e:
            print(f"[AI] Post emotion analysis failed: {e}")
    
    # Create post
    post = await repo.create_post(
        author_id=post_data.author_id,
        content=post_data.content,
        post_type=post_data.post_type.value,
        media_urls=post_data.media_urls,
        is_anonymous=post_data.is_anonymous,
        visibility=post_data.visibility.value,
        tags=post_data.tags,
        emotion=post_data.emotion,
        emotion_color=post_data.emotion_color,  # Pass custom emotion color
        ai_emotion=ai_emotion,
        title=post_data.title
    )
    
    print(f"[Post] Created post {post['id']} by user {post_data.author_id} (anonymous: {post_data.is_anonymous})")

    # Award points for creating a post (+10)
    try:
        add_points_to_user(post_data.author_id, 10)
        print(f"[Points] User {post_data.author_id} earned 10 points for creating a post")
    except Exception as e:
        print(f"[Points] Failed to award points: {e}")

    # Write post to Weaviate for semantic search and analytics
    try:
        import importlib.util
        from datetime import datetime
        
        # Import WeaviateManager if not already imported
        genai_app_path = Path(__file__).resolve().parents[5] / "genai" / "app"
        weaviate_spec = importlib.util.spec_from_file_location(
            "weaviate_client", genai_app_path / "weaviate_client.py"
        )
        weaviate_module = importlib.util.module_from_spec(weaviate_spec)
        weaviate_spec.loader.exec_module(weaviate_module)
        WeaviateManager = weaviate_module.WeaviateManager
        
        weaviate_manager = WeaviateManager()
        
        # Prepare post data for Weaviate
        post_data_for_weaviate = [{
            "userId": str(post_data.author_id),
            "postId": str(post['id']),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "content": post_data.content or "",
            "emotion": post_data.emotion or "",
            "aiEmotion": ai_emotion or "",
            "tags": post_data.tags or []
        }]
        
        # Write to Weaviate UserPosts collection
        success = weaviate_manager.write_data("UserPosts", post_data_for_weaviate)
        
        if success:
            print(f"[Weaviate] Post {post['id']} successfully written to Weaviate")
        else:
            print(f"[Weaviate] Failed to write post {post['id']} to Weaviate")
        
        weaviate_manager.close()
    except Exception as e:
        print(f"[Weaviate] Error writing post to Weaviate: {e}")

    return PostOut(**post)


@router.get("/following", response_model=PostListResponse)
async def get_following_posts(
    user_id: str = Query(..., description="Current user ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Posts per page"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get posts from users that the current user follows

    GET /api/posts/following?user_id=xxx&page=1&page_size=20

    Query Parameters:
    - user_id: Current user ID (required)
    - page: Page number (default: 1)
    - page_size: Posts per page (default: 20, max: 50)

    Response:
    {
        "posts": [...],
        "total": 50,
        "page": 1,
        "page_size": 20,
        "has_more": true
    }
    """
    result = await repo.get_following_posts(
        user_id=user_id,
        page=page,
        page_size=page_size,
        viewer_id=user_id
    )

    return PostListResponse(
        posts=[PostOut(**p) for p in result["posts"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"]
    )


@router.get("", response_model=PostListResponse)
async def get_posts_feed(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Posts per page"),
    viewer_id: Optional[str] = Query(None, description="Current user ID (to check likes)"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    emotion: Optional[str] = Query(None, description="Filter by emotion"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get posts feed with pagination
    
    GET /api/posts?page=1&page_size=20&viewer_id=1&tag=gratitude
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Posts per page (default: 20, max: 50)
    - viewer_id: Current user ID to check if liked
    - tag: Filter by specific tag
    - emotion: Filter by emotion
    
    Response:
    {
        "posts": [...],
        "total": 100,
        "page": 1,
        "page_size": 20,
        "has_more": true
    }
    """
    result = await repo.get_posts_feed(
        page=page,
        page_size=page_size,
        viewer_id=viewer_id,
        tag=tag,
        emotion=emotion
    )
    
    return PostListResponse(
        posts=[PostOut(**p) for p in result["posts"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"]
    )


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    post_id: str,
    viewer_id: Optional[str] = Query(None, description="Current user ID"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get a single post by ID
    
    GET /api/posts/{post_id}?viewer_id=1
    """
    post = await repo.get_post_by_id(post_id, viewer_id)
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return PostOut(**post)


@router.put("/{post_id}", response_model=PostOut)
async def update_post(
    post_id: str,
    update_data: PostUpdate,
    user_id: str = Query(..., description="User ID making the update"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Update a post (only author can update)
    
    PUT /api/posts/{post_id}?user_id=1
    
    Request:
    {
        "content": "Updated content! #newtag",
        "tags": ["newtag"],
        "visibility": "public"
    }
    """
    # Verify ownership
    existing = await repo.get_post_by_id(post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if existing["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this post")
    
    updated = await repo.update_post(
        post_id=post_id,
        content=update_data.content,
        tags=update_data.tags,
        visibility=update_data.visibility.value if update_data.visibility else None
    )
    
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update post")
    
    return PostOut(**updated)


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    user_id: str = Query(..., description="User ID making the deletion"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Delete a post (only author can delete)
    
    DELETE /api/posts/{post_id}?user_id=1
    """
    success = await repo.delete_post(post_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
    
    return {"success": True, "message": "Post deleted"}


# ============================================================================
# Like Endpoints
# ============================================================================

@router.post("/{post_id}/like", response_model=LikeResponse)
async def like_post(
    post_id: str,
    like_data: LikeCreate,
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Like a post
    
    POST /api/posts/{post_id}/like
    
    Request:
    {
        "user_id": 1
    }
    
    Response:
    {
        "success": true,
        "action": "liked",
        "new_like_count": 16
    }
    """
    # Verify post exists
    post = await repo.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = await repo.like_post(post_id, like_data.user_id)
    
    return LikeResponse(**result)


@router.post("/{post_id}/unlike", response_model=LikeResponse)
async def unlike_post(
    post_id: str,
    like_data: LikeCreate,
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Unlike a post
    
    POST /api/posts/{post_id}/unlike
    
    Request:
    {
        "user_id": 1
    }
    """
    result = await repo.unlike_post(post_id, like_data.user_id)
    
    return LikeResponse(**result)


# ============================================================================
# Comment Endpoints
# ============================================================================

@router.post("/{post_id}/comments", response_model=CommentOut)
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Add a comment to a post
    
    POST /api/posts/{post_id}/comments
    
    Request:
    {
        "author_id": 2,
        "content": "This is so relatable! 💪",
        "is_anonymous": false,
        "parent_id": null
    }
    
    For replies, include parent_id:
    {
        "author_id": 3,
        "content": "I agree!",
        "is_anonymous": false,
        "parent_id": "507f1f77bcf86cd799439012"
    }
    """
    comment = await repo.create_comment(
        post_id=post_id,
        author_id=comment_data.author_id,
        content=comment_data.content,
        is_anonymous=comment_data.is_anonymous,
        parent_id=comment_data.parent_id
    )
    
    if not comment:
        raise HTTPException(status_code=404, detail="Post not found")
    
    print(f"[Comment] User {comment_data.author_id} commented on post {post_id}")

    # Award points for creating a comment (+5)
    try:
        add_points_to_user(comment_data.author_id, 5)
        print(f"[Points] User {comment_data.author_id} earned 5 points for commenting")
    except Exception as e:
        print(f"[Points] Failed to award points: {e}")

    # Create notification for post author (if commenter is not the author)
    try:
        post = await repo.get_post_by_id(post_id)
        if post:
            post_author_id = str(post.get("author_id"))
            commenter_id = str(comment_data.author_id)
            # Only notify if commenter is not the post author
            if post_author_id != commenter_id:
                create_notification(
                    user_id=post_author_id,
                    notification_type="post_comment",
                    source_id=post_id,  # post_id as source
                    actor_id=commenter_id
                )
                print(f"[Notification] Created comment notification for user {post_author_id}")
                # Send real-time notification update via WebSocket
                try:
                    ws_manager = get_ws_manager()
                    await ws_manager.send_notification_update(
                        target_user_id=post_author_id,
                        notification_type="post_comment",
                        source_id=post_id
                    )
                except Exception as ws_err:
                    print(f"[Notification] Failed to send WebSocket notification: {ws_err}")
    except Exception as e:
        print(f"[Notification] Failed to create comment notification: {e}")

    return CommentOut(**comment)


@router.get("/{post_id}/comments", response_model=CommentListResponse)
async def get_comments(
    post_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    parent_id: Optional[str] = Query(None, description="Get replies to this comment"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get comments for a post
    
    GET /api/posts/{post_id}/comments?page=1&page_size=20
    
    To get replies to a specific comment:
    GET /api/posts/{post_id}/comments?parent_id=507f1f77bcf86cd799439012
    """
    result = await repo.get_post_comments(
        post_id=post_id,
        page=page,
        page_size=page_size,
        parent_id=parent_id
    )
    
    return CommentListResponse(
        comments=[CommentOut(**c) for c in result["comments"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"]
    )


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user_id: str = Query(..., description="User ID making the deletion"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Delete a comment (only author can delete)
    
    DELETE /api/posts/comments/{comment_id}?user_id=2
    """
    success = await repo.delete_comment(comment_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    
    return {"success": True, "message": "Comment deleted"}


@router.post("/comments/{comment_id}/like", response_model=LikeResponse)
async def like_comment(
    comment_id: str,
    like_data: LikeCreate,
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Like a comment
    
    POST /api/posts/comments/{comment_id}/like
    """
    result = await repo.like_comment(comment_id, like_data.user_id)
    
    return LikeResponse(**result)


# ============================================================================
# Tag Endpoints
# ============================================================================

@router.get("/tags/trending", response_model=TrendingTagsResponse)
async def get_trending_tags(
    limit: int = Query(10, ge=1, le=50, description="Number of tags to return"),
    days: int = Query(7, ge=1, le=30, description="Look back period in days"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get trending tags
    
    GET /api/posts/tags/trending?limit=10&days=7
    
    Response:
    {
        "tags": [
            {"tag": "gratitude", "post_count": 45, "trending_score": 89.5},
            {"tag": "mindfulness", "post_count": 38, "trending_score": 72.0},
            ...
        ]
    }
    """
    tags = await repo.get_trending_tags(limit=limit, days=days)
    
    return TrendingTagsResponse(
        tags=[TagInfo(**t) for t in tags]
    )


@router.get("/tags/search")
async def search_tags(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Search for tags
    
    GET /api/posts/tags/search?q=grat&limit=10
    
    Response:
    {
        "tags": [
            {"tag": "gratitude", "post_count": 45},
            {"tag": "grateful", "post_count": 12}
        ]
    }
    """
    tags = await repo.search_tags(q, limit)
    
    return {"tags": tags}


@router.get("/tags/{tag}", response_model=PostListResponse)
async def get_posts_by_tag(
    tag: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    viewer_id: Optional[str] = Query(None),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get posts with a specific tag
    
    GET /api/posts/tags/gratitude?page=1&viewer_id=1
    """
    result = await repo.get_posts_by_tag(
        tag=tag,
        page=page,
        page_size=page_size,
        viewer_id=viewer_id
    )
    
    return PostListResponse(
        posts=[PostOut(**p) for p in result["posts"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"]
    )


# ============================================================================
# User Posts Endpoint
# ============================================================================

@router.get("/user/{user_id}", response_model=PostListResponse)
async def get_user_posts(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    include_anonymous: bool = Query(False, description="Include anonymous posts (only for own profile)"),
    repo: PostRepository = Depends(get_post_repo)
):
    """
    Get posts by a specific user
    
    GET /api/posts/user/1?page=1&include_anonymous=false
    """
    result = await repo.get_user_posts(
        user_id=user_id,
        page=page,
        page_size=page_size,
        include_anonymous=include_anonymous
    )
    
    return PostListResponse(
        posts=[PostOut(**p) for p in result["posts"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"]
    )