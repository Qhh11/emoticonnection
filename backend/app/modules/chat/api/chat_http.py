"""
Chat HTTP API Routes

This file implements REST API endpoints for:
- Creating/getting chat rooms
- Sending messages
- Retrieving message history

Database: MongoDB (via ChatRepository)
"""

from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

# Import our data models
from app.modules.chat.schemas.chat import (
    RoomCreate, Room, MessageCreate, MessageOut,
    RoomCreateExtended, RoomExtended, RoomListItem,
    AnonymousSettings, RevealIdentityRequest, RevealIdentityResponse
)
from app.modules.chat.repository.chat_repository import ChatRepository
# Use unified database configuration
import sys
from pathlib import Path
database_path = Path(__file__).resolve().parents[5] / "database"
sys.path.insert(0, str(database_path))
from config.mongodb_config import get_database  # type: ignore



# ============================================================================
# Initialize Router
# ============================================================================

router = APIRouter(
    prefix="/chat",  # All routes will start with /chat
    tags=["chat"]    # Group routes in API documentation
)


# ============================================================================
# DATABASE REPOSITORY
# ============================================================================

def get_chat_repo() -> ChatRepository:
    """Dependency to get ChatRepository instance"""
    db = get_database()
    return ChatRepository(db)


# ============================================================================
# HELPER FUNCTIONS (Database operations via ChatRepository)
# ============================================================================

async def _get_or_create_room(repo: ChatRepository, user1_id: int, user2_id: int, is_anonymous: bool = False) -> dict:
    """
    Get existing room or create new one for two users
    Now using MongoDB via ChatRepository
    """
    return await repo.get_or_create_session(
        str(user1_id),
        str(user2_id),
        is_anonymous
    )


async def _get_room_by_id(repo: ChatRepository, room_id: str) -> Optional[dict]:
    """
    Get room by ID
    Now using MongoDB via ChatRepository
    """
    return await repo.get_session_by_id(str(room_id))


async def _create_message(
    repo: ChatRepository,
    room_id: str,
    sender_id: int,
    content: str,
    message_type: str = "text",
    media_url: str = None,
    emotion: str = None
) -> dict:
    """
    Create a new message with support for different message types
    Now using MongoDB via ChatRepository
    """
    return await repo.create_message(
        session_id=str(room_id),
        sender_id=str(sender_id),
        content=content,
        message_type=message_type,
        media_url=media_url,
        emotion=emotion
    )


async def _get_room_messages(repo: ChatRepository, room_id: str, limit: int = 100) -> List[dict]:
    """Get messages for a room with optional limit"""
    return await repo.get_session_messages(str(room_id), limit)


