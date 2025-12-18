
import sys
from pathlib import Path

# Simulate main.py setup
database_path = Path(__file__).resolve().parent.parent.parent / "database"
# Actually main.py is in backend/app.
# check_imports.py will be in backend.
# database is in emoticonnection/database.
# backend is emoticonnection/backend.
# So from backend folder: parent is emoticonnection. database is sibling.
database_path = Path(".").resolve().parent / "database"

print(f"Adding to sys.path: {database_path}")
sys.path.insert(0, str(database_path))

try:
    print("Attempting: from crud.user_crud import authenticate_user")
    from crud.user_crud import authenticate_user
    print("✅ Success!")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()

print("\n--- Listing database dir ---")
import os
try:
    print(os.listdir(str(database_path)))
    print("--- Listing crud dir ---")
    print(os.listdir(str(database_path / "crud")))
except:
    pass
