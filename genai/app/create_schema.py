import os
import sys
from dotenv import load_dotenv
import weaviate.classes.config as wc

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

print(f"Loading .env file: {env_path}")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    print("❌ Error: .env file not found in the current directory!")
    exit(1)

parent_dir = os.path.dirname(current_dir) # Get genai directory
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

try:
    from app.weaviate_client import WeaviateManager
except ImportError:
    try:
        from weaviate_client import WeaviateManager
    except ImportError as e:
        print(f"❌ Import error: Could not find WeaviateManager. Please ensure the weaviate_client.py file exists.\nDetails: {e}")
        exit(1)

def create_schema():
    print("Connecting to Weaviate...")
    
    manager = WeaviateManager()
    
    # Check connection
    if not manager.client:
        print("❌ Initialization failed: Unable to connect to Weaviate client.")
        return
        
    if not manager.client.is_connected():
        print("❌ Connection failed: Weaviate client is not connected. Please check the URL and Key in the .env file.")
        return

    client = manager.client
    
    # --- Create Conversations Collection ---
    collection_name = "Conversations"

    if client.collections.exists(collection_name):
        print(f"Collection '{collection_name}' already exists, deleting old collection...")
        client.collections.delete(collection_name)

    print(f"Creating new collection '{collection_name}'...")
    try:
        client.collections.create(
            name=collection_name,
            properties=[
                # userId1: First user in conversation, not vectorized, used for exact filtering
                wc.Property(name="userId1", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # userId2: Second user in conversation, not vectorized, used for exact filtering
                wc.Property(name="userId2", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # timestamp: Date type, used for time range filtering
                wc.Property(name="timestamp", data_type=wc.DataType.DATE, skip_vectorization=True),
                
                # userQuery: User's spoken words (main search content)
                wc.Property(name="userQuery", data_type=wc.DataType.TEXT),
                
                # llmResponse: AI's spoken words
                wc.Property(name="llmResponse", data_type=wc.DataType.TEXT),
                
                # sentiment: Sentiment label
                wc.Property(name="sentimentAnalysis", data_type=wc.DataType.TEXT, skip_vectorization=True),
            ]
        )
        print(f"✅ Success! Database table '{collection_name}' created.")
    except Exception as e:
        print(f"❌ Error occurred during creation: {e}")
    
    # --- Create AIConversations Collection ---
    ai_collection_name = "AIConversations"
    
    if client.collections.exists(ai_collection_name):
        print(f"Collection '{ai_collection_name}' already exists, deleting old collection...")
        client.collections.delete(ai_collection_name)

    print(f"Creating new collection '{ai_collection_name}'...")
    try:
        client.collections.create(
            name=ai_collection_name,
            properties=[
                # userId: User ID, not vectorized, used for exact filtering
                wc.Property(name="userId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # timestamp: Date type, used for time range filtering
                wc.Property(name="timestamp", data_type=wc.DataType.DATE, skip_vectorization=True),
                
                # aiResponse: AI-generated response content
                wc.Property(name="aiResponse", data_type=wc.DataType.TEXT),
                
                # confidenceScore: Confidence score for the AI response
                wc.Property(name="confidenceScore", data_type=wc.DataType.NUMBER, skip_vectorization=True),
            ]
        )
        print(f"✅ Success! Database table '{ai_collection_name}' created.")
    except Exception as e:
        print(f"❌ Error occurred during creation: {e}")
    
    finally:
        manager.close()


if __name__ == "__main__":
    create_schema()