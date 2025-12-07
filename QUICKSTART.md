# EmotiConnect - Quick Start Guide

## Overview

EmotiConnect is a real-time chat application with AI-powered emotion analysis. This branch (`chat-ai-integration`) integrates the Chat module and AI module with MongoDB for persistent storage.

### Key Features
- **Real-time Peer Chat**: WebSocket-based instant messaging
- **AI Chat**: Emotional support chatbot powered by Google Gemini
- **Emotion Analysis**: AI analyzes message emotions (text messages only)
- **Multiple Message Types**: Text, emoji, images, videos, audio
- **Anonymous Chat**: Optional anonymous mode with identity reveal
- **Persistent Storage**: MongoDB database for message history

---

## Project Structure

```
backend/
├── app/
│   ├── database/                    # MongoDB integration (NEW)
│   │   ├── mongodb.py              # Database connection
│   │   └── models.py               # Extended models
│   ├── modules/
│   │   ├── chat/                   # Peer chat module
│   │   │   ├── api/                # HTTP + WebSocket endpoints
│   │   │   ├── repository/         # Database operations (NEW)
│   │   │   ├── schemas/            # Request/response models
│   │   │   └── services/           # WebSocket manager, matching
│   │   └── ai/                     # AI module
│   │       ├── api/                # AI chat + emotion endpoints
│   │       └── core/               # AI services
│   └── main.py                     # FastAPI application
├── static/
│   ├── chat_main.html              # Main page
│   ├── ai_chat.html                # AI chat interface
│   ├── peer_chat.html              # Peer chat interface
│   └── uploads/                    # Media uploads (gitignored)
├── requirements.txt
└── .env
```

---

## Setup Instructions

### 1. Install MongoDB

Choose one of the following methods:

#### Option A: Homebrew (macOS - Recommended)
```bash
# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB Community Edition
brew install mongodb-community@8.0

# Start MongoDB service
brew services start mongodb-community
```

#### Option B: Manual Download (if Homebrew fails)
```bash
# Download MongoDB from official site
# Visit: https://www.mongodb.com/try/download/community

# Extract to a directory (e.g., /usr/local/mongodb/)
# Create data directory
mkdir -p /Users/YOUR_USERNAME/emoticonnection/mongodb_data

# Start MongoDB manually
/path/to/mongodb/bin/mongod --dbpath /Users/YOUR_USERNAME/emoticonnection/mongodb_data
```

#### Option C: Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

### 2. Verify MongoDB is Running

```bash
# Check if MongoDB is listening on port 27017
lsof -i :27017

# Connect to MongoDB shell to verify
mongosh

# Expected output:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017
# Using MongoDB: 8.x.x
```

### 3. Setup Python Environment

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies (includes motor and pymongo for MongoDB)
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and add the following:
```

Your `.env` file should contain:
```env
# Google Gemini API Key for AI emotion analysis
GEMINI_API_KEY=your_actual_gemini_api_key_here

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=emotionconnect
```

Get your Gemini API key: https://makersuite.google.com/app/apikey

---

## Running the Application

### 1. Start MongoDB (if not already running)

```bash
# If using Homebrew:
brew services start mongodb-community

# If using manual installation:
/path/to/mongodb/bin/mongod --dbpath /path/to/mongodb_data

# If using Docker:
docker start mongodb
```

### 2. Start Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected console output:
```
✅ Connected to MongoDB: emotionconnect
============================================================
🚀 EmotiConnect Chat API Starting...
============================================================
📝 API Documentation: http://localhost:8000/docs
🔌 WebSocket Chat: ws://localhost:8000/ws/rooms/{room_id}
💬 HTTP Chat API: http://localhost:8000/api/chat
🎯 Matching API: http://localhost:8000/api/match
🤖 AI Chat API: http://localhost:8000/api/ai-chat
😊 Emotion API: http://localhost:8000/api/emotion
============================================================
```

### 3. Open Application in Browser

- **Main Page**: http://localhost:8000/static/chat_main.html
- **AI Chat**: http://localhost:8000/static/ai_chat.html
- **Peer Chat**: http://localhost:8000/static/peer_chat.html
- **Match Test**: http://localhost:8000/static/match_test.html
- **API Documentation**: http://localhost:8000/docs

---

## Database Architecture

### Repository Pattern

This project uses the **Repository Pattern** to separate database operations from API logic:

```
API Layer (chat_http.py, chat_ws.py)
         ↓
Repository Layer (chat_repository.py)
         ↓
