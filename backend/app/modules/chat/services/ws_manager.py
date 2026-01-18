"""
WebSocket Connection Manager

This is the CORE component for real-time chat functionality.
It manages WebSocket connections and handles message broadcasting.

KEY CONCEPT:
- Each room has a list of WebSocket connections
- When a message is sent, it's broadcasted to all connections in that room
- For 1v1 chat: max 2 users per room (but each user can have multiple devices)
"""

from typing import Dict, List, Set, Optional
from datetime import datetime
from fastapi import WebSocket
from enum import Enum


class UserStatusType(str, Enum):
    """User online status"""
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"


class WSEventType(str, Enum):
    """WebSocket event types"""
    MESSAGE = "message"
    TYPING = "typing"
    USER_STATUS = "user_status"


class ConnectionManager:
    """
    Manages WebSocket connections organized by room_id

    ARCHITECTURE:

    self.rooms = {
        "123": [websocket_user1, websocket_user2],  # Room 123 with 2 connections
        "456": [websocket_user3],                   # Room 456 with 1 connection (other user offline)
    }

    HOW IT WORKS:
    1. User connects -> add their WebSocket to the room's list
    2. User sends message -> broadcast to all WebSockets in that room
    3. User disconnects -> remove their WebSocket from the room's list
    """

    def __init__(self):
        """
        Initialize the connection manager

        rooms: Dictionary mapping room_id (string) to list of WebSocket connections

        Example state:
        {
            "123": [<WebSocket object 1>, <WebSocket object 2>],
            "456": [<WebSocket object 3>]
        }
        """
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.socket_to_user: Dict[WebSocket, str] = {}
        self.user_sockets: Dict[str, List[WebSocket]] = {}
        self.user_rooms: Dict[str, Set[str]] = {}
        self.user_status: Dict[str, UserStatusType] = {}
        self.typing_status: Dict[tuple, bool] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_id: Optional[str] = None) -> None:
        """
        Connect a client to a chat room

        STEPS:
        1. Accept the WebSocket connection
        2. Add the WebSocket to the room's connection list
        3. Create the room list if it doesn't exist

        Args:
            room_id: The chat room ID (e.g., "123")
            websocket: The WebSocket connection object

        Example:
            await manager.connect("123", websocket)
            # Now self.rooms["123"] contains this websocket
        """
        # Step 1: Accept the WebSocket connection (this is required!)
        await websocket.accept()

        # Step 2: Initialize the room if it doesn't exist
        if room_id not in self.rooms:
            self.rooms[room_id] = []

        # Step 3: Add this WebSocket to the room's connection list
        self.rooms[room_id].append(websocket)

        if user_id is not None:
            self.socket_to_user[websocket] = user_id
            if user_id not in self.user_sockets:
                self.user_sockets[user_id] = []
            self.user_sockets[user_id].append(websocket)
            if user_id not in self.user_rooms:
                self.user_rooms[user_id] = set()
            self.user_rooms[user_id].add(room_id)
            self.user_status[user_id] = UserStatusType.ONLINE

        print(f"[WebSocket] Client connected to room {room_id}. Total connections in room: {len(self.rooms[room_id])}")


    async def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        """
        Disconnect a client from a chat room

        STEPS:
        1. Remove the WebSocket from the room's connection list
        2. Clean up the room if no connections remain

        Args:
            room_id: The chat room ID
            websocket: The WebSocket connection to remove

        Example:
            await manager.disconnect("123", websocket)
            # This websocket is removed from self.rooms["123"]
        """
        user_id = self.socket_to_user.get(websocket)
        # Step 1: Remove this WebSocket from the room's list
        if room_id in self.rooms:
            if websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
                print(f"[WebSocket] Client disconnected from room {room_id}. Remaining connections: {len(self.rooms[room_id])}")

            # Step 2: Clean up empty rooms
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
                print(f"[WebSocket] Room {room_id} deleted (no active connections)")
        
        if user_id is not None:
            if user_id in self.user_sockets and websocket in self.user_sockets[user_id]:
                self.user_sockets[user_id].remove(websocket)
                if len(self.user_sockets[user_id]) == 0:
                    del self.user_sockets[user_id]
                    self.user_status[user_id] = UserStatusType.OFFLINE
            
            if user_id in self.user_rooms:
                self.user_rooms[user_id].discard(room_id)
            
            if websocket in self.socket_to_user:
                del self.socket_to_user[websocket]


    async def broadcast(self, room_id: str, message: dict) -> None:
        """
        Broadcast a message to ALL connections in a room

        THIS IS THE CORE OF REAL-TIME CHAT!

        STEPS:
        1. Get all WebSocket connections in the room
        2. Send the message to each connection
        3. Handle any errors (e.g., if a connection is broken)

        Args:
            room_id: The chat room ID
            message: The message dictionary to broadcast (will be sent as JSON)

        Example:
            message_data = {
                "id": 456,
                "room_id": 123,
                "sender_id": 1,
                "content": "Hello!",
                "created_at": "2025-01-25T10:30:00Z"
            }
            await manager.broadcast("123", message_data)
            # This sends the message to all users in room 123

        HOW BROADCASTING WORKS:
        - If room has 2 connections (User 1 and User 2):
          1. User 1 sends message
          2. broadcast() sends to BOTH connections
          3. User 1 receives confirmation (their own message)
          4. User 2 receives the new message in real-time
        """
        # Step 1: Check if the room exists
        if room_id not in self.rooms:
            print(f"[WebSocket] Cannot broadcast to room {room_id}: room not found")
            return

        # Step 2: Get all connections in this room
        connections = self.rooms[room_id]
        print(f"[WebSocket] Broadcasting message to room {room_id} ({len(connections)} connections)")

        # Step 3: Send message to each connection
        # We use a copy of the list to avoid issues if connections change during iteration
        for websocket in connections[:]:
            try:
                # Convert message dict to JSON and send
                await websocket.send_json(message)
                print(f"[WebSocket] Message sent to one connection in room {room_id}")
            except Exception as e:
                # If sending fails (e.g., connection broken), remove this WebSocket
                print(f"[WebSocket] Error sending to connection in room {room_id}: {e}")
                await self.disconnect(room_id, websocket)


    async def broadcast_to_room_except(self, room_id: str, message: dict, exclude_user_id: str) -> None:
        if room_id not in self.rooms:
            return
        for websocket in self.rooms[room_id][:]:
            socket_user = self.socket_to_user.get(websocket)
            if socket_user != exclude_user_id:
                try:
                    await websocket.send_json(message)
                except:
                    await self.disconnect(room_id, websocket)

    async def set_typing(self, room_id: str, user_id: str, is_typing: bool) -> None:
        typing_key = (room_id, user_id)
        if self.typing_status.get(typing_key) != is_typing:
            self.typing_status[typing_key] = is_typing
            await self.broadcast_to_room_except(
                room_id,
                {
                    "event_type": WSEventType.TYPING.value,
                    "data": {"room_id": int(room_id), "user_id": user_id, "is_typing": is_typing}
                },
                exclude_user_id=user_id
            )

    def get_room_connection_count(self, room_id: str) -> int:
        """
        Get the number of active connections in a room

        Useful for debugging and monitoring

        Args:
            room_id: The chat room ID

        Returns:
            Number of active WebSocket connections in the room
        """
        return len(self.rooms.get(room_id, []))

    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is currently online (has active WebSocket connections)"""
        return user_id in self.user_sockets and len(self.user_sockets[user_id]) > 0

    def get_online_users(self) -> List[str]:
        """Get list of all online user IDs"""
        return list(self.user_sockets.keys())

    async def broadcast_user_status_to_room(self, room_id: str, user_id: str, status: str) -> None:
        """Broadcast user status change to all users in a room"""
        if room_id not in self.rooms:
            return

        for websocket in self.rooms[room_id][:]:
            socket_user = self.socket_to_user.get(websocket)
            if socket_user != user_id:  # Don't send to the user themselves
                try:
                    await websocket.send_json({
                        "event_type": WSEventType.USER_STATUS.value,
                        "data": {
                            "user_id": user_id,
                            "status": status
                        }
                    })
                except:
                    pass

    async def broadcast_user_status_to_users(self, target_user_ids: List[str], user_id: str, status: str) -> None:
        """Broadcast user status change to specific users (e.g., friends)"""
        for target_id in target_user_ids:
            if target_id == user_id:
                continue  # Don't send to the user themselves
            if target_id not in self.user_sockets:
                continue  # User not online

            for websocket in self.user_sockets[target_id][:]:
                try:
                    await websocket.send_json({
                        "event_type": WSEventType.USER_STATUS.value,
                        "data": {
                            "user_id": user_id,
                            "status": status
                        }
                    })
                except:
                    pass