async def _get_user_rooms(repo: ChatRepository, user_id: int) -> List[dict]:
    """Get all rooms for a user"""
    return await repo.get_user_sessions(str(user_id))

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/rooms", response_model=Room)
async def create_or_get_room(
    room_data: RoomCreate,
    repo: ChatRepository = Depends(get_chat_repo)
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
    # Get or create room using MongoDB via ChatRepository
    room = await _get_or_create_room(repo, room_data.user1_id, room_data.user2_id)

    # Convert dict to Room model and return
    return Room(**room)


@router.get("/rooms/{room_id}/messages", response_model=List[MessageOut])
async def get_room_messages(
    room_id: str,
    repo: ChatRepository = Depends(get_chat_repo)
):
    """
    Get all messages in a chat room

    ENDPOINT: GET /chat/rooms/{room_id}/messages

    RESPONSE:
    [
        {
            "id": "507f1f77bcf86cd799439011",
            "room_id": "507f1f77bcf86cd799439012",
            "sender_id": 1,
            "content": "Hello!",
            "created_at": "2025-01-25T10:30:00Z"
        },
        {
            "id": "507f1f77bcf86cd799439013",
            "room_id": "507f1f77bcf86cd799439012",
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
    room = await _get_room_by_id(repo, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    # Get all messages for this room
    messages = await _get_room_messages(repo, room_id)

    # Convert dicts to MessageOut models and return
    return [MessageOut(**msg) for msg in messages]


@router.post("/rooms/{room_id}/messages", response_model=MessageOut)
async def send_message(
    room_id: str,
    message_data: MessageCreate,
    repo: ChatRepository = Depends(get_chat_repo)
):
    """
    Send a message to a chat room

    ENDPOINT: POST /chat/rooms/{room_id}/messages

    REQUEST BODY:
    {
        "sender_id": 1,
        "content": "Hello, how are you?"
    }

    RESPONSE:
    {
        "id": "507f1f77bcf86cd799439014",
        "room_id": "507f1f77bcf86cd799439012",
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
    room = await _get_room_by_id(repo, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    # Create the message with support for emoji, image, video, emotion
    message = await _create_message(
        repo=repo,
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
async def create_or_get_room_extended(
    room_data: RoomCreateExtended,
    repo: ChatRepository = Depends(get_chat_repo)
):
    """
    extended version
    POST /api/chat/rooms/extended

    Request:
    {
        "user1_id": 1,
        "user2_id": 2,
        "is_anonymous": true
    }
    """
    room = await _get_or_create_room(
        repo,
        room_data.user1_id,
        room_data.user2_id,
        is_anonymous=room_data.is_anonymous
    )
    return RoomExtended(**room)


@router.get("/rooms/{room_id}", response_model=RoomExtended)
async def get_room(room_id: str, repo: ChatRepository = Depends(get_chat_repo)):
    """
    GET /api/chat/rooms/{room_id}
    """
    room = await _get_room_by_id(repo, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    return RoomExtended(**room)


@router.get("/users/{user_id}/rooms", response_model=List[RoomListItem])
async def get_user_rooms(user_id: int, repo: ChatRepository = Depends(get_chat_repo)):
    """
    GET /api/chat/users/{user_id}/rooms
    """
    rooms = await _get_user_rooms(repo, user_id)
    result = []

    for room in rooms:
        # Parse user IDs from string (they're stored as strings in MongoDB)
        room_user1_id: int = int(room["user1_id"]) if isinstance(room["user1_id"], str) and room["user1_id"].isdigit() else int(room["user1_id"])
        room_user2_id: int = int(room["user2_id"]) if isinstance(room["user2_id"], str) and room["user2_id"].isdigit() else int(room["user2_id"])

        other_user_id: int = (
            room_user2_id
            if room_user1_id == user_id
            else room_user1_id
        )

        is_other_anonymous = False
        if room.get("is_anonymous"):
            if room_user1_id == other_user_id:
                is_other_anonymous = not room.get("user1_revealed", True)
            else:
                is_other_anonymous = not room.get("user2_revealed", True)

        room_messages = await _get_room_messages(repo, room["id"], limit=1)
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
async def get_anonymous_settings(room_id: str, repo: ChatRepository = Depends(get_chat_repo)):
    """
    GET /api/chat/rooms/{room_id}/anonymous
    """
    room = await _get_room_by_id(repo, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    return AnonymousSettings(
        room_id=room_id,
        user1_anonymous=not room.get("user1_revealed", True),
        user2_anonymous=not room.get("user2_revealed", True)
    )


@router.post("/rooms/{room_id}/reveal", response_model=RevealIdentityResponse)
async def reveal_identity(
    room_id: str,
    request: RevealIdentityRequest,
    repo: ChatRepository = Depends(get_chat_repo)
):
    """
    POST /api/chat/rooms/{room_id}/reveal

    Request: {"room_id": "507f1f77bcf86cd799439012", "user_id": 1}

    """
    room = await _get_room_by_id(repo, room_id)
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

    if not room.get("is_anonymous"):
        return RevealIdentityResponse(
            success=False,
            message="Room is not anonymous"
        )

    # Parse user IDs from string (they're stored as strings in MongoDB)
    room_user1_id = int(room["user1_id"]) if isinstance(room["user1_id"], str) and room["user1_id"].isdigit() else room["user1_id"]
    room_user2_id = int(room["user2_id"]) if isinstance(room["user2_id"], str) and room["user2_id"].isdigit() else room["user2_id"]

    # confirm which user to reveal identity
    if request.user_id == room_user1_id:
        # Update in database
        room_oid = ObjectId(room_id) if ObjectId.is_valid(room_id) else room_id
        await repo.sessions.update_one(
            {"_id": room_oid},
            {"$set": {"user1_revealed": True}}
        )
        revealed_name = f"User {request.user_id}"
    elif request.user_id == room_user2_id:
        # Update in database
        room_oid = ObjectId(room_id) if ObjectId.is_valid(room_id) else room_id
        await repo.sessions.update_one(
            {"_id": room_oid},
            {"$set": {"user2_revealed": True}}
        )
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