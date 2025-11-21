# EmotiConnect

## Project Description
EmotiConnect is a generative AI-based social communication platform that provides:
- Emotion-aware messaging (real-time chat)
- Message tone classification via LLM API (receiver-only)
- User posts with emotion & interest tags
- Personalized emotion-personality profiles
- Gift suggestions based on inferred interests

## Project Structure

```
EmotiConnect/
├── backend/          # FastAPI backend
└── frontend/         # Next.js + TypeScript frontend
```

## Setup Instructions

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Team Tasks
This is a scaffold template. Each TODO comment marks where you need to implement functionality:
- [ ] Configure database connection
- [ ] Implement LLM API integration
- [ ] Build UI components
- [ ] Add authentication
- [ ] Implement real-time chat
- [ ] Create emotion analysis logic
- [ ] Build gift recommendation system

## Development Notes
- Backend runs on: http://localhost:8000
- Frontend runs on: http://localhost:3000
- API documentation: http://localhost:8000/docs
