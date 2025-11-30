# Quick Start Guide - Chat AI Integration

## Branch: `chat-ai-integration`

This branch integrates Chat module and AI module into a unified system.

## Project Structure

```
backend/
├── app/
│   ├── modules/
│   │   ├── chat/              # Peer chat module
│   │   │   ├── api/           # Endpoints (chat_http, chat_ws, match, media)
│   │   │   ├── schemas/       # Data models
│   │   │   └── services/      # WebSocket manager, matching service
│   │   └── ai/                # AI module
│   │       ├── api/           # AI endpoints (ai_chat, emotion)
│   │       └── core/          # AI services
│   └── main.py                # FastAPI application
├── static/
│   ├── chat_main.html         # Main page
│   ├── ai_chat.html           # AI chat interface
│   ├── peer_chat.html         # Peer chat interface
│   └── uploads/               # Media uploads (gitignored)
├── requirements.txt
└── .env.example
```

## Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Run Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test

Open browser:
- **Main Page**: http://localhost:8000/static/chat_main.html
- **AI Chat**: http://localhost:8000/static/ai_chat.html
- **Peer Chat**: http://localhost:8000/static/peer_chat.html
- **API Docs**: http://localhost:8000/docs

## Features

- **AI Chat**: Emotional support chatbot (Google Gemini)
- **Peer Chat**: Real-time messaging with emotion analysis
- **Emotion Analysis**: AI analyzes emotions (visible to receiver only)
- **Media**: Text, emoji, images, videos

## API Key

Get your Gemini API key: https://makersuite.google.com/app/apikey
