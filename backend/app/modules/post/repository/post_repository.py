"""
Post Repository - Database operations for posts, comments, and likes

This file implements the Repository Pattern for post-related operations.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class PostRepository:
    """
    Repository for post-related database operations
    Handles posts, post_comments, post_likes collections
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.posts = db.posts
        self.comments = db.post_comments
        self.likes = db.post_likes
        self.users = db.users  # Add users collection for fetching usernames

    # ========================================================================
    # Post Operations
    # ========================================================================

    async def create_post(
        self,
        author_id: Union[int, str],
        content: str,
        post_type: str = "text",
        media_urls: Optional[List[str]] = None,
        is_anonymous: bool = False,
        visibility: str = "public",
        tags: Optional[List[str]] = None,
        emotion: Optional[str] = None,
        ai_emotion: Optional[str] = None
    ) -> Dict:
        """
        Create a new post
        
        Args:
            author_id: User ID of the author
            content: Post text content
            post_type: text/image/video/mixed
            media_urls: List of media file URLs
            is_anonymous: Whether to post anonymously
            visibility: public/anonymous/friends_only
            tags: List of tags (without #)
            emotion: User-selected emotion
            ai_emotion: AI-analyzed emotion
            
        Returns:
            Created post as dict
        """
        # Extract tags from content if not provided
        if tags is None:
            tags = self._extract_tags(content)
        
        # Normalize tags (lowercase, remove duplicates)
        tags = list(set(tag.lower().strip() for tag in tags if tag.strip()))
        
        new_post = {
            "author_id": author_id,
            "content": content,
            "post_type": post_type,
            "media_urls": media_urls or [],
            "is_anonymous": is_anonymous,
            "visibility": visibility,
            "tags": tags,
            "emotion": emotion,
            "ai_emotion": ai_emotion,
            "like_count": 0,
            "comment_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": None,
            "is_deleted": False
        }
        
        result = await self.posts.insert_one(new_post)
        new_post["_id"] = result.inserted_id
        
        return self._post_to_dict(new_post)

    async def get_post_by_id(
        self,
        post_id: str,
        viewer_id: Optional[Union[int, str]] = None
    ) -> Optional[Dict]:
        """Get a single post by ID"""
        try:
            oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return None
        
        post = await self.posts.find_one({
            "_id": oid,
            "is_deleted": False
        })
        
        if not post:
            return None

        post_dict = self._post_to_dict(post)

        # Fetch real username if not anonymous
        if not post_dict["is_anonymous"]:
            username = await self._get_username(post_dict["author_id"])
            if username:
                post_dict["author_name"] = username

        # Check if viewer has liked this post
        if viewer_id:
            post_dict["is_liked"] = await self._check_user_liked(post_id, viewer_id)

        return post_dict

    async def get_posts_feed(
        self,
        page: int = 1,
        page_size: int = 20,
        viewer_id: Optional[Union[int, str]] = None,
        tag: Optional[str] = None,
        author_id: Optional[Union[int, str]] = None,
        emotion: Optional[str] = None
    ) -> Dict:
        """
        Get paginated posts feed
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of posts per page
            viewer_id: Current user's ID (to check likes)
            tag: Filter by tag
            author_id: Filter by author
            emotion: Filter by emotion
            
        Returns:
            Dict with posts, total, pagination info
        """
        # Build query filter
        query = {"is_deleted": False, "visibility": {"$ne": "friends_only"}}
        
        if tag:
            query["tags"] = tag.lower()
        if author_id:
            query["author_id"] = author_id
        if emotion:
            query["$or"] = [
                {"emotion": emotion},
                {"ai_emotion": emotion}
            ]
        
        # Get total count
        total = await self.posts.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        cursor = self.posts.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        posts = await cursor.to_list(length=page_size)
        
        # Convert to dicts and check likes
        result_posts = []
        for post in posts:
            post_dict = self._post_to_dict(post)

            # Fetch real username if not anonymous
            if not post_dict["is_anonymous"]:
                username = await self._get_username(post_dict["author_id"])
                if username:
                    post_dict["author_name"] = username

            if viewer_id:
                post_dict["is_liked"] = await self._check_user_liked(
                    post_dict["id"], viewer_id
                )
            result_posts.append(post_dict)
        
        return {
            "posts": result_posts,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(posts) < total
        }

    async def get_user_posts(
        self,
        user_id: Union[int, str],
        page: int = 1,
        page_size: int = 20,
        include_anonymous: bool = False
    ) -> Dict:
        """Get posts by a specific user"""
        query = {
            "author_id": user_id,
            "is_deleted": False
        }
        
        if not include_anonymous:
            query["is_anonymous"] = False
        
        total = await self.posts.count_documents(query)
        skip = (page - 1) * page_size
        
        cursor = self.posts.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        posts = await cursor.to_list(length=page_size)

        # Convert posts and fetch usernames
        result_posts = []
        for post in posts:
            post_dict = self._post_to_dict(post)
            # Fetch real username if not anonymous
            if not post_dict["is_anonymous"]:
                username = await self._get_username(post_dict["author_id"])
                if username:
                    post_dict["author_name"] = username
            result_posts.append(post_dict)

        return {
            "posts": result_posts,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(posts) < total
        }

    async def update_post(
        self,
        post_id: str,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None,
        visibility: Optional[str] = None
    ) -> Optional[Dict]:
        """Update a post"""
        try:
            oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return None
        
        update_data = {"updated_at": datetime.utcnow()}
        
        if content is not None:
            update_data["content"] = content
            # Re-extract tags if content changed
            if tags is None:
                tags = self._extract_tags(content)
        
        if tags is not None:
            update_data["tags"] = list(set(tag.lower().strip() for tag in tags))
        
        if visibility is not None:
            update_data["visibility"] = visibility
        
        result = await self.posts.find_one_and_update(
            {"_id": oid, "is_deleted": False},
            {"$set": update_data},
            return_document=True
        )
        
        return self._post_to_dict(result) if result else None

    async def delete_post(self, post_id: str, user_id: Union[int, str]) -> bool:
        """Soft delete a post (only author can delete)"""
        try:
            oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return False
        
        result = await self.posts.update_one(
            {"_id": oid, "author_id": user_id},
            {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
        )
        
        return result.modified_count > 0

    # ========================================================================
    # Like Operations
    # ========================================================================

    async def like_post(self, post_id: str, user_id: Union[int, str]) -> Dict:
        """
        Like a post
        
        Returns:
            Dict with success, action, new_like_count
        """
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return {"success": False, "action": "error", "new_like_count": 0}
        
        # Check if already liked (check both field names for compatibility)
        existing = await self.likes.find_one({
            "$or": [
                {"target_id": post_oid, "target_type": "post", "user_id": user_id},
                {"post_id": post_id, "user_id": user_id}
            ]
        })

        if existing:
            return {
                "success": False,
                "action": "already_liked",
                "new_like_count": await self._get_post_like_count(post_id)
            }

        # Create like - include both post_id (for index) and target_id (for queries)
        await self.likes.insert_one({
            "post_id": post_id,
            "target_id": post_oid,
            "target_type": "post",
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })
        
        # Update post like count
        await self.posts.update_one(
            {"_id": post_oid},
            {"$inc": {"like_count": 1}}
        )
        
        return {
            "success": True,
            "action": "liked",
            "new_like_count": await self._get_post_like_count(post_id)
        }

    async def unlike_post(self, post_id: str, user_id: Union[int, str]) -> Dict:
        """Unlike a post"""
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return {"success": False, "action": "error", "new_like_count": 0}
        
        # Remove like (try both field names for compatibility)
        result = await self.likes.delete_one({
            "$or": [
                {"target_id": post_oid, "target_type": "post", "user_id": user_id},
                {"post_id": post_id, "user_id": user_id}
            ]
        })
        
        if result.deleted_count == 0:
            return {
                "success": False,
                "action": "not_liked",
                "new_like_count": await self._get_post_like_count(post_id)
            }
        
        # Update post like count
        await self.posts.update_one(
            {"_id": post_oid},
            {"$inc": {"like_count": -1}}
        )
        
        return {
            "success": True,
            "action": "unliked",
            "new_like_count": await self._get_post_like_count(post_id)
        }

    # ========================================================================
    # Comment Operations
    # ========================================================================

    async def create_comment(
        self,
        post_id: str,
        author_id: Union[int, str],
        content: str,
        is_anonymous: bool = False,
        parent_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Create a comment on a post"""
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
            parent_oid = None
            if parent_id:
                parent_oid = ObjectId(parent_id) if ObjectId.is_valid(parent_id) else parent_id
        except:
            return None
        
        # Verify post exists
        post = await self.posts.find_one({"_id": post_oid, "is_deleted": False})
        if not post:
            return None
        
        new_comment = {
            "post_id": post_oid,
            "author_id": author_id,
            "content": content,
            "is_anonymous": is_anonymous,
            "parent_id": parent_oid,
            "like_count": 0,
            "reply_count": 0,
            "created_at": datetime.utcnow(),
            "is_deleted": False
        }
        
        result = await self.comments.insert_one(new_comment)
        new_comment["_id"] = result.inserted_id
        
        # Update post comment count
        await self.posts.update_one(
            {"_id": post_oid},
            {"$inc": {"comment_count": 1}}
        )
        
        # Update parent comment reply count if this is a reply
        if parent_oid:
            await self.comments.update_one(
                {"_id": parent_oid},
                {"$inc": {"reply_count": 1}}
            )

        comment_dict = self._comment_to_dict(new_comment)

        # Fetch real username if not anonymous
        if not comment_dict["is_anonymous"]:
            username = await self._get_username(comment_dict["author_id"])
            if username:
                comment_dict["author_name"] = username

        return comment_dict

    async def get_post_comments(
        self,
        post_id: str,
        page: int = 1,
        page_size: int = 20,
        parent_id: Optional[str] = None
    ) -> Dict:
        """
        Get comments for a post
        
        Args:
            post_id: Post ID
            page: Page number
            page_size: Comments per page
            parent_id: If provided, get replies to this comment
        """
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
            parent_oid = None
            if parent_id:
                parent_oid = ObjectId(parent_id) if ObjectId.is_valid(parent_id) else parent_id
        except:
            return {"comments": [], "total": 0, "page": page, "page_size": page_size, "has_more": False}
        
        query = {
            "post_id": post_oid,
            "is_deleted": False,
            "parent_id": parent_oid  # None for top-level comments
        }
        
        total = await self.comments.count_documents(query)
        skip = (page - 1) * page_size
        
        cursor = self.comments.find(query).sort("created_at", 1).skip(skip).limit(page_size)
        comments = await cursor.to_list(length=page_size)

        # Convert comments and fetch usernames
        result_comments = []
        for comment in comments:
            comment_dict = self._comment_to_dict(comment)
            # Fetch real username if not anonymous
            if not comment_dict["is_anonymous"]:
                username = await self._get_username(comment_dict["author_id"])
                if username:
                    comment_dict["author_name"] = username
            result_comments.append(comment_dict)

        return {
            "comments": result_comments,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(comments) < total
        }

    async def delete_comment(self, comment_id: str, user_id: Union[int, str]) -> bool:
        """Soft delete a comment (only author can delete)"""
        try:
            oid = ObjectId(comment_id) if ObjectId.is_valid(comment_id) else comment_id
        except:
            return False
        
        # Get comment first to update counts
        comment = await self.comments.find_one({"_id": oid, "author_id": user_id})
        if not comment:
            return False
        
        # Soft delete
        result = await self.comments.update_one(
            {"_id": oid},
            {"$set": {"is_deleted": True}}
        )
        
        if result.modified_count > 0:
            # Update post comment count
            await self.posts.update_one(
                {"_id": comment["post_id"]},
                {"$inc": {"comment_count": -1}}
            )
            
            # Update parent reply count if this was a reply
            if comment.get("parent_id"):
                await self.comments.update_one(
                    {"_id": comment["parent_id"]},
                    {"$inc": {"reply_count": -1}}
                )
            
            return True
        
        return False

    async def like_comment(self, comment_id: str, user_id: Union[int, str]) -> Dict:
        """Like a comment"""
        try:
            comment_oid = ObjectId(comment_id) if ObjectId.is_valid(comment_id) else comment_id
        except:
            return {"success": False, "action": "error", "new_like_count": 0}
        
        # Check if already liked
        existing = await self.likes.find_one({
            "target_id": comment_oid,
            "target_type": "comment",
            "user_id": user_id
        })
        
        if existing:
            return {"success": False, "action": "already_liked", "new_like_count": 0}
        
        # Create like
        await self.likes.insert_one({
            "target_id": comment_oid,
            "target_type": "comment",
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })
        
        # Update comment like count
        result = await self.comments.find_one_and_update(
            {"_id": comment_oid},
            {"$inc": {"like_count": 1}},
            return_document=True
        )
        
        return {
            "success": True,
            "action": "liked",
            "new_like_count": result.get("like_count", 0) if result else 0
        }

    # ========================================================================
    # Tag Operations
    # ========================================================================

    async def get_posts_by_tag(
        self,
        tag: str,
        page: int = 1,
        page_size: int = 20,
        viewer_id: Optional[Union[int, str]] = None
    ) -> Dict:
        """Get posts with a specific tag"""
        return await self.get_posts_feed(
            page=page,
            page_size=page_size,
            viewer_id=viewer_id,
            tag=tag.lower()
        )

    async def get_trending_tags(self, limit: int = 10, days: int = 7) -> List[Dict]:
        """
        Get trending tags based on recent usage
        
        Args:
            limit: Number of tags to return
            days: Look back period in days
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}, "is_deleted": False}},
            {"$unwind": "$tags"},
            {"$group": {
                "_id": "$tags",
                "count": {"$sum": 1},
                "recent_posts": {"$sum": {"$cond": [
                    {"$gte": ["$created_at", datetime.utcnow() - timedelta(days=1)]},
                    1, 0
                ]}}
            }},
            {"$project": {
                "tag": "$_id",
                "post_count": "$count",
                "trending_score": {
                    "$add": ["$count", {"$multiply": ["$recent_posts", 2]}]
                }
            }},
            {"$sort": {"trending_score": -1}},
            {"$limit": limit}
        ]
        
        cursor = self.posts.aggregate(pipeline)
        tags = await cursor.to_list(length=limit)
        
        return [
            {
                "tag": t["tag"],
                "post_count": t["post_count"],
                "trending_score": t["trending_score"]
            }
            for t in tags
        ]

    async def search_tags(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for tags matching a query"""
        pipeline = [
            {"$match": {"is_deleted": False}},
            {"$unwind": "$tags"},
            {"$match": {"tags": {"$regex": f"^{query}", "$options": "i"}}},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        cursor = self.posts.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
        return [{"tag": r["_id"], "post_count": r["count"]} for r in results]

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _get_username(self, user_id: Union[int, str]) -> Optional[str]:
        """Get username from user ID"""
        try:
            # Try to find user by ObjectId string first
            from bson import ObjectId
            user_oid = None
            if isinstance(user_id, str) and ObjectId.is_valid(user_id):
                user_oid = ObjectId(user_id)

            # Query for user
            user = await self.users.find_one(
                {"$or": [{"_id": user_oid}, {"_id": user_id}]} if user_oid else {"_id": user_id}
            )

            if user:
                # Return nickname or username
                return user.get("nickname") or user.get("username")
            return None
        except Exception as e:
            print(f"[PostRepository] Error fetching username for {user_id}: {e}")
            return None

    def _extract_tags(self, content: str) -> List[str]:
        """Extract hashtags from content"""
        import re
        tags = re.findall(r'#(\w+)', content)
        return list(set(tag.lower() for tag in tags))

    async def _check_user_liked(self, post_id: str, user_id: Union[int, str]) -> bool:
        """Check if user has liked a post"""
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return False
        
        like = await self.likes.find_one({
            "target_id": post_oid,
            "target_type": "post",
            "user_id": user_id
        })
        return like is not None

    async def _get_post_like_count(self, post_id: str) -> int:
        """Get current like count for a post"""
        try:
            post_oid = ObjectId(post_id) if ObjectId.is_valid(post_id) else post_id
        except:
            return 0
        
        post = await self.posts.find_one({"_id": post_oid})
        return post.get("like_count", 0) if post else 0

    def _post_to_dict(self, post: Dict) -> Dict:
        """Convert MongoDB post document to API-compatible dict"""
        if not post:
            return None
        
        return {
            "id": str(post["_id"]),
            "author_id": post["author_id"],
            "author_name": None if post.get("is_anonymous") else f"User {post['author_id']}",
            "content": post["content"],
            "post_type": post.get("post_type", "text"),
            "media_urls": post.get("media_urls", []),
            "is_anonymous": post.get("is_anonymous", False),
            "visibility": post.get("visibility", "public"),
            "tags": post.get("tags", []),
            "emotion": post.get("emotion"),
            "ai_emotion": post.get("ai_emotion"),
            "like_count": post.get("like_count", 0),
            "comment_count": post.get("comment_count", 0),
            "is_liked": False,  # Will be set by caller if needed
            "created_at": post.get("created_at", datetime.utcnow()),
            "updated_at": post.get("updated_at")
        }

    def _comment_to_dict(self, comment: Dict) -> Dict:
        """Convert MongoDB comment document to API-compatible dict"""
        if not comment:
            return None
        
        return {
            "id": str(comment["_id"]),
            "post_id": str(comment["post_id"]),
            "author_id": comment["author_id"],
            "author_name": None if comment.get("is_anonymous") else f"User {comment['author_id']}",
            "content": comment["content"],
            "is_anonymous": comment.get("is_anonymous", False),
            "parent_id": str(comment["parent_id"]) if comment.get("parent_id") else None,
            "like_count": comment.get("like_count", 0),
            "reply_count": comment.get("reply_count", 0),
            "created_at": comment.get("created_at", datetime.utcnow())
        }