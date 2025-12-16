import bcrypt
from typing import Optional, Dict, Any
from bson import ObjectId
try:
    from database.config.mongodb_config import get_sync_database
    from database.models.user import User
except ImportError:  # pragma: no cover
    from config.mongodb_config import get_sync_database
    from models.user import User


db = get_sync_database()
users = db.users
VALID_FIELDS = set(User.model_fields.keys()) - {"id"}

# -------------------------
# 工具函数：哈希密码
# -------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


# -------------------------
# 工具函数：验证密码
# -------------------------
def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# -------------------------
# 数据库插入：注册用户
# -------------------------
def create_user(user_data: User) -> Optional[str]:
    """写入 MongoDB，一个新的用户"""
    if users.find_one({"username": user_data.username}):
        print("User already exists")
        return None

    user_dict = user_data.dict(by_alias=True, exclude={"id"})  
    result = users.insert_one(user_dict)
    return str(result.inserted_id)

def create_user_with_password(
    username: str,
    password: str,
    email: Optional[str] = None,
    nickname: Optional[str] = "",
) -> Optional[str]:
    hashed_pw = hash_password(password)
    if nickname == "":
        nickname = username
    user = User(
        username=username,
        hashed_password=hashed_pw,
        email=email,
        nickname=nickname
    )
    return create_user(user)

def update_user(user_id: str, updates: Dict[str, Any]) -> bool:
    """
    更新用户部分字段。
    :param user_id: 用户的 MongoDB _id（字符串）
    :param updates: 要更新的字段 dict，例如：
        {
            "nickname": "new name",
            "preferences": {"theme": "dark"},
            "mbti": {"type": "INTJ"}
        }
    :return: 是否成功更新（True/False）
    """

    # 1. 转换 user_id 为 ObjectId
    try:
        obj_id = ObjectId(user_id)
    except:
        raise ValueError("Invalid user_id format")
    
    # 2. 验证更新字段是否合法
    for key in updates.keys():
        if key not in VALID_FIELDS:
            raise ValueError(f"Invalid field '{key}' — not allowed to update")

    # 3. 处理嵌套字典（展开成 MongoDB 支持的 dot-notation）
    #    例如 {"preferences": {"theme": "dark"}} →
    #         {"preferences.theme": "dark"}
    def flatten_dict(prefix, value, out_dict):
        if isinstance(value, dict):
            for k, v in value.items():
                flatten_dict(f"{prefix}.{k}", v, out_dict)
        else:
            out_dict[prefix] = value

    update_doc = {}
    for k, v in updates.items():
        if isinstance(v, dict):
            flatten_dict(k, v, update_doc)
        else:
            update_doc[k] = v

    # 4. 过滤掉 None（除非你想要覆盖成 None）
    update_doc = {k: v for k, v in update_doc.items() if v is not None}

    if not update_doc:
        return False  # 没有有效更新

    # 5. 执行 MongoDB 更新
    result = users.update_one(
        {"_id": obj_id},
        {"$set": update_doc}
    )

    return result.modified_count > 0

def update_user_password(user_id: str, new_password: str) -> bool:
    """更新用户密码"""
    hashed_pw = hash_password(new_password)
    return update_user(user_id, {"hashed_password": hashed_pw})

# -------------------------
# 数据库查询：按 username 查用户
# -------------------------
def get_user_by_username(username: str) -> Optional[dict]:
    return users.find_one({"username": username})


# -------------------------
# 数据库查询：按 email 查用户
# -------------------------
def get_user_by_email(email: str) -> Optional[dict]:
    return users.find_one({"email": email})


# -------------------------
# 登录逻辑（数据库层）
# -------------------------
def authenticate_user(username: str, password: str) -> Optional[dict]:
    """返回 user 文档 或 None"""
    
    user = get_user_by_username(username)
    if user is None:
        print("User not found")
        return None
    
    # 校验密码
    stored_hash = user["hashed_password"]
    if not verify_password(password, stored_hash):
        print("Incorrect password")
        return None

    print("User authenticated successfully")
    return user  # 登录成功，返回用户文档