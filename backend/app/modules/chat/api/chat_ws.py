"""
WebSocket Chat Endpoint

This is the REAL-TIME chat implementation!
Users connect via WebSocket and messages are broadcasted instantly.

HOW IT WORKS:
1. User connects to ws://localhost:8000/ws/rooms/{room_id}
2. User sends JSON: {"sender_id": 1, "content": "Hello"}
3. Server broadcasts to all users in room
4. Both users receive the message in real-time!
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

from app.modules.chat.schemas.chat import MessageCreate, MessageOut
from app.modules.chat.services.ws_manager import ConnectionManager
from app.modules.chat.repository.chat_repository import ChatRepository
# Use unified database configuration
import sys
import os
from pathlib import Path
database_path = Path(__file__).resolve().parents[5] / "database"
sys.path.insert(0, str(database_path))
from config.mongodb_config import get_database  # type: ignore

# ============================================================================
# Initialize Router and ConnectionManager
# ============================================================================

router = APIRouter()

# Global ConnectionManager instance (shared across all WebSocket connections)
manager = ConnectionManager()


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@router.websocket("/ws/rooms/{room_id}")
async def websocket_chat_endpoint(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint for real-time chat

    ENDPOINT: WS /ws/rooms/123

    CONNECTION FLOW:
    1. Client connects → manager.connect()
    2. Client sends message → receive and broadcast
    3. Client disconnects → manager.disconnect()

    MESSAGE FORMAT (from client):
    Text message:
    {
        "sender_id": 1,
        "message_type": "text",
        "content": "Hello, how are you?"
    }

    Emoji message:
    {
        "sender_id": 1,
        "message_type": "emoji",
        "content": "😊"
    }

    Image/Video message:
    {
        "sender_id": 1,
        "message_type": "image",
        "content": "Check this out!",
        "media_url": "/static/uploads/abc123.jpg"
    }

    BROADCAST FORMAT (to all clients):
    {
        "id": 456,
        "room_id": 123,
        "sender_id": 1,
        "message_type": "text",
        "content": "Hello, how are you?",
        "media_url": null,
        "created_at": "2025-01-25T10:30:00Z"
    }

    ERROR HANDLING:
    - Invalid JSON → send error message back
    - Disconnection → clean up connection
    """

    # Convert room_id to string for ConnectionManager
    room_id_str = str(room_id)

    # ========================================================================
    # STEP 1: Accept WebSocket connection
    # ========================================================================
    await manager.connect(room_id_str, websocket)

    try:
        # ====================================================================
        # STEP 2: Message receiving loop
        # ====================================================================
        while True:
            # Wait for message from client
            data = await websocket.receive_text()

            try:
                # Parse JSON message
                message_dict = json.loads(data)

                # Validate using Pydantic model
                message_create: MessageCreate = MessageCreate(**message_dict)

                # ============================================================
                # STEP 2.4: AI Emotion Analysis (BEFORE saving message)
                # ============================================================
                # Analyze emotion first so it can be saved with the message
                emotion_result = None
                data_points = None
                if message_create.message_type.value == "text" and message_create.content:
                    try:
                        import importlib.util
                        from google import genai
                        
                        # 动态导入 genai/app 模块
                        genai_app_path = Path(__file__).resolve().parents[5] / "genai" / "app"
                        
                        # 导入 model
                        model_spec = importlib.util.spec_from_file_location(
                            "model", genai_app_path / "model.py"
                        )
                        model_module = importlib.util.module_from_spec(model_spec)
                        model_spec.loader.exec_module(model_module)
                        
                        # 导入 weaviate_client
                        weaviate_spec = importlib.util.spec_from_file_location(
                            "weaviate_client", genai_app_path / "weaviate_client.py"
                        )
                        weaviate_module = importlib.util.module_from_spec(weaviate_spec)
                        weaviate_spec.loader.exec_module(weaviate_module)
                        WeaviateManager = weaviate_module.WeaviateManager
                        
                        # 导入 emotion_analytics
                        analytics_spec = importlib.util.spec_from_file_location(
                            "emotion_analytics", genai_app_path / "emotion_analytics.py"
                        )
                        analytics_module = importlib.util.module_from_spec(analytics_spec)
                        analytics_spec.loader.exec_module(analytics_module)
                        EmotionAnalytics = analytics_module.EmotionAnalytics
                        
                        # 初始化 Gemini 客户端和 WeaviateManager
                        api_key = os.getenv("GEMINI_API_KEY")
                        gemini_client = genai.Client(api_key=api_key)
                        weaviate_manager = WeaviateManager()
                        analytics = EmotionAnalytics(weaviate_manager, gemini_client)
                        # 构造单条对话格式
                        conversations = [{"timestamp": "", "userQuery": message_create.content}]
                        data_points = analytics.analyze_emotions_from_text(conversations)
                        if data_points:
                            emotion_result = data_points[0].emotion
                            print(f"[AI] Emotion analyzed: {emotion_result}")
                    except Exception as e:
                        print(f"[AI] Emotion analysis failed: {e}")
                        import traceback
                        traceback.print_exc()
                        # Continue without emotion if analysis fails

                # ============================================================
                # STEP 2.5: Save message to MongoDB (WITH emotion)
                # ============================================================
                # Create repository instance and save message to database
                # This ensures WebSocket messages are also saved to history
                # Now with emotion included!
                repo = ChatRepository(get_database())
                saved_message = await repo.create_message(
                    session_id=room_id,
                    sender_id=str(message_create.sender_id),
                    content=message_create.content,
                    message_type=message_create.message_type.value,
                    media_url=message_create.media_url,
                    emotion=emotion_result
                )

                # ============================================================
                # STEP 2.6: Save emotion data to Weaviate (AFTER message is saved)
                # ============================================================
                if emotion_result and data_points and weaviate_manager:
                    try:
                        # 使用 EmotionConversationRecord 数据类型
                        EmotionConversationRecord = model_module.EmotionConversationRecord
                        
                        # 获取时间戳
                        created_at = saved_message.get("created_at", "")
                        if hasattr(created_at, "isoformat"):
                            timestamp_str = created_at.isoformat()
                        else:
                            timestamp_str = str(created_at)
                        
                        # 创建情绪记录对象
                        emotion_record = EmotionConversationRecord(
                            user_id1=str(message_create.sender_id),
                            user_id2="",  # 对于单条消息，userId2 为空
                            timestamp=timestamp_str,
                            user_query=message_create.content,
                            emotion=emotion_result,
                            intensity=data_points[0].intensity,
                            sentiment_score=data_points[0].sentiment_score,
                            trigger_context=data_points[0].trigger_context,
                            message_id=str(saved_message.get("id", "")),  # 使用 "id" 而不是 "_id"
                            session_id=room_id
                        )
                        
                        # 保存到 Weaviate Conversations collection
                        success = weaviate_manager.write_data("Conversations", [emotion_record.to_weaviate_dict()])
                        if success:
                            print(f"[Weaviate] Emotion data saved for message {emotion_record.message_id}")
                        else:
                            print(f"[Weaviate] Failed to save emotion data for message {emotion_record.message_id}")
                    except Exception as e:
                        print(f"[Weaviate] Failed to save emotion data: {e}")

                # Create MessageOut with real message ID (emotion already included)
                message_out: MessageOut = MessageOut(**saved_message)

                # ============================================================
                # STEP 3: Broadcast message to all users in room
                # ============================================================
                # Convert MessageOut to dict with JSON-compatible datetime
                message_dict = message_out.model_dump()
                message_dict['created_at'] = message_out.created_at.isoformat()
                
                # Add emotion color based on analyzed emotion
                if emotion_result:
                    # 情绪颜色映射
                    EMOTION_COLORS = {
                        'bored': '#4B4E91',
                        'fear': '#9381BA',
                        'joy': '#F9D849',
                        'sadness': '#3266B1',
                        'disgust': '#66B04C',
                        'anxiety': '#E67E22',
                        'anger': '#D32F2F',
                        'embarrassment': '#D278A3',
                        'envy': '#2BA8A4',
                    }
                    message_dict['emotion_color'] = EMOTION_COLORS.get(emotion_result.lower(), '#808080')
                    print(f"[AI] Emotion: {emotion_result}, Color: {message_dict['emotion_color']}")

                # Log the message before broadcasting
                content_preview = message_create.content if len(message_create.content) <= 50 else message_create.content[:50] + "..."
                print(f"[WebSocket] Broadcasting in room {room_id}: {content_preview}")

                await manager.broadcast(
                    room_id=room_id_str,
                    message=message_dict
                )

            except json.JSONDecodeError:
                # Invalid JSON
                await websocket.send_json({
                    "error": "Invalid JSON format",
                    "example": {
                        "sender_id": 1,
                        "content": "Your message here"
                    }
                })

            except Exception as e:
                # Validation error or other issues
                await websocket.send_json({
                    "error": f"Message validation failed: {str(e)}"
                })

    except WebSocketDisconnect:
        # ====================================================================
        # STEP 4: Handle disconnection
        # ====================================================================
        await manager.disconnect(room_id_str, websocket)
        print(f"[WebSocket] Client disconnected from room {room_id}")