MongoDB (chat_sessions, chat_messages)
```

**Benefits**:
- Clean separation of concerns
- Easy to test and maintain
- Can switch databases without changing API code

### Extended Models

The project includes **extended database models** (`backend/app/database/models.py`) that support additional features:

- `message_type`: "text" | "emoji" | "image" | "video" | "audio"
- `media_url`: URL for image/video files
- `emotion`: AI-analyzed emotion for text messages

These fields extend beyond the base database schema to support all backend features.

### MongoDB Collections

#### Collection: `chat_sessions`
Stores chat room information:
- `_id`: MongoDB ObjectId (exposed as `id` in API)
- `user_id`, `peer_user_id`: User identifiers
- `is_anonymous`: Anonymous mode flag
- `user1_revealed`, `user2_revealed`: Identity reveal status
- `status`: "active" | "ended" | "reported"
- `started_at`, `ended_at`: Timestamps

#### Collection: `chat_messages`
Stores all messages:
- `_id`: MongoDB ObjectId (exposed as `id` in API)
- `session_id`: Reference to chat_sessions
- `sender_id`: User who sent the message
- `content`: Message text
- `message_type`: "text" | "emoji" | "image" | "video" | "audio"
- `media_url`: URL for media files (images/videos)
- `emotion`: AI-analyzed emotion (for text messages)
- `created_at`: Timestamp

---

## Testing the Integration

### 1. Test with MongoDB Compass (Visual Tool)

```bash
# Download MongoDB Compass: https://www.mongodb.com/products/compass

# Connect to: mongodb://localhost:27017

# Navigate to database: emotionconnect
# View collections: chat_sessions, chat_messages
```

### 2. Test with API (curl)

#### Create a Chat Room
```bash
curl -X POST http://localhost:8000/api/chat/rooms \
  -H "Content-Type: application/json" \
  -d '{"user1_id": 1, "user2_id": 2}'
```

Expected response:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "user1_id": 1,
  "user2_id": 2,
  "is_anonymous": false,
  "created_at": "2025-12-07T..."
}
```

#### Send a Text Message (with AI Emotion Analysis)
```bash
curl -X POST http://localhost:8000/api/chat/rooms/{room_id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "content": "I am so happy today!",
    "message_type": "text"
  }'
```

Expected response:
```json
{
  "id": "507f1f77bcf86cd799439012",
  "room_id": "507f1f77bcf86cd799439011",
  "sender_id": 1,
  "content": "I am so happy today!",
  "message_type": "text",
  "emotion": "Happiness",
  "created_at": "2025-12-07T..."
}
```

#### Send an Image Message
```bash
curl -X POST http://localhost:8000/api/chat/rooms/{room_id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "content": "Check this out!",
    "message_type": "image",
    "media_url": "/static/uploads/test.jpg"
  }'
```

#### Get Message History
```bash
curl http://localhost:8000/api/chat/rooms/{room_id}/messages
```

### 3. Test with Browser

