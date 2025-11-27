"""
Matching Service - Emotion-based User Matching
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from app.schemas.chat import (
    MatchRequest, MatchResponse, MatchQueueEntry, 
    MatchMode, EmotionType
)


class MatchingService:
    """
    Emotion-based Matching Service

    Matching Logic:
    1. A user submits a match request (current emotion, mode, preferred emotions)
    2. The system searches the queue for a compatible user
    3. If a match is found, create a chat room and return match details
    4. If no match is found, add the user to the queue and wait
    """

    def __init__(self):
        # Matching queue
        self.queue: List[MatchQueueEntry] = []
        
        # Active matches: room_id -> (user1_id, user2_id)
        self.active_matches: Dict[int, Tuple[int, int]] = {}
        
        # Room ID counter
        self._next_room_id = 1000
        
        # Queue entry timeout (5 minutes)
        self.queue_timeout = timedelta(minutes=5)
        
        # Emotion compatibility matrix
        self.emotion_compatibility: Dict[EmotionType, List[EmotionType]] = {
            EmotionType.HAPPY: [EmotionType.HAPPY, EmotionType.EXCITED, EmotionType.WARM, EmotionType.FRIENDLY],
            EmotionType.WARM: [EmotionType.WARM, EmotionType.HAPPY, EmotionType.FRIENDLY],
            EmotionType.NEUTRAL: [EmotionType.NEUTRAL, EmotionType.WARM, EmotionType.FRIENDLY],
            EmotionType.ANXIOUS: [EmotionType.WARM, EmotionType.FRIENDLY, EmotionType.NEUTRAL],
            EmotionType.UNCERTAIN: [EmotionType.WARM, EmotionType.FRIENDLY, EmotionType.NEUTRAL],
            EmotionType.SAD: [EmotionType.WARM, EmotionType.FRIENDLY, EmotionType.NEUTRAL],
            EmotionType.EXCITED: [EmotionType.EXCITED, EmotionType.HAPPY, EmotionType.FRIENDLY],
            EmotionType.STRESSED: [EmotionType.WARM, EmotionType.NEUTRAL, EmotionType.FRIENDLY],
            EmotionType.FRIENDLY: [EmotionType.FRIENDLY, EmotionType.WARM, EmotionType.HAPPY, EmotionType.EXCITED],
            EmotionType.DISTANT: [EmotionType.NEUTRAL, EmotionType.DISTANT],
        }

    async def find_match(self, request: MatchRequest) -> MatchResponse:
        """Try to find a compatible match for the user."""
        
        # Remove expired entries from the queue
        self._cleanup_expired_entries()
        
        # Search for a compatible user in the queue
        compatible_user = self._find_compatible_user(request)
        
        if compatible_user:
            # Match found → create room
            return await self._create_match(request, compatible_user)
        
        # No match → add user to queue
        self._add_to_queue(request)
        
        return MatchResponse(
            matched=False,
            is_anonymous=(request.mode == MatchMode.HUMAN_ANONYMOUS),
            match_type=request.mode
        )

    def _find_compatible_user(self, request: MatchRequest) -> Optional[MatchQueueEntry]:
        """Search the queue for a compatible user."""
        for entry in self.queue:
            # Cannot match with oneself
            if entry.user_id == request.user_id:
                continue
            
            # Matching mode must be the same
            if entry.mode != request.mode:
                continue
            
            # Check emotional compatibility
            if self._are_emotions_compatible(request, entry):
                return entry
        
        return None

    def _are_emotions_compatible(self, request: MatchRequest, entry: MatchQueueEntry) -> bool:
        """Determine whether two users' emotions are compatible."""
        
        # Emotion compatibility lists
        request_compatible = self.emotion_compatibility.get(
            request.current_emotion, 
            [EmotionType.NEUTRAL]
        )
        entry_compatible = self.emotion_compatibility.get(
            entry.current_emotion,
            [EmotionType.NEUTRAL]
        )
        
        # Check preferred emotion list
        if request.preferred_emotions:
            if entry.current_emotion in request.preferred_emotions:
                return True
        
        if entry.preferred_emotions:
            if request.current_emotion in entry.preferred_emotions:
                return True
        
        # Check general emotional compatibility
        return (
            entry.current_emotion in request_compatible or
            request.current_emotion in entry_compatible
        )

    async def _create_match(self, request: MatchRequest, matched_entry: MatchQueueEntry) -> MatchResponse:
        """Create a match and room"""
        # Remove matched user from queue
        self.queue.remove(matched_entry)
        
        is_anonymous = request.mode == MatchMode.HUMAN_ANONYMOUS
        
        # IMPORTANT: Create room in chat system
        from app.api.v1.routers import chat_http
        room = chat_http._get_or_create_room(
            user1_id=request.user_id,
            user2_id=matched_entry.user_id,
            is_anonymous=is_anonymous
        )
        
        room_id = room["id"]
        
        # Store active match
        self.active_matches[room_id] = (request.user_id, matched_entry.user_id)
        
        print(f"[Matching] Match created: User {request.user_id} <-> User {matched_entry.user_id} "
              f"(Room {room_id}, Anonymous: {is_anonymous})")
        
        return MatchResponse(
            matched=True,
            room_id=room_id,
            matched_user_id=matched_entry.user_id,
            is_anonymous=is_anonymous,
            match_type=request.mode
        )

    def _add_to_queue(self, request: MatchRequest) -> None:
        """Add a new entry to the matching queue."""
        
        # Remove existing queue entries for this user
        self.queue = [e for e in self.queue if e.user_id != request.user_id]
        
        # Create a new queue entry
        entry = MatchQueueEntry(
            user_id=request.user_id,
            current_emotion=request.current_emotion,
            mode=request.mode,
            preferred_emotions=request.preferred_emotions,
            queued_at=datetime.utcnow()
        )
        
        self.queue.append(entry)
        print(f"[Matching] User {request.user_id} added to queue. Queue size: {len(self.queue)}")

    def _cleanup_expired_entries(self) -> None:
        """Remove queue entries older than the timeout threshold."""
        
        cutoff_time = datetime.utcnow() - self.queue_timeout
        original_size = len(self.queue)
        
        self.queue = [
            entry for entry in self.queue 
            if entry.queued_at > cutoff_time
        ]
        
        removed = original_size - len(self.queue)
        if removed > 0:
            print(f"[Matching] Cleaned up {removed} expired entries")

    def cancel_match_search(self, user_id: int) -> bool:
        """Cancel the match search for a given user."""
        
        original_size = len(self.queue)
        self.queue = [e for e in self.queue if e.user_id != user_id]
        
        removed = original_size - len(self.queue)
        if removed > 0:
            print(f"[Matching] User {user_id} cancelled search")
        
        return removed > 0

    def get_queue_status(self, user_id: int) -> dict:
        """Return the queue status for the given user."""
        
        for entry in self.queue:
            if entry.user_id == user_id:
                return {
                    "in_queue": True,
                    "emotion": entry.current_emotion.value,
                    "mode": entry.mode.value,
                    "queued_at": entry.queued_at.isoformat(),
                    "queue_position": self.queue.index(entry) + 1,
                    "total_in_queue": len(self.queue)
                }
        
        return {"in_queue": False}

    def get_queue_stats(self) -> dict:
        """Return global queue statistics (count by mode & emotion)."""
        
        mode_counts = {}
        emotion_counts = {}
        
        for entry in self.queue:
            mode_counts[entry.mode.value] = mode_counts.get(entry.mode.value, 0) + 1
            emotion_counts[entry.current_emotion.value] = emotion_counts.get(entry.current_emotion.value, 0) + 1
        
        return {
            "total_in_queue": len(self.queue),
            "by_mode": mode_counts,
            "by_emotion": emotion_counts
        }

    def get_match_info(self, room_id: int) -> Optional[Tuple[int, int]]:
        """Return matched user pair for the given room ID."""
        return self.active_matches.get(room_id)


# Global instance
matching_service = MatchingService()
