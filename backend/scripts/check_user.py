import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "database"))

from database.config.mongodb_config import get_sync_database

def check_user(username):
    db = get_sync_database()
    user = db["users"].find_one({"username": username})
    if user:
        print(f"User found: {username}")
        for key, value in user.items():
            print(f"  {key}: {value}")
    else:
        print(f"User {username} not found.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("username")
    args = parser.parse_args()
    check_user(args.username)
