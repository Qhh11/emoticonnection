"""
AI Chat Repository - Database operations for AI chat sessions
"""
from datetime import datetime, timezone
from typing import Dict, Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

class AIChatRepository:
    """
    Repository for AI chat-related database operations
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions = db.chat_sessions
        self.messages = db.chat_messages

    def _session_to_dict(self, session: Dict) -> Dict:
        """Convert MongoDB session document to API-compatible dict"""
        if not session:
            return None

        return {
            "id": str(session["_id"]),
            "session_type": session.get("session_type", "ai"),
            "user_id": str(session["user_id"]),
            "ai_mode": session.get("ai_mode", "general"),
            "created_at": session.get("started_at", session.get("created_at")),
            "status": session.get("status", "active")
        }

    def _message_to_dict(self, message: Dict) -> Dict:
        """Convert MongoDB message document to API-compatible dict"""
        if not message:
            return None

        return {
            "id": str(message["_id"]),
            "room_id": str(message["session_id"]),
            "sender_id": str(message["sender_id"]),
            "sender_type": message.get("sender_type", "user"),
            "message_type": message["message_type"],
            "content": message["content"],
            "created_at": message["created_at"]
        }

    async def get_or_create_ai_session(self, user_id: str) -> Dict:
        """Get existing active AI chat session or create new one"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        session = await self.sessions.find_one({
            "session_type": "ai",
            "user_id": user_oid,
            "status": "active"
        })

        if session:
            return self._session_to_dict(session)

        new_session = {
            "session_type": "ai",
            "user_id": user_oid,
            "peer_user_id": None,
            "ai_mode": "general",
            "status": "active",
            "started_at": datetime.now(timezone.utc),
            "ended_at": None,
            "is_anonymous": False,
            # Default fields required by schema but not used by AI chat
            "match_score": None,
            "match_criteria": None,
            "user_rating": None,
            "peer_rating": None,
            "is_favorited": False,
            "is_blocked": False,
            "user1_revealed": True,
            "user2_revealed": True
        }

        result = await self.sessions.insert_one(new_session)
        new_session["_id"] = result.inserted_id
        return self._session_to_dict(new_session)

    async def save_message(
        self,
        session_id: str,
        sender_id: str,
        content: str,
        sender_type: str = "user"
    ) -> Dict:
        """Save a message (user or AI)"""
        try:
            session_oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
            # AI sender_id might be a string like "ai_assistant", so don't convert if not valid ObjectId
            sender_oid = ObjectId(sender_id) if ObjectId.is_valid(sender_id) else sender_id
        except:
            session_oid = session_id
            sender_oid = sender_id

        new_message = {
            "session_id": session_oid,
            "sender_id": sender_oid,
            "sender_type": sender_type,
            "content": content,
            "message_type": "text",
            "media_url": None,
            "emotion": None,
            "safety_flag": "safe",
            "created_at": datetime.now(timezone.utc),
            "is_deleted": False
        }

        result = await self.messages.insert_one(new_message)
        new_message["_id"] = result.inserted_id
        return self._message_to_dict(new_message)

    async def create_session(self, user_id: str) -> Dict:
        """Force create a new AI chat session"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        new_session = {
            "session_type": "ai",
            "user_id": user_oid,
            "peer_user_id": None,
            "ai_mode": "general",
            "status": "active",
            "started_at": datetime.now(timezone.utc),
            "ended_at": None,
            "is_anonymous": False,
            "match_score": None,
            "match_criteria": None,
            "user_rating": None,
            "peer_rating": None,
            "is_favorited": False,
            "is_blocked": False,
            "user1_revealed": True,
            "user2_revealed": True
        }

        result = await self.sessions.insert_one(new_session)
        new_session["_id"] = result.inserted_id
        return self._session_to_dict(new_session)

    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        """Get all AI sessions for a user"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id
        
        cursor = self.sessions.find({
            "session_type": "ai",
            "user_id": user_oid
        }).sort("started_at", -1)
        
        sessions = await cursor.to_list(length=100)
        return [self._session_to_dict(s) for s in sessions]

    async def get_session_messages(self, session_id: str) -> List[Dict]:
        """Get messages for a session"""
        try:
            session_oid = ObjectId(session_id) if ObjectId.is_valid(session_id) else session_id
        except:
            session_oid = session_id

        cursor = self.messages.find({"session_id": session_oid}).sort("created_at", 1)
        messages = await cursor.to_list(length=1000)
        return [self._message_to_dict(m) for m in messages]
