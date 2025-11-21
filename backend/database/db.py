"""
Database connection and session management.
SQLAlchemy setup and configuration.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings


# TODO: Create SQLAlchemy engine
# engine = create_engine(
#     settings.database_url,
#     connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
# )

# TODO: Create SessionLocal class
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# TODO: Create Base class for models
# Base = declarative_base()


def get_db():
    """
    Dependency function for getting database sessions.

    Yields:
        Database session

    TODO:
    - Create database session
    - Yield session for use in endpoints
    - Close session after use

    Usage in FastAPI endpoints:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    # TODO: Implement database session dependency
    # db = SessionLocal()
    # try:
    #     yield db
    # finally:
    #     db.close()
    pass


def init_db():
    """
    Initialize database tables.

    TODO:
    - Import all models
    - Create all tables using Base.metadata.create_all()
    - Run any initial migrations
    - Seed initial data if needed
    """
    # TODO: Import all models here to register them
    # from models import message, post, user_profile

    # TODO: Create tables
    # Base.metadata.create_all(bind=engine)
    pass


def reset_db():
    """
    Reset database (drop and recreate all tables).

    WARNING: This will delete all data!

    TODO:
    - Drop all tables
    - Recreate all tables
    - Use only for development/testing
    """
    # TODO: Implement database reset
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)
    pass
