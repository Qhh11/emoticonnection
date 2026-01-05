"""
Matching HTTP API Routes
Enhanced Emotion-based Matching API (V2)

All endpoints now use the research-based V2 matching algorithm
"""

from fastapi import APIRouter, Depends
from typing import List
from fastapi import Header, HTTPException, Depends


from app.modules.chat.services.matching_service_v2 import (
    MatchRequestV2Internal,
    MatchingServiceV2,
    MatchRequestV2,
    MatchResponseV2,
    EmotionType,
    SupportRole,
    SupportNeed,
    TopicTag,
    MatchMode
)
from app.modules.chat.deps import get_matching_service
from app.modules.auth.deps import get_current_user


router = APIRouter(prefix="/match", tags=["matching"])


# ============================================================================
# Main Matching APIs
# ============================================================================

@router.post("/find", response_model=MatchResponseV2)
async def find_match(
    request: MatchRequestV2,  
    matcher: MatchingServiceV2 = Depends(get_matching_service),
    me = Depends(get_current_user),
):
    internal = MatchRequestV2Internal(**request.model_dump(), user_id=me["id"])
    return await matcher.find_match(internal)




@router.post("/cancel")
async def cancel_match_search(
    matcher: MatchingServiceV2 = Depends(get_matching_service),
    me = Depends(get_current_user),
):
    removed = matcher.cancel_match_search(me["id"])
    return {"success": removed, "message": "Removed from queue" if removed else "User was not in queue"}


@router.get("/status")
async def get_status(
    matcher: MatchingServiceV2 = Depends(get_matching_service),
    me = Depends(get_current_user),
):
    return matcher.get_queue_status(me["id"])



@router.get("/stats")
async def get_queue_stats(
    matcher: MatchingServiceV2 = Depends(get_matching_service)
):
    """
    Get global queue statistics

    GET /api/match/stats

    Response example:
    {
        "total_in_queue": 15,
        "by_mode": {
            "human_anonymous": 8,
            "human_non_anonymous": 7
        },
        "by_role": {
            "seeker": 5,
            "supporter": 6,
            "either": 4
        },
        "by_emotion_category": {
            "positive": 3,
            "neutral": 5,
            "negative": 7
        }
    }
    """
    return matcher.get_queue_stats()


# ============================================================================
# Helper APIs - Get available options
# ============================================================================

@router.get("/emotions")
async def get_available_emotions():
    """
    Get all available emotion types and their categories

    GET /api/match/emotions
    """
    return {
        "emotions": {
            "positive": [
                {"value": "happy", "label": "Happy", "emoji": "😊"},
                {"value": "excited", "label": "Excited", "emoji": "🎉"},
                {"value": "grateful", "label": "Grateful", "emoji": "🙏"},
                {"value": "hopeful", "label": "Hopeful", "emoji": "🌟"},
                {"value": "calm", "label": "Calm", "emoji": "😌"},
            ],
            "neutral": [
                {"value": "warm", "label": "Warm", "emoji": "💛"},
                {"value": "friendly", "label": "Friendly", "emoji": "🤝"},
                {"value": "neutral", "label": "Neutral", "emoji": "😐"},
                {"value": "curious", "label": "Curious", "emoji": "🤔"},
            ],
            "negative": [
                {"value": "sad", "label": "Sad", "emoji": "😢"},
                {"value": "anxious", "label": "Anxious", "emoji": "😰"},
                {"value": "stressed", "label": "Stressed", "emoji": "😫"},
                {"value": "lonely", "label": "Lonely", "emoji": "😔"},
                {"value": "frustrated", "label": "Frustrated", "emoji": "😤"},
                {"value": "overwhelmed", "label": "Overwhelmed", "emoji": "😵"},
                {"value": "uncertain", "label": "Uncertain", "emoji": "😕"},
                {"value": "distant", "label": "Distant", "emoji": "🥺"},
            ]
        },
        "description": {
            "positive": "Positive emotions - suitable for supporter role",
            "neutral": "Neutral/supportive emotions - flexible matching",
            "negative": "Negative emotions - recommend matching with supporter"
        }
    }


@router.get("/roles")
async def get_available_roles():
    """
    Get all available roles

    GET /api/match/roles
    """
    return {
        "roles": [
            {
                "value": "seeker",
                "label": "Seeking Support",
                "description": "I need someone to listen and support me",
                "emoji": "🙋"
            },
            {
                "value": "supporter",
                "label": "Providing Support",
                "description": "I'm willing to listen and help others",
                "emoji": "🤗"
            },
            {
                "value": "either",
                "label": "Either",
                "description": "I can both share and listen",
                "emoji": "💬"
            }
        ],
        "matching_rules": [
            "seeker + supporter = best match (4 points)",
            "either + any role = good match (2-3 points)",
            "seeker + seeker = only allowed with low emotion intensity"
        ]
    }


