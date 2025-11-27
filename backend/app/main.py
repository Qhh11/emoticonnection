"""
FastAPI Main Application Entry Point

This is where we start the FastAPI server and register all routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
# Import routers
from app.api.v1.routers import chat_http, chat_ws, match

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("🚀 EmotiConnect Chat API Starting...")
    print("=" * 60)
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🔌 WebSocket Chat: ws://localhost:8000/ws/rooms/{room_id}")
    print("💬 HTTP Chat API: http://localhost:8000/api/v1/chat")
    print("🎯 Matching API: http://localhost:8000/api/v1/match")
    print("=" * 60)
    
    yield
    
    print("\n👋 EmotiConnect Chat API Shutting down...")


# ============================================================================
# Create FastAPI Application
# ============================================================================

app = FastAPI(
    title="EmotiConnect Chat API",
    description="Real-time chat module with emotion-aware messaging.",
    version="2.0.0",
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
app.include_router(chat_http.router, prefix="/api/v1")
# WebSocket routes (/ws/rooms/{id})
app.include_router(chat_ws.router)
app.include_router(match.router, prefix="/api/v1")

# static path
BASE_DIR = Path(__file__).resolve().parent.parent          
STATIC_DIR = BASE_DIR / "static"                         
app.mount(
    "/static",                                             
    StaticFiles(directory=str(STATIC_DIR), html=True),     
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
        "message": "EmotiConnect Chat API is running!",
        "version": "1.0.0",
        "endpoints": {
            "http_api": "/api/v1/chat",
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
    print("=" * 60)
    print("🚀 EmotiConnect Chat API Starting...")
    print("=" * 60)
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🔌 WebSocket Endpoint: ws://localhost:8000/ws/rooms/{room_id}")
    print("💬 HTTP API: http://localhost:8000/api/v1/chat")
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
    print("\n👋 EmotiConnect Chat API Shutting down...")


# ============================================================================
# TEACHING SUMMARY
# ============================================================================
"""
KEY CONCEPTS:

1. **FastAPI App**:
   - Central application object
   - Registers all routes
   - Handles middleware

2. **CORS**:
   - Allows frontend (running on different port) to access API
   - Required for browser-based apps
   - In production: specify exact frontend URL

3. **Router Registration**:
   - include_router() adds all routes from a router
   - prefix adds path prefix to all routes
   - Keeps code modular

4. **Lifecycle Events**:
   - startup: Initialize resources
   - shutdown: Clean up resources
   - Good for DB connections, caching, etc.

5. **Auto Documentation**:
   - FastAPI automatically generates /docs (Swagger UI)
   - Shows all endpoints, request/response formats
   - Interactive testing interface!

HOW TO RUN:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

NEXT:
Let's install dependencies and test it!
"""
