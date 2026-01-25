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
                
                # sessionId: AI chat session ID, used for grouping conversations
                wc.Property(name="sessionId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # isNewSession: Whether this is the first message in a new session
                wc.Property(name="isNewSession", data_type=wc.DataType.BOOL, skip_vectorization=True),
                
                # timestamp: Date type, used for time range filtering
                wc.Property(name="timestamp", data_type=wc.DataType.DATE, skip_vectorization=True),
                
                # userQuery: User's message/query to AI
                wc.Property(name="userQuery", data_type=wc.DataType.TEXT),
                
                # aiResponse: AI-generated response content
                wc.Property(name="aiResponse", data_type=wc.DataType.TEXT),
                
                # confidenceScore: Confidence score for the AI response
                wc.Property(name="confidenceScore", data_type=wc.DataType.NUMBER, skip_vectorization=True),
            ]
        )
        print(f"✅ Success! Database table '{ai_collection_name}' created.")
    except Exception as e:
        print(f"❌ Error occurred during creation: {e}")
    
    # --- Create UserPosts Collection ---
    posts_collection_name = "UserPosts"
    
    if client.collections.exists(posts_collection_name):
        print(f"Collection '{posts_collection_name}' already exists, deleting old collection...")
        client.collections.delete(posts_collection_name)

    print(f"Creating new collection '{posts_collection_name}'...")
    try:
        client.collections.create(
            name=posts_collection_name,
            properties=[
                # userId: User ID who created the post, not vectorized, used for exact filtering
                wc.Property(name="userId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # postId: MongoDB post ID reference
                wc.Property(name="postId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # timestamp: Date type, used for time range filtering
                wc.Property(name="timestamp", data_type=wc.DataType.DATE, skip_vectorization=True),
                
                # content: Post content (main vectorized content for semantic search)
                wc.Property(name="content", data_type=wc.DataType.TEXT),
                
                # emotion: User-selected emotion or AI-detected emotion
                wc.Property(name="emotion", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # aiEmotion: AI-analyzed emotion from content (optional)
                wc.Property(name="aiEmotion", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # tags: Array of tags for filtering
                wc.Property(name="tags", data_type=wc.DataType.TEXT_ARRAY, skip_vectorization=True),
            ]
        )
        print(f"✅ Success! Database table '{posts_collection_name}' created.")
    except Exception as e:
        print(f"❌ Error occurred during creation: {e}")
    
    # --- Create ChatEmotions Collection ---
    chat_emotions_collection = "ChatEmotions"
    
    if client.collections.exists(chat_emotions_collection):
        print(f"Collection '{chat_emotions_collection}' already exists, deleting old collection...")
        client.collections.delete(chat_emotions_collection)

    print(f"Creating new collection '{chat_emotions_collection}'...")
    try:
        client.collections.create(
            name=chat_emotions_collection,
            properties=[
                # userId: User ID who sent the message
                wc.Property(name="userId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # sessionId: Chat session/room ID
                wc.Property(name="sessionId", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # timestamp: Message timestamp
                wc.Property(name="timestamp", data_type=wc.DataType.DATE, skip_vectorization=True),
                
                # content: Message text content (vectorized for semantic search)
                wc.Property(name="content", data_type=wc.DataType.TEXT),
                
                # primaryEmotion: Primary emotion detected by AI (e.g., 'happiness')
                wc.Property(name="primaryEmotion", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # primaryEmotionScore: Percentage/confidence of primary emotion (e.g., 80)
                wc.Property(name="primaryEmotionScore", data_type=wc.DataType.NUMBER, skip_vectorization=True),
                
                # secondaryEmotion: Secondary emotion detected by AI (e.g., 'calm')
                wc.Property(name="secondaryEmotion", data_type=wc.DataType.TEXT, skip_vectorization=True),
                
                # secondaryEmotionScore: Percentage/confidence of secondary emotion (e.g., 20)
                wc.Property(name="secondaryEmotionScore", data_type=wc.DataType.NUMBER, skip_vectorization=True),
            ]
        )
        print(f"✅ Success! Database table '{chat_emotions_collection}' created.")
    except Exception as e:
        print(f"❌ Error occurred during creation: {e}")
    
    finally:
        manager.close()


if __name__ == "__main__":
    create_schema()