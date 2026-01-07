"""
打卡记录 CRUD 操作 (Check-in CRUD Operations)
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from bson import ObjectId

try:
    from database.config.mongodb_config import get_sync_database
except ImportError:
    from config.mongodb_config import get_sync_database


db = get_sync_database()
check_ins = db.check_ins
users = db.users


def create_check_in(user_id: str, mood: str, check_date: str) -> Dict[str, Any]:
    """
    创建打卡记录并更新用户积分

    :param user_id: 用户ID
    :param mood: 情绪
    :param check_date: 打卡日期 (YYYY-MM-DD)
    :return: 打卡记录
    """
    # 检查今天是否已经打卡
    existing = get_check_in_by_date(user_id, check_date)
    if existing:
        return {
            "success": False,
            "message": "今天已经打卡过了",
            "check_in": existing
        }

    # 创建打卡记录
    check_in_doc = {
        "user_id": user_id,
        "date": check_date,
        "mood": mood,
        "points_earned": 10,
        "created_at": datetime.utcnow()
    }

    result = check_ins.insert_one(check_in_doc)
    check_in_doc["_id"] = str(result.inserted_id)

    # 更新用户积分
    add_points_to_user(user_id, 10)

    return {
        "success": True,
        "message": "打卡成功！获得10积分",
        "check_in": check_in_doc
    }


def get_check_in_by_date(user_id: str, check_date: str) -> Optional[Dict[str, Any]]:
    """
    获取指定日期的打卡记录

    :param user_id: 用户ID
    :param check_date: 日期 (YYYY-MM-DD)
    :return: 打卡记录 或 None
    """
    doc = check_ins.find_one({
        "user_id": user_id,
        "date": check_date
    })

    if doc:
        doc["_id"] = str(doc["_id"])

    return doc


def get_check_in_history(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    获取用户打卡历史

    :param user_id: 用户ID
    :param limit: 返回数量限制
    :return: 打卡记录列表
    """
    cursor = check_ins.find(
        {"user_id": user_id}
    ).sort("date", -1).limit(limit)

    results = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)

    return results


def add_points_to_user(user_id: str, points: int) -> bool:
    """
    增加用户积分

    :param user_id: 用户ID
    :param points: 增加的积分
    :return: 是否成功
    """
    try:
        obj_id = ObjectId(user_id)
    except:
        return False

    result = users.update_one(
        {"_id": obj_id},
        {"$inc": {"points": points}}
    )

    # 检查是否需要升级
    user = users.find_one({"_id": obj_id})
    if user:
        update_user_level(user_id, user.get("points", 0))

    return result.modified_count > 0


def update_user_level(user_id: str, total_points: int) -> bool:
    """
    根据积分更新用户等级
    等级规则:
    - Level 1: 0-99
    - Level 2: 100-299
    - Level 3: 300-599
    - Level 4: 600-999
    - Level 5: 1000+

    :param user_id: 用户ID
    :param total_points: 总积分
    :return: 是否成功
    """
    if total_points >= 1000:
        level = 5
    elif total_points >= 600:
        level = 4
    elif total_points >= 300:
        level = 3
    elif total_points >= 100:
        level = 2
    else:
        level = 1

    try:
        obj_id = ObjectId(user_id)
    except:
        return False

    result = users.update_one(
        {"_id": obj_id},
        {"$set": {"level": level}}
    )

    return result.modified_count > 0


def get_user_points(user_id: str) -> Dict[str, Any]:
    """
    获取用户积分和等级

    :param user_id: 用户ID
    :return: 积分和等级
    """
    try:
        obj_id = ObjectId(user_id)
    except:
        return {"points": 0, "level": 1}

    user = users.find_one({"_id": obj_id}, {"points": 1, "level": 1})

    if not user:
        return {"points": 0, "level": 1}

    return {
        "points": user.get("points", 0),
        "level": user.get("level", 1)
    }
