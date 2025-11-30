"""
Chat HTTP API Routes

This file implements REST API endpoints for:
- Creating/getting chat rooms
- Sending messages
- Retrieving message history

IMPORTANT: We use in-memory storage for now (temporary!)
TODO: Database team will replace this with real database calls
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException

# Import our data models
from app.modules.chat.schemas.chat import (
    RoomCreate, Room, MessageCreate, MessageOut,
    RoomCreateExtended, RoomExtended, RoomListItem,
    AnonymousSettings, RevealIdentityRequest, RevealIdentityResponse
)
from app.modules.chat.deps import get_db, DummyDB



# ============================================================================
# Initialize Router
# ============================================================================

router = APIRouter(
    prefix="/chat",  # All routes will start with /chat
    tags=["chat"]    # Group routes in API documentation
)


# ============================================================================
# TEMPORARY IN-MEMORY STORAGE
# ============================================================================
"""
WHY IN-MEMORY?
- We're only implementing the API logic, not database
- Database team will replace these with real database calls
- This allows us to test the API immediately

STRUCTURE:
_rooms = [
    {"id": 1, "user1_id": 1, "user2_id": 2},
    {"id": 2, "user1_id": 1, "user2_id": 3},
]

_messages = [
    {
        "id": 1,
        "room_id": 1,
        "sender_id": 1,
        "content": "Hello!",
        "created_at": datetime(...)
    },
]
"""

_rooms: List[dict] = []        # Temporary room storage
_messages: List[dict] = []     # Temporary message storage
_next_room_id = 1              # Auto-incrementing room ID
_next_message_id = 1           # Auto-incrementing message ID


# ============================================================================
# HELPER FUNCTIONS (These will be replaced with database repository calls)
# ============================================================================

def _get_or_create_room(user1_id: int, user2_id: int, is_anonymous: bool = False) -> dict:
    """
    Get existing room or create new one for two users

    LOGIC:
    1. Check if room already exists between these users
       (user1_id, user2_id) OR (user2_id, user1_id) - order doesn't matter!
    2. If exists, return it
    3. If not, create new room

    TODO: Replace with: chat_repo.get_or_create_room(user1_id, user2_id)
    """
    global _next_room_id

    # Normalize user IDs (ensure user1_id < user2_id for consistent lookup)
    u1, u2 = min(user1_id, user2_id), max(user1_id, user2_id)

    # Search for existing room
    for room in _rooms:
        room_u1 = min(room["user1_id"], room["user2_id"])
        room_u2 = max(room["user1_id"], room["user2_id"])
        if room_u1 == u1 and room_u2 == u2:
            return room

    # Create new room if not found
    new_room = {
        "id": _next_room_id,
        "user1_id": u1,
        "user2_id": u2,
        "is_anonymous": is_anonymous,
        "created_at": datetime.utcnow(),
        "user1_revealed": not is_anonymous,
        "user2_revealed": not is_anonymous
    }
    _rooms.append(new_room)
    _next_room_id += 1

    return new_room


def _get_room_by_id(room_id: int) -> dict | None:
    """
    Get room by ID

    TODO: Replace with: chat_repo.get_room_by_id(room_id)
    """
    for room in _rooms:
        if room["id"] == room_id:
            return room
    return None


def _create_message(
    room_id: int,
    sender_id: int,
    content: str,
    message_type: str = "text",
    media_url: str = None,
    emotion: str = None
) -> dict:
    """
    Create a new message with support for different message types

    TODO: Replace with: chat_repo.create_message(room_id, sender_id, content, message_type, media_url, emotion)
    """
    global _next_message_id

    message = {
        "id": _next_message_id,
        "room_id": room_id,
        "sender_id": sender_id,
        "message_type": message_type,
        "content": content,
        "media_url": media_url,
        "emotion": emotion,
        "created_at": datetime.utcnow()
    }
    _messages.append(message)
    _next_message_id += 1

    return message


def _get_room_messages(room_id: int, limit: int = 100) -> List[dict]:
    """Get messages for a room with optional limit"""
    room_messages = [msg for msg in _messages if msg["room_id"] == room_id]
    return room_messages[-limit:]  # Return last N messages

def _get_user_rooms(user_id: int) -> List[dict]:
    return [
        room for room in _rooms 
        if room["user1_id"] == user_id or room["user2_id"] == user_id
    ]

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/rooms", response_model=Room)
def create_or_get_room(
    room_data: RoomCreate,
    db: DummyDB = Depends(get_db)
):
    """
    Create or get existing chat room between two users

    ENDPOINT: POST /chat/rooms

    REQUEST BODY:
    {
        "user1_id": 1,
        "user2_id": 2
    }

    RESPONSE:
    {
        "id": 123,
        "user1_id": 1,
        "user2_id": 2
    }

    LOGIC:
    - If room already exists between these users → return existing room
    - If not → create new room and return it

    WHY THIS DESIGN?
    - Users don't need to know if room exists
    - Just call this endpoint and get a room to chat in
    - Idempotent: calling multiple times returns same room
    """
    # Get or create room (using our temporary helper function)
    room = _get_or_create_room(room_data.user1_id, room_data.user2_id)

    # Convert dict to Room model and return
    return Room(**room)


@router.get("/rooms/{room_id}/messages", response_model=List[MessageOut])
def get_room_messages(
    room_id: int,
    db: DummyDB = Depends(get_db)
):
    """
    Get all messages in a chat room

    ENDPOINT: GET /chat/rooms/123/messages

    RESPONSE:
    [
        {
            "id": 1,
            "room_id": 123,
            "sender_id": 1,
            "content": "Hello!",
            "created_at": "2025-01-25T10:30:00Z"
        },
        {
            "id": 2,
            "room_id": 123,
            "sender_id": 2,
            "content": "Hi there!",
            "created_at": "2025-01-25T10:31:00Z"
        }
    ]

    USE CASE:
    - When user opens a chat room
    - Load previous message history
    - Display in chat UI
    """
    # Check if room exists
    room = _get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    # Get all messages for this room
    messages = _get_room_messages(room_id)

    # Convert dicts to MessageOut models and return
    return [MessageOut(**msg) for msg in messages]


@router.post("/rooms/{room_id}/messages", response_model=MessageOut)
def send_message(
    room_id: int,
    message_data: MessageCreate,
    db: DummyDB = Depends(get_db)
):
    """
    Send a message to a chat room

    ENDPOINT: POST /chat/rooms/123/messages

    REQUEST BODY:
    {
        "sender_id": 1,
        "content": "Hello, how are you?"
    }

    RESPONSE:
    {
        "id": 456,
        "room_id": 123,
        "sender_id": 1,
        "content": "Hello, how are you?",
        "created_at": "2025-01-25T10:30:00Z"
    }

    NOTE:
    - This is REST API way to send messages
    - WebSocket is better for real-time chat
    - But this is useful for:
      * Testing
      * Sending messages when WebSocket is not available
      * Background tasks
    """
    # Check if room exists
    room = _get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    # Create the message with new message type support
    message = _create_message(
        room_id=room_id,
        sender_id=message_data.sender_id,
        content=message_data.content,
        message_type=message_data.message_type.value,
        media_url=message_data.media_url
    )

    # Convert dict to MessageOut model and return
    return MessageOut(**message)



# ============================================================================
# Extended Room Endpoints (support anouymous)
# ============================================================================

@router.post("/rooms/extended", response_model=RoomExtended)
def create_or_get_room_extended(
    room_data: RoomCreateExtended,
    db: DummyDB = Depends(get_db)
):
    """
    extended version
    POST /api/v1/chat/rooms/extended
    
    Request:
    {
        "user1_id": 1,
        "user2_id": 2,
        "is_anonymous": true
    }
    """
    room = _get_or_create_room(
        room_data.user1_id, 
        room_data.user2_id,
        is_anonymous=room_data.is_anonymous
    )
    return RoomExtended(**room)


@router.get("/rooms/{room_id}", response_model=RoomExtended)
def get_room(room_id: int, db: DummyDB = Depends(get_db)):
    """    
    GET /api/v1/chat/rooms/123
    """
    room = _get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")
    
    return RoomExtended(**room)


@router.get("/users/{user_id}/rooms", response_model=List[RoomListItem])
def get_user_rooms(user_id: int, db: DummyDB = Depends(get_db)):
    """
    GET /api/v1/chat/users/1/rooms
    """
    rooms = _get_user_rooms(user_id)
    result = []
    
    for room in rooms:
        other_user_id = (
            room["user2_id"] 
            if room["user1_id"] == user_id 
            else room["user1_id"]
        )
    
        is_other_anonymous = False
        if room.get("is_anonymous"):
            if room["user1_id"] == other_user_id:
                is_other_anonymous = not room.get("user1_revealed", True)
            else:
                is_other_anonymous = not room.get("user2_revealed", True)
        
        room_messages = _get_room_messages(room["id"], limit=1)
        last_msg = room_messages[-1] if room_messages else None
        
        result.append(RoomListItem(
            room_id=room["id"],
            other_user_id=other_user_id if not is_other_anonymous else -1,
            other_user_name=None if is_other_anonymous else f"User {other_user_id}",
            is_anonymous=room.get("is_anonymous", False),
            last_message=last_msg["content"][:50] if last_msg else None,
            last_message_time=last_msg["created_at"] if last_msg else None
        ))
    
    return result


# ============================================================================
# Anonymous Mode Endpoints 
# ============================================================================

@router.get("/rooms/{room_id}/anonymous", response_model=AnonymousSettings)
def get_anonymous_settings(room_id: int, db: DummyDB = Depends(get_db)):
    """    
    GET /api/v1/chat/rooms/123/anonymous
    """
    room = _get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")
    
    return AnonymousSettings(
        room_id=room_id,
        user1_anonymous=not room.get("user1_revealed", True),
        user2_anonymous=not room.get("user2_revealed", True)
    )


@router.post("/rooms/{room_id}/reveal", response_model=RevealIdentityResponse)
def reveal_identity(
    room_id: int,
    request: RevealIdentityRequest,
    db: DummyDB = Depends(get_db)
):
    """
    POST /api/v1/chat/rooms/123/reveal
    
    Request: {"room_id": 123, "user_id": 1}
    
    """
    room = _get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")
    
    if not room.get("is_anonymous"):
        return RevealIdentityResponse(
            success=False,
            message="Room is not anonymous"
        )
    
    # confirm which user to reveal identify
    if request.user_id == room["user1_id"]:
        room["user1_revealed"] = True
        revealed_name = f"User {request.user_id}"
    elif request.user_id == room["user2_id"]:
        room["user2_revealed"] = True
        revealed_name = f"User {request.user_id}"
    else:
        raise HTTPException(status_code=403, detail="User not in this room")
    
    print(f"[Anonymous] User {request.user_id} revealed identity in room {room_id}")
    
    return RevealIdentityResponse(
        success=True,
        message="Identity revealed successfully",
        revealed_user_id=request.user_id,
        revealed_username=revealed_name
    )