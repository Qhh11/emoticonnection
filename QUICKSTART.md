# EmotiConnect - Quick Start Guide

## Overview

EmotiConnect is a real-time chat application with AI-powered emotion analysis. This branch (`chat-ai-integration`) integrates the Chat module and AI module with MongoDB for persistent storage.

### Key Features
- **Dashboard**: Central hub for all features
- **Authentication**: User login and registration system
- **Real-time Peer Chat**: WebSocket-based instant messaging
- **AI Chat**: Emotional support chatbot powered by Google Gemini
- **AI Diary**: Daily emotional summary and journaling
- **Emotion Analysis**: AI analyzes message emotions (text messages only)
- **Multiple Message Types**: Text, emoji, images, videos, audio
- **Anonymous Chat**: Optional anonymous mode with identity reveal
- **Persistent Storage**: MongoDB database for message history

---

## Project Structure

```
emoticonnection/
├── database/                        # Unified database layer (team-shared)
│   ├── config/
│   │   └── mongodb_config.py       # MongoDB connection & lifecycle
│   ├── models/                     # Database models (Pydantic)
│   │   ├── chat.py                 # ChatSession, ChatMessage
│   │   ├── user.py                 # User model
│   │   ├── following.py            # Following relationship model
│   │   ├── community.py            # Post, Comment models
│   │   ├── diary.py                # Diary model
│   │   └── emotion_log.py          # Emotion analytics
│   ├── crud/                       # Synchronous CRUD operations
│   │   ├── chat_session_crud.py
│   │   ├── chat_message_crud.py
│   │   ├── user_crud.py
│   │   ├── following_crud.py       # Following relationship CRUD
│   │   └── diary_crud.py
│   └── .env                        # Database config (gitignored)
│
├── backend/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/               # Authentication module
│   │   │   │   ├── api/            # Login/Register endpoints
│   │   │   │   └── schemas/        # Auth schemas
│   │   │   ├── chat/               # Chat module
│   │   │   │   ├── api/
│   │   │   │   │   ├── chat_http.py   # REST API endpoints
│   │   │   │   │   └── chat_ws.py     # WebSocket real-time chat
│   │   │   │   ├── repository/
│   │   │   │   │   └── chat_repository.py
│   │   │   │   ├── schemas/
│   │   │   │   │   └── chat.py
│   │   │   │   └── services/       # WebSocket manager
│   │   │   ├── social/             # Social/Following module
│   │   │   │   └── api/
│   │   │   │       └── following.py   # Following/contacts endpoints
│   │   │   ├── post/               # Post/Feed module
│   │   │   │   ├── api/
│   │   │   │   ├── repository/
│   │   │   │   └── schemas/
│   │   │   └── ai/                 # AI module
│   │   │       ├── api/            # AI chat + emotion endpoints
│   │   │       └── core/
│   │   │           └── emotion.py  # Emotion analysis service
│   │   └── main.py                 # FastAPI application
│   ├── static/
│   │   ├── index.html              # Dashboard (Main Entry)
│   │   ├── login.html              # Login page
│   │   ├── register.html           # Register page
│   │   ├── discover.html           # Discover people page
│   │   ├── ai_chat.html            # AI chat interface
│   │   ├── peer_chat.html          # Peer chat interface
│   │   ├── diary_view.html         # Diary interface
│   │   └── uploads/                # Media uploads (gitignored)
│   ├── requirements.txt
│   ├── start.sh                    # Startup script
│   ├── .env                        # Backend config (gitignored)
│   └── .venv/                      # Python virtual environment
│
└── mongodb_data/                   # Local MongoDB data (gitignored)
```

### Architecture Notes

**Unified Database Layer (`database/`)**:
- Shared by all team members
- Contains models enhanced with backend-required fields (media_url, emotion, is_anonymous)
- Provides both sync CRUD (for scripts) and async support (via repositories)

