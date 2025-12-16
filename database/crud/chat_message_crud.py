from bson import ObjectId
from typing import Dict, Any, Optional, List
from config.mongodb_config import get_sync_database
from models.chat import ChatMessage

db = get_sync_database()
chat_messages = db.chat_messages


def create_message(message: ChatMessage) -> str:
    """创建聊天消息"""
    doc = message.dict(by_alias=True, exclude={"id"})
    result = chat_messages.insert_one(doc)
    return str(result.inserted_id)


def get_messages_by_session(session_id: str, limit: int = 100) -> List[dict]:
    """按会话 ID 获取消息记录"""
    try:
        sess_oid = ObjectId(session_id)
    except:
        raise ValueError("Invalid session_id format")

    cursor = chat_messages.find({"session_id": session_id}).sort("created_at", 1).limit(limit)

    result = []
    for msg in cursor:
        msg["_id"] = str(msg["_id"])
        result.append(msg)

    return result


def soft_delete_message(message_id: str) -> bool:
    """软删除消息（保留记录但标记删除）"""
    try:
        msg_oid = ObjectId(message_id)
    except:
        raise ValueError("Invalid message_id format")

    result = chat_messages.update_one({"_id": msg_oid}, {"$set": {"is_deleted": True}})
    return result.modified_count > 0


def delete_message(message_id: str) -> bool:
    """真删除"""
    try:
        msg_oid = ObjectId(message_id)
    except:
        raise ValueError("Invalid message_id format")

    result = chat_messages.delete_one({"_id": msg_oid})
    return result.deleted_count > 0
