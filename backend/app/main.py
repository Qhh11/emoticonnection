"""
FastAPI Main Application Entry Point

This is where we start the FastAPI server and register all routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
# Import API routes from modular structure
from app.modules.chat.api import chat_http, chat_ws, match, media
from app.modules.ai.api import ai_chat, emotion
# Import database connection management
from app.database.mongodb import connect_to_mongodb, close_mongodb_connection
from app.modules.post.api import post_http

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to MongoDB on startup
    await connect_to_mongodb()

    print("=" * 60)
    print("🚀 EmotiConnect Chat API Starting...")
    print("=" * 60)
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🔌 WebSocket Chat: ws://localhost:8000/ws/rooms/{room_id}")
    print("💬 HTTP Chat API: http://localhost:8000/api/chat")
    print("🎯 Matching API: http://localhost:8000/api/match")
    print("🤖 AI Chat API: http://localhost:8000/api/ai-chat")
    print("😊 Emotion API: http://localhost:8000/api/emotion")
    print("=" * 60)

    yield

    # Close MongoDB connection on shutdown
    await close_mongodb_connection()
    print("\n👋 EmotiConnect Chat API Shutting down...")


# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title="EmotiConnect Chat API",
    description="Real-time chat and social feed with emotion-aware messaging.",
    version="2.1.0",
    lifespan=lifespan
)

# ============================================================================
# CORS Configuration (for frontend access)
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Register Routers
# ============================================================================

# HTTP REST API routes (/chat/rooms, /chat/rooms/{id}/messages, etc.)
app.include_router(chat_http.router, prefix="/api")
# WebSocket routes (/ws/rooms/{id})
app.include_router(chat_ws.router)
app.include_router(match.router, prefix="/api")
# Media upload routes (/media/upload, /media/info, etc.)
app.include_router(media.router, prefix="/api")
# AI Chat routes (from teammate)
app.include_router(ai_chat.router, prefix="/api/ai-chat", tags=["ai-chat"])
app.include_router(emotion.router, prefix="/api/emotion", tags=["emotion"])
# Post/Feed routes
app.include_router(post_http.router, prefix="/api")
# static path
BASE_DIR = Path(__file__).resolve().parent.parent          
STATIC_DIR = BASE_DIR / "static"                         
app.mount(
    "/static",                                             
    StaticFiles(directory=str(STATIC_DIR)),     
    name="static",
)

# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/", tags=["health"])
def root():
    """
    Health check endpoint

    ENDPOINT: GET /

    Returns basic API information
    """
    return {
        "message": "EmotiConnect API is running!",
        "version": "2.1.0",
        "endpoints": {
            "chat_api": "/api/chat",
            "posts_api": "/api/posts",
            "ai_chat": "/api/ai-chat",
            "emotion": "/api/emotion",
            "matching": "/api/match",
            "websocket": "/ws/rooms/{room_id}",
            "docs": "/docs"
        }
    }


@app.get("/health", tags=["health"])
def health_check():
    """
    Health check for monitoring

    ENDPOINT: GET /health
    """
    return {"status": "healthy"}


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Runs when the server starts

    Good place for:
    - Database connection initialization
    - Loading configuration
    - Starting background tasks
    """
    # Connect to MongoDB
    await connect_to_mongodb()

    print("=" * 60)
    print("🚀 EmotiConnect Chat API Starting...")
    print("=" * 60)
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🔌 WebSocket Endpoint: ws://localhost:8000/ws/rooms/{room_id}")
    print("💬 HTTP API: http://localhost:8000/api/chat")
    print("🤖 AI Chat API: http://localhost:8000/api/ai-chat")
    print("😊 Emotion API: http://localhost:8000/api/emotion")
    print("🌐 Chat test page:  http://localhost:8000/static/chat_test.html")
    print("🌐 Match test page:  http://localhost:8000/static/match_test.html")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs when the server stops

    Good place for:
    - Closing database connections
    - Cleaning up resources
    """
    # Close MongoDB connection
    await close_mongodb_connection()

    print("\n👋 EmotiConnect Chat API Shutting down...")

