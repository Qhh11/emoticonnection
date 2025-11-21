"""
User repository for database operations related to users and profiles.
"""

from typing import List, Optional
from sqlalchemy.orm import Session


class UserRepository:
    """Repository for user and profile CRUD operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: dict):
        """Create a new user. TODO: Implement with password hashing"""
        pass

    def get_user_by_id(self, user_id: str):
        """Get user by ID. TODO: Implement"""
        pass

    def get_user_by_email(self, email: str):
        """Get user by email. TODO: Implement"""
        pass

    def get_user_by_username(self, username: str):
        """Get user by username. TODO: Implement"""
        pass

    def update_user(self, user_id: str, user_data: dict):
        """Update user. TODO: Implement"""
        pass

    def create_profile(self, profile_data: dict):
        """Create user profile. TODO: Implement"""
        pass

    def get_profile(self, user_id: str):
        """Get user profile. TODO: Implement"""
        pass

    def update_profile(self, user_id: str, profile_data: dict):
        """Update user profile. TODO: Implement"""
        pass

    def update_interests(self, user_id: str, add_interests: List[str], remove_interests: List[str]):
        """Update user interests. TODO: Implement"""
        pass
