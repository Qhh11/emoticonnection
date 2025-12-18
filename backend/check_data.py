import sys
import asyncio
import json
from datetime import datetime
from pathlib import Path

# Add project root to path for imports
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent  # /Users/kaikai/emoticonnection
sys.path.insert(0, str(project_root))

from database.config.mongodb_config import get_database, connect_to_mongodb, close_mongodb_connection

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, '__str__'):
        return str(obj)
    return str(obj)

async def check_data():
    try:
        print("🔌 Connecting to database...")
        await connect_to_mongodb()
        db = get_database()
        
        print(f"✅ Connected to: {db.name}")
        
        collections = await db.list_collection_names()
        print(f"\n📂 Found Collections: {collections}")
        
        for col_name in collections:
            print(f"\n" + "="*40)
            print(f"📄 Collection: {col_name}")
            print("="*40)
            
            # Get last 5 documents
            cursor = db[col_name].find().sort("_id", -1).limit(5)
            documents = await cursor.to_list(length=5)
            
            if not documents:
                print("(No data found)")
            else:
                for doc in documents:
                    print(json.dumps(doc, indent=2, default=json_serial, ensure_ascii=False))
                    print("-" * 20)
                    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await close_mongodb_connection()

if __name__ == "__main__":
    asyncio.run(check_data())
