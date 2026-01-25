"""
Matching Service V2 - Research-Based Complementary Matching

Based on research from:
- ACM CSCW 2022: "Matching for Peer Support" (7Cups study)
- JMIR 2024: "Trade-Offs for Online Mental Health Matching"
- Emotional Contagion research (Hatfield et al.)

Core Principles:
1. Role Complementarity > Emotion Similarity (seeker-supporter pairing)
2. Avoid High-Risk Pairs (two high-intensity negative emotion users)
3. Topic/Need Alignment (vent/advice/companion needs)
4. Emotional Contagion Protection (prevent negative emotion spreading)
5. Safety First (crisis users get professional resources)
"""

from typing import Dict, List, Union, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel, Field


class EmotionType(str, Enum):
    """Emotion types - categorized into positive, neutral, negative"""
    HAPPY = "happy"
    EXCITED = "excited"
    GRATEFUL = "grateful"
    HOPEFUL = "hopeful"
    CALM = "calm"
    WARM = "warm"
    FRIENDLY = "friendly"
    NEUTRAL = "neutral"
    CURIOUS = "curious"
    SAD = "sad"
    ANXIOUS = "anxious"
    STRESSED = "stressed"
    LONELY = "lonely"
    FRUSTRATED = "frustrated"
    OVERWHELMED = "overwhelmed"
    UNCERTAIN = "uncertain"
    DISTANT = "distant"