@router.get("/needs")
async def get_available_needs():
    """
    Get all available support need types

    GET /api/match/needs
    """
    return {
        "needs": [
            {
                "value": "vent",
                "label": "Vent",
                "description": "I just want to talk, no advice needed",
                "emoji": "💭"
            },
            {
                "value": "advice",
                "label": "Advice",
                "description": "I want concrete suggestions",
                "emoji": "💡"
            },
            {
                "value": "companion",
                "label": "Companion",
                "description": "I just want someone to chat with",
                "emoji": "🫂"
            },
            {
                "value": "distraction",
                "label": "Distraction",
                "description": "I want to take my mind off things",
                "emoji": "🎮"
            }
        ]
    }


@router.get("/topics")
async def get_available_topics():
    """
    Get all available topic tags

    GET /api/match/topics
    """
    return {
        "topics": [
            {"value": "general", "label": "General Chat", "emoji": "💬"},
            {"value": "relationships", "label": "Relationships", "emoji": "💑"},
            {"value": "anxiety", "label": "Anxiety", "emoji": "😰"},
            {"value": "depression", "label": "Depression", "emoji": "😞"},
            {"value": "work_stress", "label": "Work Stress", "emoji": "💼"},
            {"value": "academic", "label": "Academic", "emoji": "📚"},
            {"value": "family", "label": "Family", "emoji": "👨‍👩‍👧"},
            {"value": "loneliness", "label": "Loneliness", "emoji": "🏠"},
            {"value": "self_esteem", "label": "Self Esteem", "emoji": "🪞"}
        ],
        "related_groups": [
            ["anxiety", "depression"],
            ["work_stress", "academic"],
            ["relationships", "family"],
            ["loneliness", "self_esteem"]
        ]
    }


@router.get("/matching-rules")
async def get_matching_rules():
    """
    Get matching rules explanation

    GET /api/match/matching-rules
    """
    return {
        "principles": [
            {
                "name": "Role Complementarity",
                "description": "Seekers should match supporters, not other seekers",
                "reason": "Research shows two support-seeking users may cause emotional contagion"
            },
            {
                "name": "Emotional Contagion Protection",
                "description": "Two high-intensity negative emotion users should not be paired",
                "reason": "Emotional contagion research shows negative emotions spread through mimicry"
            },
            {
                "name": "Need Alignment",
                "description": "Vent users should match listeners, advice users need experienced people",
                "reason": "7Cups research shows matching support expectations improves satisfaction"
            },
            {
                "name": "Safety First",
                "description": "Crisis users get professional resources, not normal matching",
                "reason": "Avoiding worst outcomes is the top priority for mental health platforms"
            }
        ],
        "scoring": {
            "role_complementarity": "0-4 points (seeker+supporter=4)",
            "need_alignment": "0-2 points",
            "topic_match": "0-2 points",
            "emotion_compatibility": "0-2 points",
            "penalties": "Negative emotion pairs get score reduction"
        },
        "minimum_score": 3.0,
        "research_sources": [
            "ACM CSCW 2022: Matching for Peer Support",
            "JMIR 2024: Trade-Offs for Online Mental Health Matching",
            "Emotional Contagion Research (Hatfield et al.)"
        ]
    }


@router.get("/compatible-emotions/{emotion}")
async def get_compatible_emotions(
    emotion: EmotionType,
    matcher: MatchingServiceV2 = Depends(get_matching_service)
):
    """
    Get emotions that are compatible with the given emotion

    GET /api/match/compatible-emotions/sad

    Response:
    {
        "emotion": "sad",
        "category": "negative",
        "best_matches": ["warm", "friendly", "calm", "hopeful"],
        "recommendation": "Negative emotion users match best with supportive/neutral emotions"
    }
    """
    category = matcher._get_emotion_category(emotion)
    
    if category.value == "negative":
        best_matches = ["warm", "friendly", "calm", "hopeful", "neutral"]
        recommendation = "Negative emotion users match best with supportive/neutral emotions"
    elif category.value == "positive":
        best_matches = ["happy", "excited", "warm", "friendly"]
        recommendation = "Positive emotion users can match with similar positive or neutral emotions"
    else:
        best_matches = ["warm", "friendly", "neutral", "curious"]
        recommendation = "Neutral emotion users are flexible and match well with most emotions"
    
    return {
        "emotion": emotion.value,
        "category": category.value,
        "best_matches": best_matches,
        "recommendation": recommendation
    }
