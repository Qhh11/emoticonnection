
from fastapi import APIRouter, WebSocket
from app.modules.ai.core.gemini_live_service import GeminiLiveService

router = APIRouter()

@router.websocket("/ws/gemini-live")
async def websocket_gemini_live(websocket: WebSocket):
    """
    WebSocket PROXY for Gemini Live API
    """
    service = GeminiLiveService()
    await service.handle_websocket(websocket)