**Backend Repositories**:
- Async wrappers around database operations
- Located in each module's `repository/` folder
- Optimized for FastAPI's async framework

**Separation of Concerns**:
- `database/models/` - Database schema (team-shared)
- `backend/app/modules/*/schemas/` - API request/response models (module-specific)
- `backend/app/modules/*/repository/` - Async database operations (module-specific)

---

## Setup Instructions

This project assumes you installed MongoDB Community Edition by downloading the **macOS archive (.tgz)** from the official website.

#### **Installation Steps**

1. **Download MongoDB Community Server:**
    https://www.mongodb.com/try/download/community

2. **Extract the archive** and move it into `/usr/local/mongodb`:

   ```
   sudo mkdir -p /usr/local/mongodb
   sudo mv ~/Downloads/mongodb-macos-x86_64--*/ /usr/local/mongodb/
   ```

3. **Add MongoDB to your PATH** (adjust directory name accordingly):

   ```
   echo 'export PATH=/usr/local/mongodb/mongodb-macos-x86_64--8.2.2/bin:$PATH' >> ~/.bash_profile
   source ~/.bash_profile
   ```

4. **Verify installation:**

   ```
   mongod --version
   ```

------

### 2. Create MongoDB Data Directory

MongoDB requires a directory to store data files.

```
mkdir -p /Users/YOUR_USERNAME/emoticonnection/mongodb_data
```

------

### 3. Start MongoDB Server

Start MongoDB manually using the downloaded binaries:

```
mongod --dbpath /Users/YOUR_USERNAME/emoticonnection/mongodb_data
```

If the server starts correctly, you should see:

```
Waiting for connections on port 27017
```

Keep this terminal window open.

------

### 4. Connect to MongoDB

In a second terminal:

```
mongosh
```

Expected output:

```
Connecting to: mongodb://127.0.0.1:27017
Using MongoDB: 8.2.x
```

You are now connected to the local database instance.

### 5. Setup Python Environment and Run
We have simplified this process with a startup script.

```bash
# Navigate to backend
cd backend

# Make script executable (first time only)
chmod +x start.sh

# Run the startup script (installs dependencies and starts server)
./start.sh
```

**Manual Setup (Alternative):**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Configure Environment Variables

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
Use the helper script:

```bash
cd backend
./start.sh
```

Or manually:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Open Application in Browser

### 3. Open Application in Browser

- **Dashboard (Main Page)**: http://localhost:8000/static/index.html
- **Login**: http://localhost:8000/static/login.html
- **Community Chat**: http://localhost:8000/static/peer_chat.html
- **AI Chat**: http://localhost:8000/static/ai_chat.html
- **Diary View**: http://localhost:8000/static/diary_view.html
- **API Documentation**: http://localhost:8000/docs

---

## Database Architecture

### Repository Pattern

This project uses the **Repository Pattern** to separate database operations from API logic:

```
API Layer (chat_http.py, chat_ws.py, post_http.py)
         ↓
Repository Layer (chat_repository.py, post_repository.py)
         ↓
Unified Database Config (database/config/mongodb_config.py)
         ↓
MongoDB (chat_sessions, chat_messages, posts, etc.)
```

**Benefits**:
- Clean separation of concerns
- Easy to test and maintain
- Async repositories optimized for FastAPI
- Unified database configuration across all modules

### Two-Layer Architecture

**Database Layer** (`database/`):
- **Purpose**: Team-shared database models and configuration
- **Type**: Synchronous operations (for scripts, initialization)
- **Used by**: Database team, initialization scripts

**Repository Layer** (`backend/app/modules/*/repository/`):
- **Purpose**: FastAPI-specific async database operations
- **Type**: Asynchronous operations (for API endpoints)
- **Used by**: Chat module, Post module, and other backend modules

### Enhanced Database Models

The database models in `database/models/chat.py` have been **enhanced** to support all backend features:

