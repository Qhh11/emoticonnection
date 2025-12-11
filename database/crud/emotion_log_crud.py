"""
Emotion Log & Analytics CRUD
Collections:
- emotion_logs
- emotion_analytics
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from config.mongodb_config import get_sync_database
from models.emotion_log import EmotionLog, EmotionAnalytics


db = get_sync_database()
emotion_logs = db.emotion_logs
emotion_analytics = db.emotion_analytics


# ============================================================
# Utility
# ============================================================

def to_obj_id(value: str):
    if value is None:
        return None
    return ObjectId(value) if ObjectId.is_valid(value) else value


# Allowed update fields
LOG_FIELDS = set(EmotionLog.model_fields.keys()) - {"id"}
ANALYTICS_FIELDS = set(EmotionAnalytics.model_fields.keys()) - {"id"}


# ============================================================
# Emotion Log CRUD
# ============================================================

def create_emotion_log(log: EmotionLog) -> str:
    doc = log.dict(by_alias=True, exclude={"id"})
    doc["_id"] = ObjectId()
    doc["recorded_at"] = doc.get("recorded_at", datetime.utcnow())

    emotion_logs.insert_one(doc)
    return str(doc["_id"])


def get_emotion_log(log_id: str) -> Optional[Dict]:
    oid = to_obj_id(log_id)
    doc = emotion_logs.find_one({"_id": oid})
    if not doc:
        return None

    doc["id"] = str(doc["_id"])
    return doc


def get_logs_by_user(
    user_id: str,
    limit: int = 50,
    emotion: Optional[str] = None
) -> List[Dict]:
    query = {"user_id": user_id}

    if emotion:
        query["primary_emotion"] = emotion

    cursor = emotion_logs.find(query).sort("recorded_at", -1).limit(limit)
    results = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        results.append(doc)

    return results


def update_emotion_log(log_id: str, updates: Dict[str, Any]) -> bool:
    # Validate fields
    for key in updates:
        if key not in LOG_FIELDS:
            raise ValueError(f"Invalid field '{key}' for EmotionLog")

    oid = to_obj_id(log_id)

    # Remove None values
    updates = {k: v for k, v in updates.items() if v is not None}

    result = emotion_logs.update_one(
        {"_id": oid},
        {"$set": updates}
    )
    return result.modified_count > 0


def delete_emotion_log(log_id: str) -> bool:
    oid = to_obj_id(log_id)
    result = emotion_logs.delete_one({"_id": oid})
    return result.deleted_count > 0


# ============================================================
# Emotion Analytics CRUD
# ============================================================

def create_analytics(report: EmotionAnalytics) -> str:
    doc = report.dict(by_alias=True, exclude={"id"})
    doc["_id"] = ObjectId()
    doc["generated_at"] = datetime.utcnow()

    emotion_analytics.insert_one(doc)
    return str(doc["_id"])


def get_analytics(report_id: str) -> Optional[Dict]:
    oid = to_obj_id(report_id)
    doc = emotion_analytics.find_one({"_id": oid})
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    return doc


def get_user_analytics(user_id: str, period_type: Optional[str] = None) -> List[Dict]:
    query = {"user_id": user_id}
    if period_type:
        query["period_type"] = period_type

    cursor = emotion_analytics.find(query).sort("generated_at", -1)
    results = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        results.append(doc)

    return results


def delete_analytics(report_id: str) -> bool:
    oid = to_obj_id(report_id)
    result = emotion_analytics.delete_one({"_id": oid})
    return result.deleted_count > 0
