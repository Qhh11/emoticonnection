from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import os
import asyncio
from app.modules.ai.core.ai_chat import AIChatService
from app.modules.ai.core.audio import AudioService
from app.modules.ai.repository.ai_repository import AIChatRepository
from config.mongodb_config import get_database

router = APIRouter()
ai_service = AIChatService()
audio_service = AudioService()

def get_ai_repo() -> AIChatRepository:
    """Helper to get repo instance"""
    db = get_database()
    return AIChatRepository(db)


@router.websocket("/ws/ai-chat/{user_id}")
async def websocket_ai_chat(websocket: WebSocket, user_id: str):
    """
    Real-time AI Chat WebSocket
    
    Protocol:
    - Client sends:
      - {"type": "text", "content": "Hello"}
      - {"type": "audio_blob", "data": "base64...", "format": "webm"}
    
    - Server sends:
      - {"type": "transcript", "content": "Hello"} (STT result)
      - {"type": "text_chunk", "content": "..."} (Streaming AI text - simplified to full block for now)
      - {"type": "audio", "url": "/static/...", "text": "..."} (TTS result)
      - {"type": "pushed_text", "content": "..."} (Full text response)
      - {"type": "error", "content": "..."}
    """
    await websocket.accept()
    repo = get_ai_repo()
    
    # Ensure session exists
    session = await repo.get_or_create_ai_session(user_id)
    session_id = session["id"]
    
    print(f"[WS] AI Chat connected: User {user_id}, Session {session_id}")
    
    try:
        while True:
            # 1. Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                user_text = ""
                
                # 2. Process Input (Text or Audio)
                if msg_type == "audio_blob":
                    # Handle Audio
                    base64_data = message.get("data")
                    audio_format = message.get("format", "webm")
                    
                    if not base64_data:
                        continue
                        
                    # Save and Transcribe
                    try:
                        file_path = audio_service.save_base64_audio(base64_data, audio_format)
                        user_text = await audio_service.transcribe_audio(file_path)
                        
                        # Send transcript back to client
                        await websocket.send_json({
                            "type": "transcript",
                            "content": user_text
                        })
                        
                        # Clean up temp file
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            
                    except Exception as e:
                        await websocket.send_json({"type": "error", "content": f"STT Failed: {str(e)}"})
                        continue
                        
                elif msg_type == "text":
                    user_text = message.get("content", "")
                
                else:
                    await websocket.send_json({"type": "error", "content": "Unknown message type"})
                    continue

                if not user_text:
                    continue

                # 3. Save User Message
                await repo.save_message(
                    session_id=session_id,
                    sender_id=user_id,
                    content=user_text,
                    sender_type="user"
                )
                
                # 4. Get AI Response
                # TODO: Implement streaming in AIChatService if possible, for now full response
                response_text = await ai_service.chat_with_ai(
                    message=user_text,
                    history=[], # Ideally fetch history or maintain it? For speed, we might want to keep basic context
                    user_id=user_id,
                    session_id=session_id
                )
                
                # Send text response
                await websocket.send_json({
                    "type": "pushed_text",
                    "content": response_text
                })
                
                # 5. Generate Audio (TTS)
                try:
                    audio_url = await audio_service.generate_speech(response_text)
                    await websocket.send_json({
                        "type": "audio",
                        "url": audio_url,
                        "text": response_text
                    })
                except Exception as e:
                    print(f"⚠️ TTS Failed: {e}")
                    # Don't send error to client if only TTS fails, text was sent
                
                # 6. Save AI Response
                await repo.save_message(
                    session_id=session_id,
                    sender_id="ai_assistant",
                    content=response_text,
                    sender_type="ai"
                )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON"})
                
    except WebSocketDisconnect:
        print(f"[WS] AI Chat disconnected: User {user_id}")
    except Exception as e:
        print(f"[WS] Error: {e}")
        try:
             await websocket.close()
        except:
            pass
