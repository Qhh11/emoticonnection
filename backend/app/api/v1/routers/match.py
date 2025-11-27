"""
Matching HTTP API Routes
Emotion-based Matching API
"""

from fastapi import APIRouter, Depends

from app.schemas.chat import MatchRequest, MatchResponse, EmotionType
from app.api.v1.deps import get_matching_service
from app.services.matching_service import MatchingService


router = APIRouter(prefix="/match", tags=["matching"])


@router.post("/find", response_model=MatchResponse)
async def find_match(
    request: MatchRequest,
    matcher: MatchingService = Depends(get_matching_service)
):
    """
    Find a match for the user.

    POST /api/v1/match/find

    Request example:
    {
        "user_id": 1,
        "current_emotion": "happy",
        "mode": "human_anonymous",
        "preferred_emotions": ["warm", "friendly"]  // optional
    }

    Response (match found):
    {
        "matched": true,
        "room_id": 123,
        "matched_user_id": 2,
        "is_anonymous": true,
        "match_type": "human_anonymous"
    }

    Response (waiting in queue):
    {
        "matched": false,
        "is_anonymous": true,
        "match_type": "human_anonymous"
    }
    """
    return await matcher.find_match(request)


@router.post("/cancel/{user_id}")
async def cancel_match_search(
    user_id: int,
    matcher: MatchingService = Depends(get_matching_service)
):
    """
    Cancel the current user's match search.

    POST /api/v1/match/cancel/1
    """
    removed = matcher.cancel_match_search(user_id)
    return {
        "success": removed,
        "message": "Removed from queue" if removed else "User was not in queue"
    }


@router.get("/status/{user_id}")
async def get_queue_status(
    user_id: int,
    matcher: MatchingService = Depends(get_matching_service)
):
    """
    Get the queue status for a specific user.

    GET /api/v1/match/status/1

    Response if in queue:
    {
        "in_queue": true,
        "emotion": "happy",
        "mode": "human_anonymous",
        "queued_at": "2025-01-01T00:00:00Z",
        "queue_position": 3,
        "total_in_queue": 10
    }

    Response if not in queue:
    {
        "in_queue": false
    }
    """
    return matcher.get_queue_status(user_id)


@router.get("/stats")
async def get_queue_stats(
    matcher: MatchingService = Depends(get_matching_service)
):
    """
    Get global queue statistics.

    GET /api/v1/match/stats

    Response example:
    {
        "total_in_queue": 15,
        "by_mode": {
            "human_anonymous": 8,
            "human_non_anonymous": 7
        },
        "by_emotion": {
            "happy": 4,
            "anxious": 3,
            ...
        }
    }
    """
    return matcher.get_queue_stats()


@router.get("/compatible-emotions/{emotion}")
async def get_compatible_emotions(
    emotion: EmotionType,
    matcher: MatchingService = Depends(get_matching_service)
):
    """
    Get the list of emotions compatible with a given emotion.

    GET /api/v1/match/compatible-emotions/happy

    Response example:
    {
        "emotion": "happy",
        "compatible_with": ["happy", "excited", "warm", "friendly"]
    }
    """
    compatible = matcher.emotion_compatibility.get(emotion, [])
    return {
        "emotion": emotion.value,
        "compatible_with": [e.value for e in compatible]
    }
