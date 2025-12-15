from datetime import datetime
from typing import Any, Literal, Dict

class ConversationRecord:
    """Represents a single record of user interaction for storage."""
    def __init__(self, user_id: str, timestamp: datetime, query_text: str, 
                 response_text: str, sentiment: Literal['Positive', 'Neutral', 'Negative']):
        self.user_id = user_id
        self.timestamp = timestamp
        self.query_text = query_text
        self.response_text = response_text
        self.sentiment = sentiment

    def to_weaviate_dict(self) -> Dict[str, Any]:
        """Converts the class instance into a dictionary suitable for Weaviate ingestion."""
        ts_str = self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return {
        "userId": self.user_id,
        "timestamp": ts_str,  
        "userQuery": self.query_text,
        "llmResponse": self.response_text,
        "sentimentAnalysis": self.sentiment,
    }