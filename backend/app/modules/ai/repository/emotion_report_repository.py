"""
Emotion Report Repository - Stores complete emotion reports (daily/weekly/monthly)

All dates are stored and processed in UTC for consistency across timezones.
Reports are generated once per day (for yesterday's data) and then cached permanently.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List, Literal
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class EmotionReportRepository:
    """
    Repository for Emotion Report operations.

    This collection stores complete emotion reports that are:
    - Generated from user's chat conversations via GenAI
    - Stored with UTC dates (report_date field)
    - Locked after generation (reports are immutable)
    - Used for consistent display across all devices
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.emotion_reports

    def _to_object_id(self, user_id: str) -> ObjectId:
        """
        统一将 user_id 转换为 ObjectId，确保类型一致性。
        这可以避免同一用户因 user_id 类型不同而产生重复记录。
        """
        if isinstance(user_id, ObjectId):
            return user_id
        if ObjectId.is_valid(user_id):
            return ObjectId(user_id)
        raise ValueError(f"Invalid user_id format: {user_id}")

    def _report_to_dict(self, report: Dict) -> Optional[Dict]:
        """Convert MongoDB document to API response format"""
        if not report:
            return None
        return {
            "id": str(report["_id"]),
            "user_id": str(report["user_id"]),
            "report_type": report.get("report_type"),
            "report_date": report.get("report_date"),
            "report_data": report.get("report_data"),
            "locked": report.get("locked", True),
            "created_at": report.get("created_at"),
        }

    async def ensure_indexes(self):
        """Create necessary indexes for the collection"""
        # Unique compound index on user_id, report_type, and report_date
        await self.collection.create_index(
            [("user_id", 1), ("report_type", 1), ("report_date", 1)],
            unique=True,
            name="user_type_date_unique"
        )
        # Index for querying by user_id with type and date range
        await self.collection.create_index(
            [("user_id", 1), ("report_type", 1), ("report_date", -1)],
            name="user_type_date_desc"
        )

    async def get_report(
        self,
        user_id: str,
        report_type: Literal["daily", "weekly", "monthly"],
        report_date: str
    ) -> Optional[Dict]:
        """
        Get a specific report for a user.

        Args:
            user_id: User identifier
            report_type: Type of report (daily, weekly, monthly)
            report_date: Report date in UTC (YYYY-MM-DD)

        Returns:
            Report document or None if not exists
        """
        user_oid = self._to_object_id(user_id)

        report = await self.collection.find_one({
            "user_id": user_oid,
            "report_type": report_type,
            "report_date": report_date
        })
        return self._report_to_dict(report)

    async def save_report(
        self,
        user_id: str,
        report_type: Literal["daily", "weekly", "monthly"],
        report_date: str,
        report_data: Dict
    ) -> Dict:
        """
        Save a new report. If report already exists, return existing one.

        Args:
            user_id: User identifier
            report_type: Type of report (daily, weekly, monthly)
            report_date: Report date in UTC (YYYY-MM-DD)
            report_data: Complete report data (EmotionReport JSON)

        Returns:
            The saved/existing document
        """
        user_oid = self._to_object_id(user_id)

        utc_now = datetime.now(timezone.utc)

        # Use upsert to avoid duplicates
        result = await self.collection.find_one_and_update(
            {
                "user_id": user_oid,
                "report_type": report_type,
                "report_date": report_date
            },
            {
                "$setOnInsert": {
                    "user_id": user_oid,
                    "report_type": report_type,
                    "report_date": report_date,
                    "report_data": report_data,
                    "locked": True,
                    "created_at": utc_now
                }
            },
            upsert=True,
            return_document=True
        )
        return self._report_to_dict(result)

    async def get_user_reports(
        self,
        user_id: str,
        report_type: Literal["daily", "weekly", "monthly"],
        days: int = 7
    ) -> List[Dict]:
        """
        Get user's reports for the last N days.

        Args:
            user_id: User identifier
            report_type: Type of report (daily, weekly, monthly)
            days: Number of days to fetch (default 7)

        Returns:
            List of reports, sorted by report_date descending
        """
        user_oid = self._to_object_id(user_id)

        # Calculate date range
        utc_now = datetime.now(timezone.utc)
        start_date = (utc_now - timedelta(days=days)).strftime("%Y-%m-%d")

        cursor = self.collection.find({
            "user_id": user_oid,
            "report_type": report_type,
            "report_date": {"$gte": start_date}
        }).sort("report_date", -1)

        reports = await cursor.to_list(length=days)
        return [self._report_to_dict(r) for r in reports]

    async def report_exists(
        self,
        user_id: str,
        report_type: Literal["daily", "weekly", "monthly"],
        report_date: str
    ) -> bool:
        """
        Check if a report exists for a specific date.

        Args:
            user_id: User identifier
            report_type: Type of report (daily, weekly, monthly)
            report_date: Report date in UTC (YYYY-MM-DD)

        Returns:
            True if report exists, False otherwise
        """
        user_oid = self._to_object_id(user_id)

        count = await self.collection.count_documents({
            "user_id": user_oid,
            "report_type": report_type,
            "report_date": report_date
        })
        return count > 0

    async def cleanup_duplicates(self) -> Dict:
        """
        清理重复的报告记录。

        由于之前 user_id 类型不一致（有时是 ObjectId，有时是字符串），
        可能导致同一用户同一天有多条记录。此方法会：
        1. 将字符串类型的 user_id 转换为 ObjectId
        2. 删除同一 (user_id, report_type, report_date) 的重复记录（保留第一条）

        Returns:
            清理统计信息
        """
        stats = {"converted": 0, "string_duplicates_removed": 0, "same_key_duplicates_removed": 0}

        # 1. 处理字符串类型的 user_id
        cursor = self.collection.find({"user_id": {"$type": "string"}})
        string_records = await cursor.to_list(length=None)

        for record in string_records:
            user_id_str = record["user_id"]
            if ObjectId.is_valid(user_id_str):
                user_oid = ObjectId(user_id_str)

                # 检查是否已存在 ObjectId 版本的记录
                existing = await self.collection.find_one({
                    "user_id": user_oid,
                    "report_type": record["report_type"],
                    "report_date": record["report_date"]
                })

                if existing:
                    # 已存在，删除字符串版本
                    await self.collection.delete_one({"_id": record["_id"]})
                    stats["string_duplicates_removed"] += 1
                else:
                    # 不存在，更新为 ObjectId
                    await self.collection.update_one(
                        {"_id": record["_id"]},
                        {"$set": {"user_id": user_oid}}
                    )
                    stats["converted"] += 1

        # 2. 清理同一 (user_id, report_type, report_date) 的重复记录
        # 使用聚合找出有重复的组合
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "user_id": "$user_id",
                        "report_type": "$report_type",
                        "report_date": "$report_date"
                    },
                    "count": {"$sum": 1},
                    "docs": {"$push": "$_id"}
                }
            },
            {
                "$match": {"count": {"$gt": 1}}
            }
        ]

        duplicates = await self.collection.aggregate(pipeline).to_list(length=None)

        for dup in duplicates:
            # 保留第一个，删除其余的
            doc_ids = dup["docs"]
            ids_to_delete = doc_ids[1:]  # 跳过第一个
            if ids_to_delete:
                result = await self.collection.delete_many({"_id": {"$in": ids_to_delete}})
                stats["same_key_duplicates_removed"] += result.deleted_count

        return stats

    async def drop_old_cache_collection(self) -> bool:
        """
        删除旧的 report_cache collection（如果存在）。

        Returns:
            True if dropped, False if not exists
        """
        collections = await self.db.list_collection_names()
        if "report_cache" in collections:
            await self.db.drop_collection("report_cache")
            return True
        return False
