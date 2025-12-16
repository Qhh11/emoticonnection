"""
Diary CRUD - Operations for emotion diary entries
Collection: diary_entries
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from config.mongodb_config import get_sync_database
from models.diary import DiaryEntry

db = get_sync_database()
diary_entries = db.diary_entries

# 获取 DiaryEntry 的字段，保证 update 时不允许新增字段
VALID_FIELDS = set(DiaryEntry.model_fields.keys()) - {"id"}


def to_obj_id(id: str):
    """Convert str → ObjectId safely"""
    if id is None:
        return None
    return ObjectId(id) if ObjectId.is_valid(id) else id


# ============================================================
# 📌 Create Diary Entry
# ============================================================

def create_entry(entry: DiaryEntry) -> str:
    """Insert a new diary entry into the database."""
    doc = entry.dict(by_alias=True, exclude={"id"})
    doc["_id"] = ObjectId()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = None
    doc["is_deleted"] = False

    diary_entries.insert_one(doc)
    return str(doc["_id"])


# ============================================================
# 📌 Get Single Diary Entry
# ============================================================

def get_entry_by_id(entry_id: str) -> Optional[Dict]:
    """Retrieve one diary entry."""
    oid = to_obj_id(entry_id)
    doc = diary_entries.find_one({"_id": oid, "is_deleted": False})
    if not doc:
        return None

    doc["id"] = str(doc["_id"])
    return doc


# ============================================================
# 📌 Get All Entries for a User (with pagination)
# ============================================================

def get_entries_by_user(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    emotion: Optional[str] = None,
    event_type: Optional[str] = None
) -> Dict:
    """
    Paginated user diary entries.
    Supports filtering by emotion or event_type.
    """
    query = {
        "user_id": user_id,
        "is_deleted": False
    }

    if emotion:
        query["emotion_tags.primary_emotion"] = emotion

    if event_type:
        query["emotion_tags.event_type"] = event_type

    skip = (page - 1) * page_size

    cursor = diary_entries.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    items = list(cursor)

    total = diary_entries.count_documents(query)

    for d in items:
        d["id"] = str(d["_id"])

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "entries": items,
        "has_more": skip + len(items) < total
    }


# ============================================================
# 📌 Update Diary Entry (strict mode)
# ============================================================

def update_entry(entry_id: str, updates: Dict[str, Any]) -> bool:
    """
    Strict update: does NOT allow new fields that are not part of DiaryEntry.
    Supports nested updates (emotion_tags.primary_emotion etc.)
    """
    # validate keys
    for field in updates.keys():
        if field not in VALID_FIELDS:
            raise ValueError(f"Invalid field '{field}' — cannot update field not in DiaryEntry model.")

    oid = to_obj_id(entry_id)

    # flatten nested fields
    def flatten(prefix, value, output):
        if isinstance(value, dict):
            for k, v in value.items():
                flatten(f"{prefix}.{k}", v, output)
        else:
            output[prefix] = value

    update_doc = {"updated_at": datetime.utcnow()}
    for k, v in updates.items():
        if isinstance(v, dict):
            flatten(k, v, update_doc)
        else:
            update_doc[k] = v

    # remove None values to avoid clearing fields accidentally
    update_doc = {k: v for k, v in update_doc.items() if v is not None}

    result = diary_entries.update_one({"_id": oid}, {"$set": update_doc})
    return result.modified_count > 0


# ============================================================
# 📌 Soft Delete Diary Entry
# ============================================================

def delete_entry(entry_id: str) -> bool:
    """Soft delete diary entry (set is_deleted=True)."""
    oid = to_obj_id(entry_id)
    result = diary_entries.update_one(
        {"_id": oid},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0


# ============================================================
# 📌 Search by Date Range
# ============================================================

def search_entries_by_date(
    user_id: str,
    start: datetime,
    end: datetime
) -> List[Dict]:
    """Return diary entries between date range."""
    query = {
        "user_id": user_id,
        "is_deleted": False,
        "created_at": {"$gte": start, "$lte": end}
    }

    docs = list(diary_entries.find(query).sort("created_at", -1))
    for d in docs:
        d["id"] = str(d["_id"])

    return docs