1. Open [http://localhost:8000/static/peer_chat.html](http://localhost:8000/static/peer_chat.html)
2. Enter User ID (e.g., 1) and Peer ID (e.g., 2)
3. Click "Connect"
4. Send messages (text, emoji, or media)
5. Verify messages appear in real-time
6. Check MongoDB Compass to see saved messages

### 4. Verify Data Persistence

```bash
# Send some messages
# Stop the backend server (Ctrl+C)
# Restart the server
uvicorn app.main:app --reload

# Get message history - messages should still exist
curl http://localhost:8000/api/chat/rooms/{room_id}/messages
```

---

## Git Workflow

### What to Push to Repository

**DO PUSH** (already tracked):
- All `.py` files (code changes)
- `requirements.txt` (dependencies)
- `.gitignore` (ignore rules)
- Frontend files (`static/*.html`)
- Documentation files (`.md`)

**DO NOT PUSH** (already in `.gitignore`):
- `.env` (contains secrets like `GEMINI_API_KEY`)
- `.venv/` (virtual environment)
- `mongodb_data/` (local database files)
- `mongodb.log` (database logs)
- `static/uploads/*` (user-uploaded media)
- `__pycache__/`, `*.pyc` (Python bytecode)

### Committing Your Changes

```bash
# Check status
git status

# Add modified files
git add backend/app/
git add backend/requirements.txt
git add QUICKSTART.md

# Create commit
git commit -m "feat: integrate MongoDB database with chat module

- Add MongoDB connection and lifecycle management
- Create repository layer for database operations
- Add extended models to support all backend features
- Convert all API endpoints to async with MongoDB
- Update WebSocket handler to persist messages
- Add support for text, emoji, image, video messages
- Preserve AI emotion analysis functionality
- Update documentation in QUICKSTART.md"

# Push to remote
git push origin chat-ai-integration
```

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Symptoms**: Backend shows error or missing "✅ Connected to MongoDB" message

**Solutions**:
```bash
# Check if MongoDB is running
lsof -i :27017

# If not running, start it:
# Homebrew:
brew services start mongodb-community

# Manual:
/path/to/mongodb/bin/mongod --dbpath /path/to/mongodb_data

# Docker:
docker start mongodb
```

### Issue: "Module 'motor' not found"

**Symptoms**: Import error when starting backend

**Solution**:
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Issue: "500 Internal Server Error" when creating room

**Cause**: Pydantic schema validation error (ID type mismatch)

**Solution**: Already fixed in `backend/app/modules/chat/schemas/chat.py` - all ID fields changed from `int` to `str` to match MongoDB ObjectId format

### Issue: Import statements showing red in VSCode

**Cause**: VSCode Python language server hasn't refreshed

**Solutions**:
- Reload VSCode window: `Cmd + Shift + P` → "Developer: Reload Window"
- Reselect Python interpreter: `Cmd + Shift + P` → "Python: Select Interpreter" → choose `.venv`
- Restart VSCode

**Note**: Red squiggles don't affect actual execution if packages are installed correctly

### Issue: "Emotion analysis not working"

**Symptoms**: Messages don't have `emotion` field

**Solutions**:
- Check `GEMINI_API_KEY` in `.env` is valid
- Verify you're sending `message_type: "text"` (only text messages get emotion analysis)
- Check backend logs for Google AI API errors

### Issue: "Messages not saved to database"

**Solutions**:
```bash
# Verify MongoDB connection
mongosh
use emotionconnect
db.chat_messages.find().count()

# Check backend logs for errors
# Restart backend server
```

---

## API Documentation

### Interactive API Docs

Open http://localhost:8000/docs for full Swagger UI with:
- All endpoints listed
- Request/response schemas
- "Try it out" interactive testing

### Key Endpoints

#### Chat Rooms
- `POST /api/chat/rooms` - Create or get chat room
- `GET /api/chat/rooms/{room_id}` - Get room details
- `GET /api/chat/users/{user_id}/rooms` - Get user's rooms
- `POST /api/chat/rooms/{room_id}/reveal` - Reveal identity in anonymous chat

#### Messages
- `POST /api/chat/rooms/{room_id}/messages` - Send message (with AI emotion analysis)
- `GET /api/chat/rooms/{room_id}/messages` - Get message history
- `WS /ws/rooms/{room_id}` - WebSocket for real-time chat

#### AI Features
- `POST /api/ai-chat/sessions` - Create AI chat session
- `POST /api/ai-chat/sessions/{session_id}/messages` - Chat with AI
- `POST /api/emotion/analyze` - Analyze text emotion

#### Media Upload
- `POST /api/media/upload` - Upload image/video/audio
- `GET /api/media/info/{filename}` - Get media info

---

## Performance & Security Notes

### MongoDB Indexes

For better query performance, create indexes:
```javascript
// Connect to MongoDB shell
mongosh

use emotionconnect

// Create indexes for frequently queried fields
db.chat_sessions.createIndex({user_id: 1})
db.chat_sessions.createIndex({peer_user_id: 1})
db.chat_messages.createIndex({session_id: 1, created_at: 1})
```

### Production Considerations

**Before deploying to production**:
1. **MongoDB Authentication**: Enable auth and create user credentials
   ```bash
   # In mongosh:
   use admin
   db.createUser({
     user: "emoticonnect_user",
     pwd: "secure_password",
     roles: [{role: "readWrite", db: "emotionconnect"}]
   })

   # Update .env:
   MONGODB_URL=mongodb://127.0.0.1:27017
   ```

2. **CORS Configuration**: Update `backend/app/main.py` to restrict origins:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend-domain.com"],  # Not "*"
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **MongoDB SSL/TLS**: Enable encrypted connections in production

4. **Environment Variables**: Use proper secrets management (not .env file)

5. **MongoDB Atlas**: Consider using MongoDB Atlas (cloud) instead of local MongoDB

---

## Architecture Summary

### What Changed from In-Memory to MongoDB

| Aspect | Before | After |
|--------|--------|-------|
| **Storage** | In-memory dicts (`_rooms`, `_messages`) | MongoDB collections |
| **IDs** | `int` (auto-increment) | `str` (MongoDB ObjectId) |
| **Functions** | `def` (synchronous) | `async def` (asynchronous) |
| **Data Persistence** | Lost on restart | Permanent storage |
| **Dependency** | `DummyDB` | `ChatRepository` |

### What Stayed the Same

- All API endpoints (same URLs)
- All request/response formats
- All features (text, emoji, image, video, emotion, anonymous)
- Frontend code compatibility (uses string IDs)

---

## Summary

You now have a fully functional real-time chat application with:
- ✅ Persistent MongoDB storage
- ✅ AI-powered emotion analysis
- ✅ Support for text, emoji, images, videos, audio
- ✅ Real-time WebSocket communication
- ✅ Anonymous chat with identity reveal
- ✅ Clean repository architecture

**All backend features preserved while migrating to database!**

For questions or issues, check the troubleshooting section or review the API documentation at http://localhost:8000/docs when the server is running.
