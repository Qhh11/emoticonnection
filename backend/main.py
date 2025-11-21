"""
Main FastAPI application entry point for EmotiConnect.
Configures routers, middleware, and application lifecycle.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# Import routers
from routers import chat, post, emotion, profile, gift


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured application instance

    TODO:
    - Add authentication middleware
    - Configure rate limiting
    - Add request logging
    - Set up WebSocket connections for real-time chat
    """
    app = FastAPI(
        title=settings.app_name,
        description="Emotion-aware social communication platform",
        version="0.1.0"
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
    app.include_router(post.router, prefix="/api/posts", tags=["posts"])
    app.include_router(emotion.router, prefix="/api/emotion", tags=["emotion"])
    app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
    app.include_router(gift.router, prefix="/api/gifts", tags=["gifts"])

    return app


app = create_app()


@app.on_event("startup")
async def startup_event():
    """
    Application startup event handler.

    TODO:
    - Initialize database connection
    - Create database tables if they don't exist
    - Initialize LLM client
    - Set up WebSocket manager
    - Load any cached data or models
    """
    print(f"{settings.app_name} is starting up...")
    # TODO: Add initialization logic here
    pass


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown event handler.

    TODO:
    - Close database connections
    - Clean up WebSocket connections
    - Save any pending data
    - Release resources
    """
    print(f"{settings.app_name} is shutting down...")
    # TODO: Add cleanup logic here
    pass


@app.get("/")
async def root():
    """
    Root endpoint - health check.

    Returns:
        dict: API status and version information
    """
    return {
        "message": f"Welcome to {settings.app_name} API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        dict: Service health status

    TODO:
    - Check database connectivity
    - Check LLM API availability
    - Return detailed health metrics
    """
    return {"status": "healthy"}
