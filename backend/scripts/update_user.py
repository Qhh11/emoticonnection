import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "database"))

from database.config.mongodb_config import get_sync_database

def update_user(username, field, value):
    db = get_sync_database()
    result = db["users"].update_one(
        {"username": username},
        {"$set": {field: value}}
    )
    if result.modified_count > 0:
        print(f"Successfully updated {username} {field} to {value}.")
    else:
        print(f"No changes made to {username} {field}.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("username")
    parser.add_argument("field")
    parser.add_argument("value", type=int)
    args = parser.parse_args()
    update_user(args.username, args.field, args.value)
