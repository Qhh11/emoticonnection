from models.user import User
from passlib.context import CryptContext
from config.mongodb_config import get_sync_database

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_user(username: str, password: str, email: str=None):
    db = get_sync_database()
    users = db.users

    username = username
    password = password
    email = email

    # 1. 检查是否存在
    if users.find_one({"username": username}):
        print("User already exists")
        return

    hashed_pw = pwd_context.hash(password)

    # 2. 构造模型
    new_user = User(
        username=username,
        hashed_password=hashed_pw,
        nickname="Administrator",
        email=email
    )

    # 3. 插入
    result = users.insert_one(new_user.dict(by_alias=True))
    print("Inserted user:", result.inserted_id)

if __name__ == "__main__":
    create_user("example", "123456", "example@example.com")