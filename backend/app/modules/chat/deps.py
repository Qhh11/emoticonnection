"""
Dependency Injection Layer

This file provides dependencies that can be injected into FastAPI routes.

WHY DO WE NEED THIS?
- FastAPI uses "Dependency Injection" pattern
- Dependencies are reusable components that routes can request
- Makes code modular and testable

CURRENT STATUS:
- We provide a placeholder DB dependency
- The DB team will replace this with real database connection later
"""
from typing import Generator
from app.modules.chat.services.ws_manager import ConnectionManager
from app.modules.chat.services.matching_service import MatchingService, matching_service

class DummyDB:
    """
    Placeholder database class

    TODO: This will be replaced by the database team with real DB session/connection

    WHY A DUMMY?
    - Our task is only to create the chat logic, not database implementation
    - This allows us to test the API without a real database
    - The DB team can easily replace this later

    Example of future implementation:
        class RealDB:
            def __init__(self, session: Session):
                self.session = session
    """
    pass


def get_db():
    """
    Database dependency for FastAPI

    HOW TO USE IN ROUTES:
        @router.get("/example")
        def example_route(db = Depends(get_db)):
            # db is automatically injected by FastAPI
            pass

    WHAT DOES 'yield' MEAN?
    - This is a generator function
    - Code before 'yield' runs BEFORE the route handler
    - Code after 'yield' runs AFTER the route handler (cleanup)
    - For now we just yield a dummy object

    TODO: Replace with real database session
    Example:
        def get_db():
            db = SessionLocal()  # Create DB session
            try:
                yield db  # Provide to route
            finally:
                db.close()  # Close after route finishes
    """
    yield DummyDB()

_ws_manager: ConnectionManager = None

def get_ws_manager() -> ConnectionManager:
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = ConnectionManager()
    return _ws_manager


def get_matching_service() -> MatchingService:
    return matching_service

