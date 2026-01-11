from datetime import datetime
from typing import Any, Literal, Dict

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

class AIConversationRecord:
    """Represents a record of AI-generated conversation """
    def __init__(self, user_id: str, timestamp: datetime, ai_response: str, 
                 confidence_score: float):
        self.user_id = user_id
        self.timestamp = timestamp
        self.ai_response = ai_response
        self.confidence_score = confidence_score

    def to_weaviate_dict(self) -> Dict[str, Any]:
        """Converts the class instance into a dictionary suitable for Weaviate ingestion."""
        ts_str = self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return {
            "userId": self.user_id,
            "timestamp": ts_str,
            "aiResponse": self.ai_response,
            "confidenceScore": self.confidence_score,
        }