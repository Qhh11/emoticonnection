"""
Chat Repository - Database operations for chat sessions and messages
"""
from datetime import datetime
from typing import List, Optional, Dict
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class ChatRepository:
    """
    Repository for chat-related database operations
    Handles chat_sessions and chat_messages collections
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = db.chat_sessions
        self.messages = db.chat_messages

    # ========================================================================
    # Session Operations
    # ========================================================================

    async def get_or_create_session(
        self,
        user1_id: str,
        user2_id: str,
        is_anonymous: bool = False
    ) -> Dict:
        """
        Get existing peer chat session or create new one

        Args:
            user1_id: First user ID (string representation of ObjectId or int)
            user2_id: Second user ID
            is_anonymous: Whether the session is anonymous

        Returns:
            Session document as dict
        """
        # Convert IDs to ObjectId if they're valid, otherwise keep as int for now
        try:
            user1_oid = ObjectId(user1_id) if ObjectId.is_valid(user1_id) else user1_id
            user2_oid = ObjectId(user2_id) if ObjectId.is_valid(user2_id) else user2_id
        except:
            user1_oid = user1_id
            user2_oid = user2_id

        # Search for existing session (check both orderings)
        session = await self.sessions.find_one({
            "session_type": "peer",
            "status": "active",
            "$or": [
                {"user_id": user1_oid, "peer_user_id": user2_oid},
                {"user_id": user2_oid, "peer_user_id": user1_oid}
            ]
        })

        if session:
            return self._session_to_dict(session)

        # Create new session
        new_session = {
            "session_type": "peer",
            "user_id": user1_oid,
            "peer_user_id": user2_oid,
            "ai_mode": None,
            "match_score": None,
            "match_criteria": None,
            "status": "active",
            "started_at": datetime.utcnow(),
            "ended_at": None,
            "user_rating": None,
            "peer_rating": None,
            "is_favorited": False,
            "is_blocked": False,
            "is_anonymous": is_anonymous,
            "user1_revealed": not is_anonymous,
            "user2_revealed": not is_anonymous
        }

        result = await self.sessions.insert_one(new_session)
        new_session["_id"] = result.inserted_id

        return self._session_to_dict(new_session)



    async def get_session_by_id(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        try:
            oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
        except:
            oid = session_id

        session = await self.sessions.find_one({"_id": oid})
        return self._session_to_dict(session) if session else None

    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        """Get all PEER chat sessions for a user (excludes AI chat sessions)"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        cursor = self.sessions.find({
            "session_type": "peer",  # Only return peer chat sessions, not AI chat
            "$or": [
                {"user_id": user_oid},
                {"peer_user_id": user_oid}
            ]
        }).sort("started_at", -1)

        sessions = await cursor.to_list(length=100)
        return [self._session_to_dict(s) for s in sessions]

    async def update_session_status(self, session_id: str, status: str):
        """Update session status (active/ended/reported)"""
        try:
            oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
        except:
            oid = session_id

        update_data = {"status": status}
        if status == "ended":
            update_data["ended_at"] = datetime.utcnow()

        await self.sessions.update_one(
            {"_id": oid},
            {"$set": update_data}
        )

    # ========================================================================
    # Message Operations
    # ========================================================================

    async def create_message(
        self,
        session_id: str,
        sender_id: str,
        content: str,
        message_type: str = "text",
        media_url: Optional[str] = None,
        emotion: Optional[str] = None,
        emotion_analysis: Optional[Dict] = None,
        sender_type: str = "user"
    ) -> Dict:
        """
        Create a new message

        Args:
            session_id: Session ID
            sender_id: Sender user ID
            content: Message content
            message_type: text/emoji/image/video
            media_url: URL to media file (optional)
            emotion: AI-analyzed emotion (optional, single emotion for backward compatibility)
            emotion_analysis: Dual emotion analysis with percentages (optional)

        Returns:
            Created message as dict
        """
        try:
            session_oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
            sender_oid = ObjectId(sender_id) if ObjectId.is_valid(sender_id) else sender_id
        except:
            session_oid = session_id
            sender_oid = sender_id

        new_message = {
            "session_id": session_oid,
            "sender_id": sender_oid,
            "sender_type": sender_type,
            "content": content,
            "message_type": message_type,
            "media_url": media_url,
            "emotion": emotion,  # Single emotion for backward compatibility
            "emotion_analysis": emotion_analysis,  # Dual emotion analysis with percentages
            "safety_flag": "safe",  # Default to safe
            "safety_note": None,
            "created_at": datetime.utcnow(),
            "is_deleted": False
        }

        result = await self.messages.insert_one(new_message)
        new_message["_id"] = result.inserted_id

        return self._message_to_dict(new_message)

    async def get_session_messages(
        self,
        session_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get messages for a session"""
        try:
            session_oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
        except:
            session_oid = session_id

        cursor = self.messages.find({
            "session_id": session_oid,
            "is_deleted": False
        }).sort("created_at", 1).limit(limit)

        messages = await cursor.to_list(length=limit)
        return [self._message_to_dict(m) for m in messages]

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _session_to_dict(self, session: Dict) -> Dict:
        """Convert MongoDB session document to API-compatible dict"""
        if not session:
            return None

        return {
            "id": str(session["_id"]),
            "session_type": session.get("session_type", "peer"),
            "user1_id": str(session["user_id"]),
            "user2_id": str(session.get("peer_user_id")),
            "is_anonymous": session.get("is_anonymous", False),
            "created_at": session.get("started_at", session.get("created_at")),
            "user1_revealed": session.get("user1_revealed", True),
            "user2_revealed": session.get("user2_revealed", True),
            "status": session.get("status", "active")
        }

    def _message_to_dict(self, message: Dict) -> Dict:
        """Convert MongoDB message document to API-compatible dict"""
        if not message:
            return None

        return {
            "id": str(message["_id"]),
            "room_id": str(message["session_id"]),  # Keep "room_id" for API compatibility
            "sender_id": str(message["sender_id"]),
            "message_type": message["message_type"],
            "content": message["content"],
            "media_url": message.get("media_url"),
            "emotion": message.get("emotion"),
            "emotion_analysis": message.get("emotion_analysis"),  # Dual emotion analysis
            "created_at": message["created_at"]
        }