**ChatMessage enhancements**:
- `message_type`: "text" | "emoji" | "image" | "video" | "audio" | "system"
- `media_url`: URL for image/video files (backend requirement)
- `emotion`: AI-analyzed emotion for text messages (backend requirement)

**ChatSession enhancements**:
- `is_anonymous`: Anonymous chat mode flag (backend requirement)
- `user1_revealed`, `user2_revealed`: Identity reveal status (backend requirement)

### MongoDB Collections

#### Collection: `chat_sessions`
Stores chat room information:
- `_id`: MongoDB ObjectId (exposed as `id` in API)
- `user_id`, `peer_user_id`: User identifiers (string)
- `is_anonymous`: Anonymous mode flag (boolean)
- `user1_revealed`, `user2_revealed`: Identity reveal status (boolean)
- `status`: "active" | "ended" | "reported"
- `started_at`, `ended_at`: Timestamps

#### Collection: `chat_messages`
Stores all chat messages:
- `_id`: MongoDB ObjectId (exposed as `id` in API)
- `session_id`: Reference to chat_sessions (string)
- `sender_id`: User who sent the message (string)
- `content`: Message text
- `message_type`: "text" | "emoji" | "image" | "video" | "audio" | "system"
- `media_url`: URL for media files (images/videos)
- `emotion`: AI-analyzed emotion (for text messages)
- `safety_flag`: "safe" | "warning" | "danger"
- `created_at`: Timestamp
- `is_deleted`: Soft delete flag

#### Collection: `posts`
Stores social feed posts:
- `_id`: MongoDB ObjectId (exposed as `id` in API)
- `author_id`: User who created the post (int)
- `content`: Post text
- `post_type`: "text" | "image" | "video" | "mixed"
- `media_urls`: Array of media file URLs
- `is_anonymous`: Anonymous post flag
- `visibility`: "public" | "anonymous" | "friends_only"
- `tags`: Array of tags
- `emotion`, `ai_emotion`: User-specified and AI-analyzed emotions
- `created_at`: Timestamp

#### Collection: `post_comments`
Stores comments on posts (created when comments exist)

#### Collection: `post_likes`
Stores likes on posts (created when likes exist)

---

## Database Management Scripts

The `database/` folder contains useful scripts for managing test data:

### 1. Create Test Users (`create_test_users.py`)

Creates 4 test users for quick testing:

```bash
cd /Users/lyr22ryl/emoticonnection/database
python3 create_test_users.py
```

**Creates:**
- alice (password: password123)
- bob (password: password123)
- charlie (password: password123)
- david (password: password123)

**Use Case:** Quick setup for testing peer chat, following, and social features.

### 2. Clear Chat History (`clear_chat_history.py`)

Deletes all chat sessions and messages while **keeping users and follows**:

```bash
cd /Users/lyr22ryl/emoticonnection/database
python3 clear_chat_history.py
```

**Deletes:**
- All chat sessions
- All chat messages

**Preserves:**
- Users
- Following relationships

**Use Case:** Clean slate for demos without losing user accounts.

### 3. Reset All Data (`reset_all_data.py`)

Completely wipes the database for a fresh start:

```bash
cd /Users/lyr22ryl/emoticonnection/database
python3 reset_all_data.py
```

**Deletes:**
- All users
- All chat sessions
- All chat messages
- All following relationships

**Requires confirmation:** You must type `DELETE ALL` to confirm.

**Use Case:** Complete reset for testing registration → login → chat flow from scratch.

### Typical Testing Workflow

**Initial Setup:**
```bash
# 1. Reset everything
cd database
python3 reset_all_data.py   # Type: DELETE ALL

# 2. Create test users
python3 create_test_users.py

# 3. Start testing
# - Open browser: http://localhost:8000/static/login.html
# - Login with alice/bob/charlie/david (password: password123)
# - Test peer chat, following, etc.
```

**For Demos:**
```bash
# Clear chat history but keep users
cd database
python3 clear_chat_history.py   # Type: yes

# Now you have clean chat but existing users
```

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
