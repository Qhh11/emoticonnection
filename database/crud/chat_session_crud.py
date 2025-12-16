from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, Optional
from config.mongodb_config import get_sync_database
from models.chat import ChatSession

db = get_sync_database()
chat_sessions = db.chat_sessions

# 允许更新的字段（来自 Pydantic 模型）
VALID_FIELDS = set(ChatSession.model_fields.keys()) - {"id"}  # id 不允许更新


def create_session(session: ChatSession) -> str:
    """创建新的聊天会话"""
    doc = session.dict(by_alias=True, exclude={"id"})
    result = chat_sessions.insert_one(doc)
    return str(result.inserted_id)


def get_session_by_id(session_id: str) -> Optional[dict]:
    try:
        obj_id = ObjectId(session_id)
    except:
        return None

    doc = chat_sessions.find_one({"_id": obj_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def update_session(session_id: str, updates: Dict[str, Any]) -> bool:
    """严格字段更新，只允许更新模型中存在的字段"""

    # 检查字段合法性
    for field in updates.keys():
        if field not in VALID_FIELDS:
            raise ValueError(f"Invalid field '{field}' for ChatSession update.")

    # string → ObjectId
    try:
        obj_id = ObjectId(session_id)
    except:
        raise ValueError("Invalid session_id format")

    # 展开嵌套字段
    def flatten(prefix, value, out):
        if isinstance(value, dict):
            for sub_key, sub_val in value.items():
                flatten(f"{prefix}.{sub_key}", sub_val, out)
        else:
            out[prefix] = value

    update_doc = {}
    for k, v in updates.items():
        if isinstance(v, dict):
            flatten(k, v, update_doc)
        else:
            update_doc[k] = v

    # 过滤 None（防止误清空字段）
    update_doc = {k: v for k, v in update_doc.items() if v is not None}

    result = chat_sessions.update_one({"_id": obj_id}, {"$set": update_doc})
    return result.modified_count > 0


def end_session(session_id: str) -> bool:
    """结束会话"""
    try:
        obj_id = ObjectId(session_id)
    except:
        return False

    result = chat_sessions.update_one(
        {"_id": obj_id},
        {"$set": {"status": "ended", "ended_at": datetime.utcnow()}}
    )

    return result.modified_count > 0


def delete_session(session_id: str) -> bool:
    try:
        obj_id = ObjectId(session_id)
    except:
        return False

    result = chat_sessions.delete_one({"_id": obj_id})
    return result.deleted_count > 0
