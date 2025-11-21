# EmotiConnect Setup Guide

## Overview
This is a complete scaffold for the EmotiConnect project. All files contain function stubs with TODO comments for your team to implement.

## Project Structure

```
EmotiConnect/
├── backend/          # FastAPI backend (Python)
├── frontend/         # Next.js frontend (TypeScript)
├── README.md         # Project overview
└── SETUP.md         # This file
```

## Backend Setup (FastAPI + Python)

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your LLM API keys and other configuration
```

### 3. Initialize Database
```bash
# TODO: Run database migrations or initialization script
# python -c "from database.db import init_db; init_db()"
```

### 4. Run Backend
```bash
uvicorn main:app --reload
# Backend will run on http://localhost:8000
# API docs available at http://localhost:8000/docs
```

## Frontend Setup (Next.js + TypeScript)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local if needed (default API URL is http://localhost:8000)
```

### 3. Run Frontend
```bash
npm run dev
# Frontend will run on http://localhost:3000
```

## Implementation Tasks

### Backend Tasks

1. **Database Models** (models/)
   - Complete SQLAlchemy model definitions
   - Add relationships between models
   - Implement `to_dict()` methods

2. **LLM Integration** (llm/)
   - Configure LLM client with your provider (OpenAI, Anthropic, etc.)
   - Implement emotion classification
   - Implement interest extraction
   - Implement persona generation

3. **Services** (services/)
   - Implement business logic
   - Connect to LLM clients
   - Add database operations

4. **Routers** (routers/)
   - Implement API endpoints
   - Add authentication middleware
   - Set up WebSocket handlers

5. **Database Repositories** (database/repositories/)
   - Implement CRUD operations
   - Add query methods

### Frontend Tasks

1. **API Services** (src/services/)
   - Implement API fetch functions
   - Add error handling
   - Set up WebSocket client

2. **Hooks** (src/hooks/)
   - Implement React hooks
   - Add state management
   - Connect to API services

3. **Components** (src/components/)
   - Build UI components
   - Add styling
   - Implement user interactions

4. **Context Providers** (src/context/)
   - Complete authentication logic
   - Set up global state management

5. **Pages** (src/app/)
   - Implement page layouts
   - Add routing
   - Connect components

## Key Features to Implement

### 1. Emotion Analysis
- [ ] Message tone classification (receiver-only)
- [ ] Emotion history tracking
- [ ] Emotion insights dashboard
- [ ] Feedback collection for model improvement

### 2. Chat System
- [ ] Real-time messaging via WebSocket
- [ ] Conversation management
- [ ] Read receipts
- [ ] Typing indicators

### 3. Posts with Tags
- [ ] Post creation with emotion/interest tags
- [ ] Personalized feed
- [ ] Post reactions
- [ ] Interest-based filtering

### 4. User Profiles
- [ ] Emotion-personality profiles
- [ ] Interest management
- [ ] Personality insights generation
- [ ] Communication style analysis

### 5. Gift Suggestions
- [ ] Interest-based gift recommendations
- [ ] Scenario-based matching
- [ ] Gift feedback system
- [ ] Trending gifts

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## LLM Integration Notes

All LLM-related TODOs are marked with:
- `# TODO: call LLM API for tone classification`
- `# TODO: extract interest embeddings`
- `# TODO: generate persona profile`
- `# TODO: compute gift recommendations`

Choose your LLM provider and implement the client in `backend/llm/llm_client.py`.

## Architecture Notes

### Backend Architecture
- **Routers**: Handle HTTP requests
- **Services**: Business logic layer
- **Repositories**: Database access layer
- **Models**: SQLAlchemy ORM models
- **Schemas**: Pydantic validation schemas
- **LLM**: AI/ML integration layer

### Frontend Architecture
- **Pages**: Next.js app router pages
- **Components**: Reusable React components
- **Hooks**: Custom React hooks for state/logic
- **Services**: API client functions
- **Context**: Global state providers
- **Utils**: Helper functions

## Team Workflow

1. **Choose a feature** from the list above
2. **Find the TODOs** in relevant files
3. **Implement the logic** following the docstrings
4. **Test your implementation**
5. **Update this checklist**

## Need Help?

- Check function docstrings for implementation guidance
- Review type definitions in `schemas/` (backend) and `types/` (frontend)
- Refer to FastAPI docs: https://fastapi.tiangolo.com/
- Refer to Next.js docs: https://nextjs.org/docs

Good luck with your implementation! 🚀
