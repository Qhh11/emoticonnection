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
from crud.following_crud import get_mutual_following  # type: ignore
from crud.notification_crud import create_notification  # type: ignore

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
async def websocket_chat_endpoint(websocket: WebSocket, room_id: str, user_id: str = None):
    """
    WebSocket endpoint for real-time chat

    ENDPOINT: WS /ws/rooms/123?user_id=xxx

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
    user_id_str = str(user_id) if user_id else None

    # ========================================================================
    # STEP 1: Accept WebSocket connection
    # ========================================================================
    await manager.connect(room_id_str, websocket, user_id_str)

    # Broadcast user online status to the room and to mutual friends
    if user_id_str:
        await manager.broadcast_user_status_to_room(room_id_str, user_id_str, "online")
        # Notify mutual friends that this user is online
        try:
            mutual_friends = get_mutual_following(user_id_str)
            if mutual_friends:
                await manager.broadcast_user_status_to_users(mutual_friends, user_id_str, "online")
        except Exception as e:
            print(f"[WebSocket] Failed to notify friends of online status: {e}")

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
                # Analyze emotion using EmotionService which returns dual emotions with percentages
                emotion_result = None
                emotion_analysis = None  # 双情绪分析结果
                if message_create.message_type.value == "text" and message_create.content:
                    try:
                        from app.modules.ai.core.emotion import EmotionService
                        import re

                        # 情绪颜色映射
                        EMOTION_COLORS = {
                            'anxiety': '#E67E22',
                            'sadness': '#3266B1',
                            'fatigue': '#4B4E91',
                            'happiness': '#F9D849',
                            'calm': '#2BA8A4',
                            'anger': '#D32F2F',
                            'confusion': '#D278A3',
                            # 兼容其他情绪名称
                            'bored': '#4B4E91',
                            'fear': '#9381BA',
                            'joy': '#F9D849',
                            'disgust': '#66B04C',
                            'embarrassment': '#D278A3',
                            'envy': '#2BA8A4',
                        }

                        emotion_service = EmotionService()
                        # 返回格式: "Emotion1: X%, Emotion2: Y%"
                        raw_result = await emotion_service.analyze_emotion(message_create.content)
                        print(f"[AI] Raw emotion result: {raw_result}")

                        # 解析双情绪格式: "Happiness: 80%, Calm: 20%"
                        pattern = r'(\w+):\s*(\d+)%'
                        matches = re.findall(pattern, raw_result)

                        if len(matches) >= 2:
                            primary_emotion = matches[0][0].lower()
                            primary_percentage = int(matches[0][1]) / 100.0
                            secondary_emotion = matches[1][0].lower()
                            secondary_percentage = int(matches[1][1]) / 100.0

                            emotion_analysis = {
                                'primary_emotion': primary_emotion,
                                'primary_percentage': primary_percentage,
                                'primary_color': EMOTION_COLORS.get(primary_emotion, '#808080'),
                                'secondary_emotion': secondary_emotion,
                                'secondary_percentage': secondary_percentage,
                                'secondary_color': EMOTION_COLORS.get(secondary_emotion, '#808080'),
                            }
                            # 向后兼容：保留主情绪作为 emotion_result
                            emotion_result = primary_emotion
                            print(f"[AI] Dual emotions: {primary_emotion} ({primary_percentage*100:.0f}%) + {secondary_emotion} ({secondary_percentage*100:.0f}%)")
                        elif len(matches) == 1:
                            # 只有一个情绪时，次要情绪设为 calm
                            primary_emotion = matches[0][0].lower()
                            primary_percentage = int(matches[0][1]) / 100.0
                            emotion_analysis = {
                                'primary_emotion': primary_emotion,
                                'primary_percentage': primary_percentage,
                                'primary_color': EMOTION_COLORS.get(primary_emotion, '#808080'),
                                'secondary_emotion': 'calm',
                                'secondary_percentage': 1.0 - primary_percentage,
                                'secondary_color': EMOTION_COLORS.get('calm', '#808080'),
                            }
                            emotion_result = primary_emotion

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
                    emotion=None,  # Deprecated: use emotion_analysis instead
                    emotion_analysis=emotion_analysis  # Dual emotion analysis with percentages
                )

                # Note: Weaviate storage removed - using simplified EmotionService

                # Create MessageOut with real message ID (emotion already included)
                message_out: MessageOut = MessageOut(**saved_message)

                # ============================================================
                # STEP 3: Broadcast message to all users in room
                # ============================================================
                # Convert MessageOut to dict with JSON-compatible datetime
                message_dict = message_out.model_dump()
                message_dict['created_at'] = message_out.created_at.isoformat()
                
                # Add dual emotion analysis to broadcast
                if emotion_analysis:
                    message_dict['emotion_analysis'] = emotion_analysis
                    # 向后兼容：保留 emotion_color
                    message_dict['emotion_color'] = emotion_analysis['primary_color']
                elif emotion_result:
                    # Fallback: 只有单情绪时
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
                        'happiness': '#F9D849',
                        'calm': '#2BA8A4',
                        'fatigue': '#4B4E91',
                        'confusion': '#D278A3',
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

                # ============================================================
                # STEP 4: Create notification for the recipient
                # ============================================================
                # Get the session to find the other user
                try:
                    session = await repo.get_session_by_id(room_id)
                    if session:
                        sender_id_str = str(message_create.sender_id)
                        # Determine recipient (the other user in the room)
                        recipient_id = None
                        if session.get("user1_id") == sender_id_str:
                            recipient_id = session.get("user2_id")
                        elif session.get("user2_id") == sender_id_str:
                            recipient_id = session.get("user1_id")

                        if recipient_id and recipient_id != sender_id_str:
                            # Create/update chat notification for recipient
                            create_notification(
                                user_id=recipient_id,
                                notification_type="chat_message",
                                source_id=room_id_str,  # room_id as source
                                actor_id=sender_id_str
                            )
                            # Send real-time notification update via WebSocket
                            await manager.send_notification_update(
                                target_user_id=recipient_id,
                                notification_type="chat_message",
                                source_id=room_id_str
                            )
                except Exception as e:
                    print(f"[Notification] Failed to create chat notification: {e}")

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
        # Disconnect from chat room WebSocket
        await manager.disconnect(room_id_str, websocket)
        print(f"[WebSocket] Client disconnected from room {room_id}")
        # Note: Online status is now managed by the presence WebSocket (/ws/presence/{user_id})
        # so we don't broadcast peer_disconnected or offline status here


@router.websocket("/ws/presence/{user_id}")
async def websocket_presence_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for user presence notifications"""
    presence_room = f"presence_{user_id}"
    await manager.connect(presence_room, websocket, user_id)

    # Notify friends this user is online
    try:
        friends = get_mutual_following(user_id)
        if friends:
            await manager.broadcast_user_status_to_users(friends, user_id, "online")
    except Exception as e:
        print(f"[Presence] Error notifying online: {e}")

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(presence_room, websocket)
        if not manager.is_user_online(user_id):
            try:
                friends = get_mutual_following(user_id)
                if friends:
                    await manager.broadcast_user_status_to_users(friends, user_id, "offline")
            except Exception as e:
                print(f"[Presence] Error notifying offline: {e}")


