"""
Diary Repository - Database operations for AI generated diaries
"""
from datetime import datetime
from typing import Dict, Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

class DiaryRepository:
    """
    Repository for Diary operations
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.diaries

    def _diary_to_dict(self, diary: Dict) -> Dict:
        if not diary:
            return None
        return {
            "id": str(diary["_id"]),
            "user_id": str(diary["user_id"]),
            "session_id": str(diary["session_id"]) if diary.get("session_id") else None,
            "title": diary["title"],
            "content": diary["content"],
            "mood": diary.get("mood", "Neutral"),
            "color": diary.get("color"),  # Custom mood color
            "created_at": diary["created_at"]
        }

    async def create_diary(self, user_id: str, session_id: str, title: str, content: str, mood: str, color: Optional[str] = None) -> Dict:
        """Create a new diary entry"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
            session_oid = ObjectId(session_id) if session_id and ObjectId.is_valid(session_id) else session_id
        except:
            user_oid = user_id
            session_oid = session_id

        new_diary = {
            "user_id": user_oid,
            "session_id": session_oid,
            "title": title,
            "content": content,
            "mood": mood,
            "color": color,  # Custom mood color
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await self.collection.insert_one(new_diary)
        new_diary["_id"] = result.inserted_id
        return self._diary_to_dict(new_diary)

    async def get_user_diaries(self, user_id: str) -> List[Dict]:
        """Get all diaries for a user"""
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        cursor = self.collection.find({"user_id": user_oid}).sort("created_at", -1)
        diaries = await cursor.to_list(length=100)
        return [self._diary_to_dict(d) for d in diaries]

    async def get_diary(self, diary_id: str) -> Optional[Dict]:
        """Get specific diary"""
        try:
            oid = ObjectId(diary_id)
        except:
            return None

        diary = await self.collection.find_one({"_id": oid})
        return self._diary_to_dict(diary)

    async def delete_diary(self, diary_id: str) -> bool:
        """Delete a diary entry"""
        try:
            oid = ObjectId(diary_id)
        except:
            return False

        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0