class EmotionCategory(str, Enum):
    """Emotion categories for quick classification"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class SupportRole(str, Enum):
    """User roles - core matching dimension"""
    SEEKER = "seeker"
    SUPPORTER = "supporter"
    EITHER = "either"


class SupportNeed(str, Enum):
    """Support need types"""
    VENT = "vent"
    ADVICE = "advice"
    COMPANION = "companion"
    DISTRACTION = "distraction"


class TopicTag(str, Enum):
    """Topic tags based on 7Cups research"""
    RELATIONSHIPS = "relationships"
    ANXIETY = "anxiety"
    DEPRESSION = "depression"
    WORK_STRESS = "work_stress"
    ACADEMIC = "academic"
    FAMILY = "family"
    LONELINESS = "loneliness"
    SELF_ESTEEM = "self_esteem"
    GENERAL = "general"


class RiskLevel(str, Enum):
    """Risk levels for safety protection"""
    SAFE = "safe"
    MODERATE = "moderate"
    HIGH = "high"
    CRISIS = "crisis"


class MatchMode(str, Enum):
    """Matching modes"""
    HUMAN_ANONYMOUS = "human_anonymous"
    HUMAN_NON_ANONYMOUS = "human_non_anonymous"
    AI_CHAT = "ai_chat"


class MatchRequestV2(BaseModel):
    current_emotion: EmotionType
    emotion_intensity: int = Field(default=3, ge=1, le=5)
    role: SupportRole = SupportRole.EITHER
    support_need: SupportNeed = SupportNeed.VENT
    topic: Optional[TopicTag] = TopicTag.GENERAL
    preferred_topics: Optional[List[TopicTag]] = None
    mode: MatchMode = MatchMode.HUMAN_ANONYMOUS
    risk_level: RiskLevel = RiskLevel.SAFE


class MatchRequestV2Internal(MatchRequestV2):
    user_id: str
    queued_at: datetime = Field(default_factory=datetime.utcnow)



class MatchResponseV2(BaseModel):
    """Enhanced match response"""
    matched: bool
    room_id: Optional[str] = None
    matched_user_id: Optional[str] = None
    is_anonymous: bool = True
    match_type: MatchMode
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    safety_tips: Optional[List[str]] = None
    queue_position: Optional[int] = None
    estimated_wait: Optional[str] = None


class QueueEntry(BaseModel):
    request: MatchRequestV2Internal
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    match_attempts: int = 0



class MatchingServiceV2:
    """
    Research-driven complementary matching service
    
    Design principles:
    1. Role Complementarity: seeker + supporter = best match
    2. Emotional Contagion Protection: avoid pairing two high-intensity negative users
    3. Need Alignment: match users by their support needs
    4. Topic Matching: similar topics increase resonance
    5. Safety First: crisis users get professional resources
    """
    
    def __init__(self):
        self.queues: Dict[MatchMode, List[QueueEntry]] = {
            MatchMode.HUMAN_ANONYMOUS: [],
            MatchMode.HUMAN_NON_ANONYMOUS: [],
        }
        self.active_matches: Dict[str, Tuple[str, str]] = {}
        self.user_match_map: Dict[str, dict] = {}
        self.queue_timeout = timedelta(minutes=10)
        
        self.emotion_categories: Dict[EmotionType, EmotionCategory] = {
            EmotionType.HAPPY: EmotionCategory.POSITIVE,
            EmotionType.EXCITED: EmotionCategory.POSITIVE,
            EmotionType.GRATEFUL: EmotionCategory.POSITIVE,
            EmotionType.HOPEFUL: EmotionCategory.POSITIVE,
            EmotionType.CALM: EmotionCategory.POSITIVE,
            EmotionType.WARM: EmotionCategory.NEUTRAL,
            EmotionType.FRIENDLY: EmotionCategory.NEUTRAL,
            EmotionType.NEUTRAL: EmotionCategory.NEUTRAL,
            EmotionType.CURIOUS: EmotionCategory.NEUTRAL,
            EmotionType.SAD: EmotionCategory.NEGATIVE,
            EmotionType.ANXIOUS: EmotionCategory.NEGATIVE,
            EmotionType.STRESSED: EmotionCategory.NEGATIVE,
            EmotionType.LONELY: EmotionCategory.NEGATIVE,
            EmotionType.FRUSTRATED: EmotionCategory.NEGATIVE,
            EmotionType.OVERWHELMED: EmotionCategory.NEGATIVE,
            EmotionType.UNCERTAIN: EmotionCategory.NEGATIVE,
            EmotionType.DISTANT: EmotionCategory.NEGATIVE,
        }
        
        self.supportive_emotions = {
            EmotionType.WARM, EmotionType.FRIENDLY, EmotionType.NEUTRAL,
            EmotionType.CALM, EmotionType.HOPEFUL, EmotionType.CURIOUS
        }
        self.pending_ttl = timedelta(minutes=0.5) 
        self.active_matches: Dict[str, dict] = {} 


    def _is_pending_valid(self, info: dict) -> bool:
        ts = info.get("created_at")
        if not ts:
            return False
        return datetime.utcnow() - ts < self.pending_ttl

    def _clear_match_state_for_users(self, user_a: str, user_b: str, room_id: Optional[str] = None):
        self.user_match_map.pop(user_a, None)
        self.user_match_map.pop(user_b, None)
        if room_id:
            self.active_matches.pop(room_id, None)

    async def find_match(self, request: MatchRequestV2Internal) -> MatchResponseV2:
        """Main matching entry point"""
        request.user_id = str(request.user_id)
        print(f"[MatchV2] === find_match called ===")
        print(f"[MatchV2] User: {request.user_id}")
        print(f"[MatchV2] Mode: {request.mode}")
        print(f"[MatchV2] Role: {request.role}, Need: {request.support_need}, Topic: {request.topic}")
        print(f"[MatchV2] Emotion: {request.current_emotion}, Intensity: {request.emotion_intensity}")
        if request.user_id in self.user_match_map:
            info = self.user_match_map[request.user_id]
            if info.get("state") == "pending" and self._is_pending_valid(info):
                return self._return_existing_match(request.user_id)
            # stale / already active -> allow rematch
            self.user_match_map.pop(request.user_id, None)

        if request.risk_level == RiskLevel.CRISIS:
            return self._handle_crisis_user(request)

        if request.user_id in self.user_match_map:
            return self._return_existing_match(request.user_id)

        self._cleanup_expired_entries()

        queue = self.queues.get(request.mode, [])
        print(f"[MatchV2] Queue size for {request.mode}: {len(queue)}")
        for i, entry in enumerate(queue):
            print(f"[MatchV2]   Queue[{i}]: user={entry.request.user_id}, role={entry.request.role}, emotion={entry.request.current_emotion}")

        best_match = self._find_best_match(request, queue)
        
        if best_match:
            return await self._create_match(request, best_match)
        
        self._add_to_queue(request)
        
        return MatchResponseV2(
            matched=False,
            is_anonymous=(request.mode == MatchMode.HUMAN_ANONYMOUS),
            match_type=request.mode,
            queue_position=self._get_queue_position(request.user_id, request.mode),
            estimated_wait=self._estimate_wait_time(request.mode),
            safety_tips=self._get_safety_tips(request)
        )

    def _min_required_score(self, attempts: int, waited_seconds: float) -> float:
        return max(1.5, 3.0 - 0.25 * attempts - 0.001 * waited_seconds)

    def _find_best_match(self, request: MatchRequestV2Internal, queue: List[QueueEntry]) -> Optional[QueueEntry]:
        """Find the best match from queue"""
        candidates: List[Tuple[QueueEntry, float, str]] = []

        for entry in queue:
            other = entry.request
            if other.user_id == request.user_id:
                print(f"[MatchV2] Skipping self: {other.user_id}")
                continue
            if not self._is_safe_to_match(request, other):
                print(f"[MatchV2] Not safe to match with {other.user_id}")
                continue

            score, reason = self._calculate_match_score(request, other)
            print(f"[MatchV2] Score with {other.user_id}: {score:.2f} (min required: 3.0)")

            waited = (datetime.utcnow() - entry.joined_at).total_seconds()
            min_req = self._min_required_score(entry.match_attempts, waited)
            if score >= min_req:
                candidates.append((entry, score, reason))
            else:
                print(f"[MatchV2] Score too low, not adding to candidates")

        if not candidates:
            print(f"[MatchV2] No candidates found, user will be added to queue")
            return None

        candidates.sort(key=lambda x: x[1], reverse=True)
        best = candidates[0]
        print(f"[MatchV2] Found match candidate: score={best[1]:.2f}, reason={best[2]}")
        return best[0]

    def _is_safe_to_match(self, a: MatchRequestV2Internal, b: MatchRequestV2Internal) -> bool:
        """Check if two users can be safely paired"""
        if a.risk_level == RiskLevel.CRISIS or b.risk_level == RiskLevel.CRISIS:
            return False
        if a.risk_level == RiskLevel.HIGH and b.risk_level == RiskLevel.HIGH:
            return False
        
        a_neg_high = (self._get_emotion_category(a.current_emotion) == EmotionCategory.NEGATIVE 
                      and a.emotion_intensity >= 4)
        b_neg_high = (self._get_emotion_category(b.current_emotion) == EmotionCategory.NEGATIVE 
                      and b.emotion_intensity >= 4)
        
        if a_neg_high and b_neg_high:
            if a.role == SupportRole.SEEKER and b.role == SupportRole.SEEKER:
                return False
        return True

    def _calculate_match_score(self, a: MatchRequestV2Internal, b: MatchRequestV2Internal) -> Tuple[float, str]:
        """Calculate match score (0-10 scale)"""
        score = 0.0
        reasons = []
        
        role_score = self._score_role_complementarity(a, b)
        score += role_score
        if role_score >= 3:
            reasons.append("role_complement")
        
        need_score = self._score_need_alignment(a, b)
        score += need_score
        if need_score >= 1.5:
            reasons.append("need_match")
        
        topic_score = self._score_topic_match(a, b)
        score += topic_score
        if topic_score >= 1.5:
            reasons.append("topic_match")
        
        emotion_score = self._score_emotion_compatibility(a, b)
        score += emotion_score
        if emotion_score >= 1.5:
            reasons.append("emotion_fit")
        
        if (self._get_emotion_category(a.current_emotion) == EmotionCategory.NEGATIVE and
            self._get_emotion_category(b.current_emotion) == EmotionCategory.NEGATIVE):
            penalty = min(a.emotion_intensity, b.emotion_intensity) * 0.3
            score -= penalty
            if penalty > 0:
                reasons.append("negative_penalty")
        
        return score, "+".join(reasons) if reasons else "basic"

    def _score_role_complementarity(self, a: MatchRequestV2, b: MatchRequestV2) -> float:
        """Score role complementarity (max 4 points)"""
        if (a.role == SupportRole.SEEKER and b.role == SupportRole.SUPPORTER) or \
           (a.role == SupportRole.SUPPORTER and b.role == SupportRole.SEEKER):
            return 4.0
        if a.role == SupportRole.EITHER or b.role == SupportRole.EITHER:
            if a.role != SupportRole.EITHER or b.role != SupportRole.EITHER:
                return 3.0
            return 2.0
        if a.role == SupportRole.SUPPORTER and b.role == SupportRole.SUPPORTER:
            return 1.5
        if a.role == SupportRole.SEEKER and b.role == SupportRole.SEEKER:
            if a.emotion_intensity <= 2 and b.emotion_intensity <= 2:
                return 1.0
            return 0.0
        return 1.0

    def _score_need_alignment(self, a: MatchRequestV2, b: MatchRequestV2) -> float:
        """Score need alignment (max 2 points)"""
        if (a.role == SupportRole.SEEKER and b.role == SupportRole.SUPPORTER) or \
           (b.role == SupportRole.SEEKER and a.role == SupportRole.SUPPORTER):
            return 2.0
        if a.support_need == b.support_need:
            return 1.5
        if a.support_need == SupportNeed.COMPANION or b.support_need == SupportNeed.COMPANION:
            return 1.0
        return 0.5

    def _score_topic_match(self, a: MatchRequestV2, b: MatchRequestV2) -> float:
        """Score topic match (max 2 points)"""
        if a.topic == b.topic:
            return 2.0
        if a.preferred_topics and b.topic in a.preferred_topics:
            return 1.5
        if b.preferred_topics and a.topic in b.preferred_topics:
            return 1.5
        if a.topic == TopicTag.GENERAL or b.topic == TopicTag.GENERAL:
            return 1.0
        related = [
            {TopicTag.ANXIETY, TopicTag.DEPRESSION},
            {TopicTag.WORK_STRESS, TopicTag.ACADEMIC},
            {TopicTag.RELATIONSHIPS, TopicTag.FAMILY},
            {TopicTag.LONELINESS, TopicTag.SELF_ESTEEM},
        ]
        for group in related:
            if a.topic in group and b.topic in group:
                return 1.2
        return 0.5

    def _score_emotion_compatibility(self, a: MatchRequestV2, b: MatchRequestV2) -> float:
        """Score emotion compatibility (max 2 points)"""
        a_cat = self._get_emotion_category(a.current_emotion)
        b_cat = self._get_emotion_category(b.current_emotion)
        
        if a_cat == EmotionCategory.NEGATIVE and b.current_emotion in self.supportive_emotions:
            return 2.0
        if b_cat == EmotionCategory.NEGATIVE and a.current_emotion in self.supportive_emotions:
            return 2.0
        if a_cat == EmotionCategory.NEGATIVE and b_cat != EmotionCategory.NEGATIVE:
            return 1.5
        if b_cat == EmotionCategory.NEGATIVE and a_cat != EmotionCategory.NEGATIVE:
            return 1.5
        if a_cat == EmotionCategory.POSITIVE and b_cat == EmotionCategory.POSITIVE:
            return 1.5
        if a_cat == EmotionCategory.NEUTRAL and b_cat == EmotionCategory.NEUTRAL:
            return 1.0
        if a_cat == EmotionCategory.NEGATIVE and b_cat == EmotionCategory.NEGATIVE:
            if (a.emotion_intensity + b.emotion_intensity) / 2 <= 2:
                return 0.5
            return 0.0
        return 0.5

    def _get_emotion_category(self, emotion: EmotionType) -> EmotionCategory:
        """Get emotion category"""
        return self.emotion_categories.get(emotion, EmotionCategory.NEUTRAL)

    async def _create_match(self, request: MatchRequestV2Internal, matched_entry: QueueEntry) -> MatchResponseV2:
        """Create match and generate chat room"""
        matched_request = matched_entry.request
        
        queue = self.queues.get(request.mode, [])
        self.queues[request.mode] = [
            e for e in queue
            if e.request.user_id not in (matched_request.user_id, request.user_id)
        ]

        is_anonymous = request.mode == MatchMode.HUMAN_ANONYMOUS
        
        from app.modules.chat.api.chat_http import get_chat_repo, _get_or_create_room
        repo = get_chat_repo()
        room = await _get_or_create_room(repo, user1_id=request.user_id,
                                         user2_id=matched_request.user_id, is_anonymous=is_anonymous,
                                         source='matching')
        
        room_id = room["id"]
        match_score, match_reason = self._calculate_match_score(request, matched_request)
        now = datetime.utcnow()
        self.active_matches[room_id] = {
            "users": (request.user_id, matched_request.user_id),
            "ack": {request.user_id: False, matched_request.user_id: False},
            "created_at": now,
        }

        self.user_match_map[request.user_id] = {
            "room_id": room_id,
            "peer_id": matched_request.user_id,
            "is_anonymous": is_anonymous,
            "mode": request.mode,
            "score": match_score,
            "reason": match_reason,
            "state": "pending",
            "created_at": now,
        }
        self.user_match_map[matched_request.user_id] = {
            "room_id": room_id,
            "peer_id": request.user_id,
            "is_anonymous": is_anonymous,
            "mode": request.mode,
            "score": match_score,
            "reason": match_reason,
            "state": "pending",
            "created_at": now,
        }
        
        print(f"[MatchV2] Created match: User {request.user_id} <-> User {matched_request.user_id} "
              f"(score={match_score:.2f}, reason={match_reason})")
        
        return MatchResponseV2(
            matched=True, room_id=room_id, matched_user_id=matched_request.user_id,
            is_anonymous=is_anonymous, match_type=request.mode,
            match_score=match_score, match_reason=match_reason,
            safety_tips=self._generate_match_tips(request, matched_request)
        )

    def ack_match(self, user_id: str, room_id: str) -> bool:
        st = self.active_matches.get(room_id)
        if not st:
            return False

        u1, u2 = st["users"]
        if user_id not in (u1, u2):
            return False

        st["ack"][user_id] = True

        if st["ack"].get(u1) and st["ack"].get(u2):
            self._clear_match_state_for_users(u1, u2, room_id=room_id)
        else:
            info = self.user_match_map.get(user_id)
            if info and info.get("room_id") == room_id:
                info["state"] = "active"

        return True

    def _add_to_queue(self, request: MatchRequestV2Internal) -> None:
        """Add to matching queue"""
        queue = self.queues.get(request.mode, [])
        self.queues[request.mode] = [e for e in queue if e.request.user_id != request.user_id]
        self.queues[request.mode].append(QueueEntry(request=request))
        print(f"[MatchV2] User {request.user_id} added to queue. Size: {len(self.queues[request.mode])}")

    def _cleanup_expired_entries(self) -> None:
        """Clean up expired queue entries"""
        cutoff = datetime.utcnow() - self.queue_timeout
        for mode in self.queues:
            original = len(self.queues[mode])
            self.queues[mode] = [e for e in self.queues[mode] if e.joined_at > cutoff]
            removed = original - len(self.queues[mode])
            if removed > 0:
                print(f"[MatchV2] Cleaned {removed} expired entries from {mode.value} queue")

    def _handle_crisis_user(self, request: MatchRequestV2) -> MatchResponseV2:
        """Handle crisis user with professional resources"""
        return MatchResponseV2(
            matched=False, is_anonymous=True, match_type=request.mode,
            safety_tips=[
                "We noticed you might be going through a difficult time.",
                "Please consider contacting professional mental health resources:",
                "- National Crisis Hotline (US): 988",
                "- Crisis Text Line: Text HOME to 741741",
                "You are not alone. Professional help can make you feel better."
            ]
        )

    def _return_existing_match(self, user_id: str) -> MatchResponseV2:
        """Return existing match"""
        info = self.user_match_map[user_id]
        return MatchResponseV2(
            matched=True, room_id=info["room_id"], matched_user_id=info["peer_id"],
            is_anonymous=info["is_anonymous"], match_type=info["mode"],
            match_score=info.get("score"), match_reason=info.get("reason")
        )

    def _get_queue_position(self, user_id: str, mode: MatchMode) -> int:
        """Get queue position"""
        queue = self.queues.get(mode, [])
        for i, entry in enumerate(queue):
            if entry.request.user_id == user_id:
                return i + 1
        return len(queue) + 1

    def _estimate_wait_time(self, mode: MatchMode) -> str:
        """Estimate wait time"""
        size = len(self.queues.get(mode, []))
        if size == 0: return "Usually 1-2 minutes"
        if size < 5: return "About 1-3 minutes"
        if size < 10: return "About 3-5 minutes"
        return "About 5-10 minutes"

    def _get_safety_tips(self, request: MatchRequestV2) -> List[str]:
        """Get safety tips based on user state"""
        tips = []
        if request.risk_level == RiskLevel.HIGH:
            tips.extend(["If you feel uncomfortable, you can end the conversation anytime.",
                        "For professional help, please contact a mental health hotline."])
        if self._get_emotion_category(request.current_emotion) == EmotionCategory.NEGATIVE:
            tips.extend(["Remember, your feelings are valid and accepted.",
                        "Your match partner is here to listen and support you."])
        if request.role == SupportRole.SUPPORTER:
            tips.extend(["Thank you for being willing to help others!",
                        "Remember: listening is often more important than giving advice."])
        return tips if tips else None

    def _generate_match_tips(self, a: MatchRequestV2, b: MatchRequestV2) -> List[str]:
        """Generate tips after match"""
        tips = []
        if a.role == SupportRole.SEEKER:
            tips.extend(["You've been matched with someone willing to listen.", "Feel free to share your feelings."])
        elif a.role == SupportRole.SUPPORTER:
            tips.extend(["Your match partner may need someone to listen.",
                        "Try using open-ended questions instead of direct advice."])
        return tips

    def cancel_match_search(self, user_id: str) -> bool:
        """Cancel match search"""
        removed = False
        for mode in self.queues:
            original = len(self.queues[mode])
            self.queues[mode] = [e for e in self.queues[mode] if e.request.user_id != user_id]
            if len(self.queues[mode]) < original:
                removed = True
        if user_id in self.user_match_map:
            peer_id = self.user_match_map[user_id].get("peer_id")
            del self.user_match_map[user_id]
            if peer_id and peer_id in self.user_match_map:
                del self.user_match_map[peer_id]
        if removed:
            print(f"[MatchV2] User {user_id} cancelled search")
        return removed

    def get_queue_status(self, user_id: str) -> dict:
        if user_id in self.user_match_map:
            info = self.user_match_map[user_id]
            if info.get("state") == "pending" and self._is_pending_valid(info):
                return {
                    "matched": True,
                    "room_id": info["room_id"],
                    "matched_user_id": info["peer_id"],
                    "is_anonymous": info["is_anonymous"],
                    "match_type": info["mode"],
                    "match_score": info.get("score"),
                    "match_reason": info.get("reason"),
                }
            self.user_match_map.pop(user_id, None)

        for mode, queue in self.queues.items():
            for i, entry in enumerate(queue):
                if entry.request.user_id == user_id:
                    return {
                        "matched": False,
                        "in_queue": True,
                        "mode": mode.value,
                        "emotion": entry.request.current_emotion.value,
                        "role": entry.request.role.value,
                        "need": entry.request.support_need.value,
                        "queued_at": entry.joined_at.isoformat(),
                        "queue_position": i + 1,
                        "total_in_queue": len(queue),
                        "estimated_wait": self._estimate_wait_time(mode),
                    }

        return {"matched": False, "in_queue": False}



    def get_queue_stats(self) -> dict:
        """Get queue statistics"""
        stats = {"total_in_queue": 0, "by_mode": {},
                 "by_role": {"seeker": 0, "supporter": 0, "either": 0},
                 "by_emotion_category": {"positive": 0, "neutral": 0, "negative": 0}}
        for mode, queue in self.queues.items():
            stats["by_mode"][mode.value] = len(queue)
            stats["total_in_queue"] += len(queue)
            for entry in queue:
                stats["by_role"][entry.request.role.value] += 1
                stats["by_emotion_category"][self._get_emotion_category(entry.request.current_emotion).value] += 1
        return stats


matching_service_v2 = MatchingServiceV2()
