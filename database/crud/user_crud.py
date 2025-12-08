import bcrypt
from bson import ObjectId
from typing import Optional
from config.mongodb_config import get_sync_database  # :contentReference[oaicite:2]{index=2}
from models.user import User  # 你的用户模型 :contentReference[oaicite:3]{index=3}


db = get_sync_database()
users = db.users


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
def create_user(user_data: User) -> str:
    """写入 MongoDB，一个新的用户"""
    if users.find_one({"username": user_data.username}):
        print("User already exists")
        return

    user_dict = user_data.dict(by_alias=True, exclude={"id"})  
    result = users.insert_one(user_dict)
    return str(result.inserted_id)

def create_user_with_password(username: str, password: str, email: Optional[str]=None, nickname: Optional[str]="") -> str:
    hashed_pw = hash_password(password)
    user = User(
        username=username,
        hashed_password=hashed_pw,
        email=email,
        nickname=nickname
    )
    return create_user(user)


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