"""
User and profile database models.
Represents users, their profiles, and personality data.
"""

from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime


class User:
    """
    User model for authentication and basic info.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add relationships to all user-related models
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "users"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Authentication
    # TODO: Implement username field (unique)
    # username = Column(...)

    # TODO: Implement email field (unique)
    # email = Column(...)

    # TODO: Implement hashed_password field
    # hashed_password = Column(...)

    # Basic info
    # TODO: Implement display_name field
    # display_name = Column(...)

    # TODO: Implement bio field (Text, nullable)
    # bio = Column(...)

    # TODO: Implement avatar_url field (nullable)
    # avatar_url = Column(...)

    # Status
    # TODO: Implement is_active field
    # is_active = Column(Boolean, default=True)

    # TODO: Implement is_verified field
    # is_verified = Column(Boolean, default=False)

    # Timestamps
    # TODO: Implement created_at field
    # created_at = Column(...)

    # TODO: Implement last_login field
    # last_login = Column(...)

    # Relationships
    # TODO: Add relationship to UserProfile
    # profile = relationship(...)

    # TODO: Add relationship to sent messages
    # sent_messages = relationship(...)

    # TODO: Add relationship to received messages
    # received_messages = relationship(...)

    # TODO: Add relationship to posts
    # posts = relationship(...)

    def __repr__(self):
        """String representation of User."""
        # TODO: Implement __repr__
        return f"<User {self.username}>"

    def to_dict(self):
        """
        Convert user to dictionary (exclude sensitive data).

        Returns:
            Dictionary representation

        TODO: Implement serialization, exclude password
        """
        # TODO: Implement to_dict method
        pass


class UserProfile:
    """
    User profile model for emotion and personality data.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - One-to-one relationship with User
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "user_profiles"

    # Primary key / Foreign key
    # TODO: Implement user_id field (primary key, foreign key to users)
    # user_id = Column(...)

    # Interest tags (JSON array)
    # TODO: Implement interest_tags field
    # interest_tags = Column(JSON, default=[])

    # Interest embeddings (for matching)
    # TODO: Implement interest_embeddings field (JSON, nullable)
    # interest_embeddings = Column(JSON, nullable=True)

    # Emotion profile summary (JSON)
    # TODO: Implement emotion_profile field
    # emotion_profile = Column(JSON, nullable=True)
    # Structure: {
    #   "dominant_emotions": List[str],
    #   "emotion_distribution": Dict[str, float],
    #   "emotion_stability": float,
    #   "last_updated": datetime
    # }

    # Personality insights (JSON)
    # TODO: Implement personality_data field
    # personality_data = Column(JSON, nullable=True)
    # Structure: {
    #   "traits": Dict[str, float],
    #   "communication_style": str,
    #   "strengths": List[str],
    #   "growth_areas": List[str],
    #   "last_generated": datetime
    # }

    # Communication preferences
    # TODO: Implement communication_style field
    # communication_style = Column(...)

    # TODO: Implement preferred_tone field
    # preferred_tone = Column(...)

    # Onboarding data (JSON)
    # TODO: Implement onboarding_data field
    # onboarding_data = Column(JSON, nullable=True)

    # TODO: Implement onboarding_completed field
    # onboarding_completed = Column(Boolean, default=False)

    # Privacy settings (JSON)
    # TODO: Implement privacy_settings field
    # privacy_settings = Column(JSON, default={})

    # Statistics
    # TODO: Implement total_messages field
    # total_messages = Column(Integer, default=0)

    # TODO: Implement total_posts field
    # total_posts = Column(Integer, default=0)

    # Timestamps
    # TODO: Implement created_at field
    # created_at = Column(...)

    # TODO: Implement updated_at field
    # updated_at = Column(...)

    # TODO: Implement profile_last_analyzed field
    # profile_last_analyzed = Column(...)

    # Relationships
    # TODO: Add relationship to User model
    # user = relationship(...)

    def __repr__(self):
        """String representation of UserProfile."""
        # TODO: Implement __repr__
        return f"<UserProfile {self.user_id}>"

    def to_dict(self):
        """
        Convert profile to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization with all profile data
        """
        # TODO: Implement to_dict method
        pass


class GiftSuggestion:
    """
    Gift suggestion model for storing generated suggestions.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "gift_suggestions"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Foreign keys
    # TODO: Implement requester_id field (who requested suggestion)
    # requester_id = Column(...)

    # TODO: Implement recipient_id field (who gift is for)
    # recipient_id = Column(...)

    # Suggestion data
    # TODO: Implement gift_description field
    # gift_description = Column(...)

    # TODO: Implement gift_category field
    # gift_category = Column(...)

    # TODO: Implement reasoning field (why suggested)
    # reasoning = Column(...)

    # TODO: Implement relevance_score field (Float, 0-1)
    # relevance_score = Column(...)

    # TODO: Implement matched_interests field (JSON array)
    # matched_interests = Column(JSON)

    # Metadata
    # TODO: Implement occasion field (nullable)
    # occasion = Column(...)

    # TODO: Implement scenario_context field (JSON, nullable)
    # scenario_context = Column(JSON, nullable=True)

    # Feedback
    # TODO: Implement was_helpful field (Boolean, nullable)
    # was_helpful = Column(...)

    # TODO: Implement was_used field (Boolean, default=False)
    # was_used = Column(...)

    # TODO: Implement feedback_text field (Text, nullable)
    # feedback_text = Column(...)

    # Timestamp
    # TODO: Implement created_at field
    # created_at = Column(...)

    # Relationships
    # TODO: Add relationship to User model (requester)
    # requester = relationship(...)

    # TODO: Add relationship to User model (recipient)
    # recipient = relationship(...)

    def __repr__(self):
        """String representation of GiftSuggestion."""
        # TODO: Implement __repr__
        return f"<GiftSuggestion {self.id}>"

    def to_dict(self):
        """
        Convert gift suggestion to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass
