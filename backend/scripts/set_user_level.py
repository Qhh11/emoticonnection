import sys
import os
from pathlib import Path

# Add project root to sys.path to import database modules
# Assuming this script is in backend/scripts/
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Force database folder to be in path as well if needed
sys.path.insert(0, str(project_root / "database"))

from database.config.mongodb_config import get_sync_database

def update_user_level(username, target_level):
    db = get_sync_database()
    users_collection = db["users"]
    
    # Check if user exists
    user = users_collection.find_one({"username": username})
    if not user:
        print(f"User {username} not found.")
        return

    # Update level
    result = users_collection.update_one(
        {"username": username},
        {"$set": {"level": target_level}}
    )
    
    if result.modified_count > 0:
        print(f"Successfully updated {username} to level {target_level}.")
    else:
        print(f"User {username} is already at level {target_level} or update failed.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Update user level in MongoDB.")
    parser.add_argument("username", help="The username to update")
    parser.add_argument("level", type=int, help="The target level")
    args = parser.parse_args()
    
    update_user_level(args.username, args.level)
