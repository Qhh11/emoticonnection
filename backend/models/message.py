"""
Message database model.
Represents chat messages with emotion analysis data.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime


class Message:
    """
    Message model for storing chat messages.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add relationships to User and Conversation models
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "messages"

    # Primary key
    # TODO: Implement ID field (UUID or Integer)
    # id = Column(...)

    # Foreign keys
    # TODO: Implement sender_id field
    # sender_id = Column(...)

    # TODO: Implement receiver_id field
    # receiver_id = Column(...)

    # TODO: Implement conversation_id field
    # conversation_id = Column(...)

    # Message content
    # TODO: Implement content field (Text type)
    # content = Column(...)

    # Timestamps
    # TODO: Implement created_at field
    # created_at = Column(DateTime, default=datetime.utcnow)

    # TODO: Implement updated_at field
    # updated_at = Column(...)

    # Message metadata
    # TODO: Implement is_read field (Boolean)
    # is_read = Column(...)

    # TODO: Implement read_at field (DateTime, nullable)
    # read_at = Column(...)

    # Emotion data (stored as JSON)
    # TODO: Implement emotion_data field (JSON type)
    # emotion_data = Column(JSON, nullable=True)
    # Structure: {
    #   "primary_emotion": str,
    #   "secondary_emotions": List[str],
    #   "tone": str,
    #   "intent": str,
    #   "confidence_scores": Dict[str, float],
    #   "sentiment_score": float
    # }

    # Relationships
    # TODO: Add relationship to User model (sender)
    # sender = relationship(...)

    # TODO: Add relationship to User model (receiver)
    # receiver = relationship(...)

    # TODO: Add relationship to Conversation model
    # conversation = relationship(...)

    def __repr__(self):
        """String representation of Message."""
        # TODO: Implement __repr__
        return f"<Message {self.id}>"

    def to_dict(self):
        """
        Convert message to dictionary.

        Returns:
            Dictionary representation of the message

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass


class Conversation:
    """
    Conversation model for grouping messages.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add relationships
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "conversations"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Participants (stored as JSON array of user IDs)
    # TODO: Implement participant_ids field
    # participant_ids = Column(JSON)

    # Metadata
    # TODO: Implement title field (optional conversation name)
    # title = Column(...)

    # TODO: Implement created_at field
    # created_at = Column(...)

    # TODO: Implement last_message_at field
    # last_message_at = Column(...)

    # Conversation settings (JSON)
    # TODO: Implement settings field
    # settings = Column(JSON, nullable=True)

    # Relationships
    # TODO: Add relationship to Message model
    # messages = relationship(...)

    def __repr__(self):
        """String representation of Conversation."""
        # TODO: Implement __repr__
        return f"<Conversation {self.id}>"

    def to_dict(self):
        """
        Convert conversation to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass


class EmotionAnalysis:
    """
    Emotion analysis model for storing detailed emotion data.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Link to messages
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "emotion_analyses"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Foreign key
    # TODO: Implement message_id field
    # message_id = Column(...)

    # TODO: Implement receiver_id field (who this analysis is for)
    # receiver_id = Column(...)

    # Emotion data
    # TODO: Implement primary_emotion field
    # primary_emotion = Column(...)

    # TODO: Implement secondary_emotions field (JSON array)
    # secondary_emotions = Column(JSON)

    # TODO: Implement tone field
    # tone = Column(...)

    # TODO: Implement intent field
    # intent = Column(...)

    # TODO: Implement sentiment_score field (Float)
    # sentiment_score = Column(...)

    # TODO: Implement confidence_scores field (JSON)
    # confidence_scores = Column(JSON)

    # Feedback
    # TODO: Implement is_accurate field (Boolean, nullable)
    # is_accurate = Column(...)

    # TODO: Implement corrected_emotion field (String, nullable)
    # corrected_emotion = Column(...)

    # TODO: Implement feedback_text field (Text, nullable)
    # feedback_text = Column(...)

    # Timestamp
    # TODO: Implement analyzed_at field
    # analyzed_at = Column(...)

    # Relationships
    # TODO: Add relationship to Message model
    # message = relationship(...)

    def __repr__(self):
        """String representation of EmotionAnalysis."""
        # TODO: Implement __repr__
        return f"<EmotionAnalysis {self.id}>"

    def to_dict(self):
        """
        Convert emotion analysis to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass
