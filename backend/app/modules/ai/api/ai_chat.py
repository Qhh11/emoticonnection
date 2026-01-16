from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import json
import shutil
import os
import uuid
from app.modules.ai.core.ai_chat import AIChatService
from app.modules.ai.core.audio import AudioService
from app.modules.ai.repository.ai_repository import AIChatRepository
from config.mongodb_config import get_database

router = APIRouter()
# 初始化 AI 服务实例
ai_service = AIChatService()
audio_service = AudioService()

def get_ai_repo() -> AIChatRepository:
    """Dependency to get AIChatRepository instance"""
    db = get_database()
    return AIChatRepository(db)

# 定义请求和响应的数据模型 (for documentation/types)

class ChatMessage(BaseModel):
    role: str 
    parts: List[str] 

class ChatResponse(BaseModel):
    response: str 
    audio_url: Optional[str] = None # TTS audio path
    transcribed_text: Optional[str] = None # If STT was used

class CreateSessionRequest(BaseModel):
    user_id: str

async def process_upload_file(file: UploadFile, save_dir: str = "/tmp") -> str:
    """Save upload file to disk and return path"""
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"upload_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(save_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return file_path

@router.post("/", response_model=ChatResponse)
async def chat(
    user_id: str = Form(...),
    session_id: Optional[str] = Form(None),
    message: Optional[str] = Form(None), 
    history: Optional[str] = Form("[]"), # JSON string of history
    voice_output: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    repo: AIChatRepository = Depends(get_ai_repo)
):
    """
    Multimodal AI Chat Interface
    
    Supports:
    - Text Chat
    - Image Input (via 'file')
    - Audio Input (via 'file', auto transcribed)
    - Voice Output (request via 'voice_output=True')
    """
    try:
        # Parse history
        try:
            history_list = json.loads(history)
        except json.JSONDecodeError:
            history_list = []

        # 1. Handle File Input
        image_data = None
        image_mime_type = None
        transcribed_text = None
        
        final_message = message or ""

        if file:
            content_type = file.content_type or ""
            
            if content_type.startswith("audio/"):
                # Handle Audio (STT)
                # Need to save temp file for OpenAI Whisper
                temp_path = await process_upload_file(file)
                try:
                    transcribed_text = await audio_service.transcribe_audio(temp_path)
                    print(f"🎤 Transcribed: {transcribed_text}")
                    # Append transcribed text to message
                    if final_message:
                        final_message += f"\n{transcribed_text}"
                    else:
                        final_message = transcribed_text
                finally:
                    # Cleanup temp file
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                        
            elif content_type.startswith("image/"):
                # Handle Image
                image_data = await file.read()
                image_mime_type = content_type
                print(f"🖼️ Image received: {len(image_data)} bytes")
        
        if not final_message and not image_data:
            raise HTTPException(status_code=400, detail="Message or valid file input required")

        # 2. Get or Create Session
        if session_id:
            # Continue session
            pass 
        else:
            session = await repo.get_or_create_ai_session(user_id)
            session_id = session["id"]

        # 3. Save User Message
        # Construct content description
        user_content_to_save = final_message
        if image_data:
            user_content_to_save = f"[Image] {user_content_to_save}"
        if transcribed_text and not message: # If strictly voice input
             user_content_to_save = f"[Voice] {user_content_to_save}"

        await repo.save_message(
            session_id=session_id,
            sender_id=user_id,
            content=user_content_to_save,
            sender_type="user"
        )
        
        # 4. Call AI Service
        # Prepare history data format
        history_data = [
            {"role": msg.get("role"), "parts": msg.get("parts")} for msg in history_list
        ]
        
        response_text = await ai_service.chat_with_ai(
            message=final_message, 
            history=history_data, 
            user_id=user_id,
            session_id=session_id,
            image_data=image_data,
            image_mime_type=image_mime_type
        )
        
        # 5. Handle Voice Output (TTS)
        audio_url = None
        if voice_output:
            try:
                audio_url = await audio_service.generate_speech(response_text)
            except Exception as e:
                print(f"⚠️ TTS Generation failed: {e}")

        # 6. Save AI Response
        await repo.save_message(
            session_id=session_id,
            sender_id="ai_assistant",
            content=response_text,
            sender_type="ai"
        )

        return ChatResponse(
            response=response_text,
            audio_url=audio_url,
            transcribed_text=transcribed_text
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[dict])
async def get_user_sessions(user_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get all AI chat sessions for a user"""
    return await repo.get_user_sessions(user_id)

@router.post("/sessions", response_model=dict)
async def create_new_session(request: CreateSessionRequest, repo: AIChatRepository = Depends(get_ai_repo)):
    """Force create a new AI chat session"""
    return await repo.create_session(request.user_id)

@router.get("/sessions/{session_id}/messages", response_model=List[dict])
async def get_session_history(session_id: str, repo: AIChatRepository = Depends(get_ai_repo)):
    """Get message history for a session"""
    return await repo.get_session_messages(session_id)