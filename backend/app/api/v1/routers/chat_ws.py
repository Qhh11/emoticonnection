"""
WebSocket Chat Endpoint

This is the REAL-TIME chat implementation!
Users connect via WebSocket and messages are broadcasted instantly.

HOW IT WORKS:
1. User connects to ws://localhost:8000/ws/rooms/123
2. User sends JSON: {"sender_id": 1, "content": "Hello"}
3. Server broadcasts to all users in room 123
4. Both users receive the message in real-time!
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

from app.schemas.chat import MessageCreate, MessageOut
from app.services.ws_manager import ConnectionManager

# Import in-memory storage from chat_http to save messages
# In production, this would be replaced with database calls
from app.api.v1.routers import chat_http

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
async def websocket_chat_endpoint(websocket: WebSocket, room_id: int):
    """
    WebSocket endpoint for real-time chat

    ENDPOINT: WS /ws/rooms/123

    CONNECTION FLOW:
    1. Client connects → manager.connect()
    2. Client sends message → receive and broadcast
    3. Client disconnects → manager.disconnect()

    MESSAGE FORMAT (from client):
    {
        "sender_id": 1,
        "content": "Hello, how are you?"
    }

    BROADCAST FORMAT (to all clients):
    {
        "id": -1,  // Placeholder (TODO: save to DB and get real ID)
        "room_id": 123,
        "sender_id": 1,
        "content": "Hello, how are you?",
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
                message_create = MessageCreate(**message_dict)

                # ============================================================
                # STEP 2.5: Save message to storage (for history)
                # ============================================================
                # Use the _create_message function from chat_http to save message
                # This ensures WebSocket messages are also saved to history
                saved_message = chat_http._create_message(
                    room_id=room_id,
                    sender_id=message_create.sender_id,
                    content=message_create.content
                )

                # Create MessageOut with real message ID
                message_out = MessageOut(**saved_message)

                # ============================================================
                # STEP 3: Broadcast message to all users in room
                # ============================================================
                # Convert MessageOut to dict with JSON-compatible datetime
                message_dict = message_out.model_dump()
                message_dict['created_at'] = message_out.created_at.isoformat()

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


