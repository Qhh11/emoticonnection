"""
Daily Emotion Score Repository - Stores persistent daily emotion scores for users

All dates are stored and processed in UTC for consistency across timezones.
Frontend is responsible for converting UTC dates to user's local timezone for display.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class DailyEmotionRepository:
    """
    Repository for Daily Emotion Score operations.

    This collection stores daily emotion scores that are:
    - Calculated from user's chat conversations
    - Stored with UTC dates (utc_date field)
    - Locked after the day ends (past scores are immutable)
    - Used for consistent display across all devices
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.daily_emotion_scores

    def _score_to_dict(self, score: Dict) -> Dict:
        """Convert MongoDB document to API response format"""
        if not score:
            return None
        # Support both old "date" field and new "utc_date" field for backwards compatibility
        utc_date = score.get("utc_date") or score.get("date")
        return {
            "id": str(score["_id"]),
            "user_id": str(score["user_id"]),
            "utc_date": utc_date,  # YYYY-MM-DD format in UTC
            "avg_score": score.get("avg_score", 0.0),
            "dominant_emotion": score.get("dominant_emotion", "neutral"),
            "interaction_count": score.get("interaction_count", 0),
            "locked": score.get("locked", False),
            "created_at": score.get("created_at"),
            "updated_at": score.get("updated_at")
        }

    async def ensure_indexes(self):
        """Create necessary indexes for the collection"""
        # Unique compound index on user_id and utc_date
        await self.collection.create_index(
            [("user_id", 1), ("utc_date", 1)],
            unique=True,
            name="user_utc_date_unique"
        )
        # Index for querying by user_id with date range
        await self.collection.create_index(
            [("user_id", 1), ("utc_date", -1)],
            name="user_utc_date_desc"
        )

    async def get_user_scores(self, user_id: str, days: int = 7, utc_today: Optional[str] = None) -> List[Dict]:
        """
        Get user's emotion scores for the last N days.

        Args:
            user_id: User identifier
            days: Number of days to fetch (default 7)
            utc_today: Today's date in UTC (YYYY-MM-DD). If None, uses current UTC date.

        Returns:
            List of daily emotion scores, sorted by utc_date ascending
        """
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        # Calculate date range based on UTC today
        if utc_today:
            end_date = utc_today
            year, month, day = map(int, utc_today.split("-"))
            start = datetime(year, month, day, tzinfo=timezone.utc) - timedelta(days=days - 1)
            start_date = start.strftime("%Y-%m-%d")
        else:
            utc_now = datetime.now(timezone.utc)
            end_date = utc_now.strftime("%Y-%m-%d")
            start_date = (utc_now - timedelta(days=days - 1)).strftime("%Y-%m-%d")

        # Query using utc_date field, with fallback to old "date" field for backwards compatibility
        cursor = self.collection.find({
            "user_id": user_oid,
            "$or": [
                {"utc_date": {"$gte": start_date, "$lte": end_date}},
                {"date": {"$gte": start_date, "$lte": end_date}, "utc_date": {"$exists": False}}
            ]
        }).sort([("utc_date", 1), ("date", 1)])

        scores = await cursor.to_list(length=days)
        return [self._score_to_dict(s) for s in scores]

    async def upsert_today_score(
        self,
        user_id: str,
        avg_score: float,
        dominant_emotion: str,
        interaction_count: int,
        utc_date: Optional[str] = None
    ) -> Dict:
        """
        Update or insert today's emotion score.
        Only today's score can be updated; past scores are locked.

        Args:
            user_id: User identifier
            avg_score: Average sentiment score (-1 to 1)
            dominant_emotion: Most frequent emotion for the day
            interaction_count: Number of chat interactions analyzed
            utc_date: Today's date in UTC (YYYY-MM-DD). If None, uses current UTC date.

        Returns:
            The updated/inserted document
        """
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        if not utc_date:
            utc_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        utc_now = datetime.now(timezone.utc)

        result = await self.collection.find_one_and_update(
            {"user_id": user_oid, "utc_date": utc_date},
            {
                "$set": {
                    "avg_score": round(avg_score, 3),
                    "dominant_emotion": dominant_emotion.lower(),
                    "interaction_count": interaction_count,
                    "locked": False,
                    "updated_at": utc_now
                },
                "$setOnInsert": {
                    "user_id": user_oid,
                    "utc_date": utc_date,
                    "created_at": utc_now
                }
            },
            upsert=True,
            return_document=True
        )
        return self._score_to_dict(result)

    async def lock_past_scores(self, user_id: str, utc_today: Optional[str] = None) -> int:
        """
        Lock all past (non-today) scores for a user.
        Locked scores cannot be modified.

        Args:
            user_id: User identifier
            utc_today: Today's date in UTC (YYYY-MM-DD). If None, uses current UTC date.

        Returns:
            Number of documents locked
        """
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        if not utc_today:
            utc_today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Lock scores with utc_date < today, or old "date" field for backwards compatibility
        result = await self.collection.update_many(
            {
                "user_id": user_oid,
                "locked": {"$ne": True},
                "$or": [
                    {"utc_date": {"$lt": utc_today}},
                    {"date": {"$lt": utc_today}, "utc_date": {"$exists": False}}
                ]
            },
            {"$set": {"locked": True}}
        )
        return result.modified_count

    async def get_today_score(self, user_id: str, utc_today: Optional[str] = None) -> Optional[Dict]:
        """
        Get today's emotion score for a user.

        Args:
            user_id: User identifier
            utc_today: Today's date in UTC (YYYY-MM-DD). If None, uses current UTC date.

        Returns:
            Today's score document or None if not exists
        """
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        if not utc_today:
            utc_today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Query with utc_date, fallback to old "date" field
        score = await self.collection.find_one({
            "user_id": user_oid,
            "$or": [
                {"utc_date": utc_today},
                {"date": utc_today, "utc_date": {"$exists": False}}
            ]
        })
        return self._score_to_dict(score) if score else None

    async def bulk_insert_scores(self, user_id: str, scores: List[Dict], utc_today: Optional[str] = None) -> int:
        """
        Bulk insert historical scores (used for data migration).
        Only inserts if the score doesn't already exist.

        Args:
            user_id: User identifier
            scores: List of score dicts with date/utc_date, avg_score, dominant_emotion, interaction_count
            utc_today: Today's date in UTC (YYYY-MM-DD). If None, uses current UTC date.

        Returns:
            Number of documents inserted
        """
        try:
            user_oid = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
        except:
            user_oid = user_id

        if not utc_today:
            utc_today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        inserted = 0
        utc_now = datetime.now(timezone.utc)

        for score in scores:
            # Support both old "date" and new "utc_date" field names
            date_str = (score.get("utc_date") or score.get("date", "")).split("T")[0]
            if not date_str:
                continue

            # Skip if already exists (check both field names)
            existing = await self.collection.find_one({
                "user_id": user_oid,
                "$or": [
                    {"utc_date": date_str},
                    {"date": date_str, "utc_date": {"$exists": False}}
                ]
            })
            if existing:
                continue

            # Insert with locked=True for past dates
            is_locked = date_str < utc_today

            await self.collection.insert_one({
                "user_id": user_oid,
                "utc_date": date_str,
                "avg_score": round(score.get("avg_score", 0.0), 3),
                "dominant_emotion": score.get("dominant_emotion", "neutral").lower(),
                "interaction_count": score.get("interaction_count", 0),
                "locked": is_locked,
                "created_at": utc_now,
                "updated_at": utc_now
            })
            inserted += 1

        return inserted
