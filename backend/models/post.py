"""
Post database model.
Represents user posts with emotion and interest tags.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from datetime import datetime


class Post:
    """
    Post model for user posts with emotion and interest tags.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add relationships
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "posts"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Foreign key
    # TODO: Implement author_id field
    # author_id = Column(...)

    # Post content
    # TODO: Implement content field (Text type)
    # content = Column(...)

    # TODO: Implement title field (optional)
    # title = Column(...)

    # Tags (stored as JSON arrays)
    # TODO: Implement emotion_tags field (JSON array of emotion strings)
    # emotion_tags = Column(JSON)

    # TODO: Implement interest_tags field (JSON array of interest strings)
    # interest_tags = Column(JSON)

    # Metadata
    # TODO: Implement visibility field (public/friends/private)
    # visibility = Column(...)

    # TODO: Implement view_count field
    # view_count = Column(Integer, default=0)

    # TODO: Implement reaction_counts field (JSON dict of emotion: count)
    # reaction_counts = Column(JSON, default={})

    # Timestamps
    # TODO: Implement created_at field
    # created_at = Column(...)

    # TODO: Implement updated_at field
    # updated_at = Column(...)

    # Relationships
    # TODO: Add relationship to User model (author)
    # author = relationship(...)

    # TODO: Add relationship to PostReaction model
    # reactions = relationship(...)

    def __repr__(self):
        """String representation of Post."""
        # TODO: Implement __repr__
        return f"<Post {self.id}>"

    def to_dict(self):
        """
        Convert post to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization including author info, tags, reactions
        """
        # TODO: Implement to_dict method
        pass


class PostReaction:
    """
    Post reaction model for emotion-based reactions to posts.

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add unique constraint on (post_id, user_id)
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "post_reactions"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Foreign keys
    # TODO: Implement post_id field
    # post_id = Column(...)

    # TODO: Implement user_id field (who reacted)
    # user_id = Column(...)

    # Reaction data
    # TODO: Implement reaction_type field (emotion string)
    # reaction_type = Column(...)

    # Timestamp
    # TODO: Implement created_at field
    # created_at = Column(...)

    # Relationships
    # TODO: Add relationship to Post model
    # post = relationship(...)

    # TODO: Add relationship to User model
    # user = relationship(...)

    def __repr__(self):
        """String representation of PostReaction."""
        # TODO: Implement __repr__
        return f"<PostReaction {self.id}>"

    def to_dict(self):
        """
        Convert reaction to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass


class PostComment:
    """
    Comment model for posts (optional feature).

    TODO:
    - Inherit from SQLAlchemy Base
    - Define table name
    - Add relationships
    """

    # TODO: Add SQLAlchemy table configuration
    __tablename__ = "post_comments"

    # Primary key
    # TODO: Implement ID field
    # id = Column(...)

    # Foreign keys
    # TODO: Implement post_id field
    # post_id = Column(...)

    # TODO: Implement author_id field
    # author_id = Column(...)

    # TODO: Implement parent_comment_id field (for nested comments, nullable)
    # parent_comment_id = Column(...)

    # Content
    # TODO: Implement content field
    # content = Column(...)

    # Emotion data (optional)
    # TODO: Implement emotion_data field (JSON, nullable)
    # emotion_data = Column(JSON, nullable=True)

    # Timestamp
    # TODO: Implement created_at field
    # created_at = Column(...)

    # Relationships
    # TODO: Add relationship to Post model
    # post = relationship(...)

    # TODO: Add relationship to User model (author)
    # author = relationship(...)

    def __repr__(self):
        """String representation of PostComment."""
        # TODO: Implement __repr__
        return f"<PostComment {self.id}>"

    def to_dict(self):
        """
        Convert comment to dictionary.

        Returns:
            Dictionary representation

        TODO: Implement serialization
        """
        # TODO: Implement to_dict method
        pass
