from datetime import datetime
from typing import Any, Literal, Dict, List, Optional
from dataclasses import dataclass

@dataclass
class EmotionDataPoint:
    """Single emotion data point for time series analysis."""
    timestamp: str
    emotion: str
    intensity: float  # 0-1 scale
    sentiment_score: float  # -1 to 1 scale
    trigger_context: Optional[str] = None


@dataclass
class EmotionWordCloud:
    """Word cloud data structure."""
    words: Dict[str, int]  # word -> frequency
    top_emotions: List[str]
    total_count: int


@dataclass
class EmotionTrend:
    """Emotion trend over time."""
    period: str  # 'daily', 'weekly', 'monthly'
    data_points: List[Dict[str, Any]]  # [{date, avg_score, dominant_emotion}]
    trend_direction: str  # 'improving', 'declining', 'stable'
    volatility: float  # 0-1 scale


@dataclass
class TriggerAnalysis:
    """Common trigger scenario analysis."""
    trigger_type: str  # e.g., 'work', 'relationships', 'health'
    frequency: int
    associated_emotions: List[str]
    example_contexts: List[str]
    impact_score: float  # -1 to 1


@dataclass
class EmotionSummary:
    """Complete emotion analytics summary."""
    user_id: str
    period_type: Literal['daily', 'weekly', 'monthly']
    start_date: str
    end_date: str
    
    # Core metrics
    average_mood_score: float  # -1 to 1
    mood_stability: float  # 0-1, higher is more stable
    total_interactions: int
    
    # Analysis components
    emotion_distribution: Dict[str, float]  # emotion -> percentage
    emotion_trend: EmotionTrend
    word_cloud: EmotionWordCloud
    triggers: List[TriggerAnalysis]
    
    # AI-generated content
    summary_text: str
    key_insights: List[str]
    suggestions: List[str]
    trend_prediction: str
class ConversationRecord:
    """Represents a single record of conversation between two users for storage."""
    def __init__(self, user_id1: str, user_id2: str, timestamp: datetime, query_text: str, 
                 response_text: str, sentiment: Literal['Positive', 'Neutral', 'Negative']):
        self.user_id1 = user_id1
        self.user_id2 = user_id2
        self.timestamp = timestamp
        self.query_text = query_text
        self.response_text = response_text
        self.sentiment = sentiment

    def to_weaviate_dict(self) -> Dict[str, Any]:
        """Converts the class instance into a dictionary suitable for Weaviate ingestion."""
        ts_str = self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return {
            "userId1": self.user_id1,
            "userId2": self.user_id2,
            "timestamp": ts_str,  
            "userQuery": self.query_text,
            "llmResponse": self.response_text,
            "sentimentAnalysis": self.sentiment,
        }


@dataclass
class EmotionConversationRecord:
    """
    Represents an emotion-analyzed conversation record for Weaviate storage.
    Used for storing chat message emotion analysis results.
    """
    user_id1: str  # Sender ID
    user_id2: str  # Receiver ID (can be empty for single messages)
    timestamp: str  # ISO format timestamp
    user_query: str  # Original message content
    emotion: str  # Analyzed emotion (one of 9 categories)
    intensity: float  # Emotion intensity (0.0-1.0)
    sentiment_score: float  # Sentiment score (-1.0 to 1.0)
    trigger_context: Optional[str] = None  # Trigger context description
    message_id: str = ""  # MongoDB message ID
    session_id: str = ""  # Chat room/session ID
    emotion_color: str = "#808080"  # Hex color for the emotion
    
    # Emotion color mapping
    EMOTION_COLORS: Dict[str, str] = None  # Will be set as class variable
    
    def __post_init__(self):
        """Set emotion color based on emotion type."""
        colors = {
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
        self.emotion_color = colors.get(self.emotion.lower(), '#808080')
    
    def to_weaviate_dict(self) -> Dict[str, Any]:
        """Converts the class instance into a dictionary suitable for Weaviate ingestion."""
        return {
            "userId1": self.user_id1,
            "userId2": self.user_id2,
            "timestamp": self.timestamp,
            "userQuery": self.user_query,
            "emotion": self.emotion,
            "intensity": self.intensity,
            "sentimentScore": self.sentiment_score,
            "triggerContext": self.trigger_context or "",
            "messageId": self.message_id,
            "sessionId": self.session_id,
            "emotionColor": self.emotion_color,
        }

class AIConversationRecord:
    """Represents a record of AI-generated conversation """
    def __init__(self, user_id: str, timestamp: datetime, ai_response: str, 
                 confidence_score: float):
        self.user_id = user_id
        self.timestamp = timestamp
        self.ai_response = ai_response
        self.confidence_score = confidence_score
        self.conversation_id = f"conv_{int(timestamp.timestamp())}_{user_id}"

    def to_weaviate_dict(self) -> Dict[str, Any]:
        """Converts the class instance into a dictionary suitable for Weaviate ingestion."""
        ts_str = self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return {
            "userId": self.user_id,
            "conversationId": self.conversation_id,
            "timestamp": ts_str,
            "aiResponse": self.ai_response,
            "confidenceScore": self.confidence_score,
        }