"""
Gemini Live API Service
Manages real-time bidirectional audio streaming with Gemini
"""
import os
import asyncio
from typing import Optional, Callable, AsyncGenerator
from contextlib import asynccontextmanager
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
root_env = Path(__file__).resolve().parents[5] / ".env"
load_dotenv(root_env)


class GeminiLiveService:
    """
    Service for managing Gemini Live API sessions
    Handles real-time audio streaming (STT + TTS in one)
    """
    
    def __init__(self):
        """Initialize the Gemini Live API client"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        from app.modules.ai.core.gemini_config import GeminiModels
        self.client = genai.Client(api_key=api_key)
        # Using the specific native audio dialog model requested by user
        self.model = GeminiModels.NATIVE_AUDIO
        print(f"📦 [GeminiLive] Initialized with model: {self.model}")
        
    @asynccontextmanager
    async def start_session(
        self,
        user_id: str,
        system_instruction: str = "You are a helpful and friendly AI assistant in the EmotionConnect app. Provide emotional support, listen actively, and offer comforting advice.",
        on_audio_response: Optional[Callable] = None,
        on_text_response: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
        on_turn_complete: Optional[Callable] = None
    ) -> AsyncGenerator[any, None]:
        """
        Start a Live API session using async context manager
        """
        config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": system_instruction,
        }
        
        print(f"🔗 [GeminiLive] Connecting to Live API for user {user_id}...")
        
        try:
            async with self.client.aio.live.connect(model=self.model, config=config) as session:
                print(f"✅ [GeminiLive] Connected successfully for user {user_id}")
                
                # Start receiving in background if callbacks provided
                receive_task = asyncio.create_task(
                    self._receive_loop(session, on_audio_response, on_text_response, on_error, on_turn_complete)
                )
                
                yield session
                
                receive_task.cancel()
                try:
                    await receive_task
                except asyncio.CancelledError:
                    pass
                
                print(f"🔌 [GeminiLive] Session closed for user {user_id}")
                
        except Exception as e:
            print(f"❌ [GeminiLive] Connection failed: {e}")
            if on_error:
                await on_error(str(e))
            raise
    
    async def send_audio(self, session, audio_data: bytes, mime_type: str = "audio/pcm;rate=16000"):
        """
        Send PCM audio to Gemini
        """
        try:
            # print(f"📤 [GeminiLive] Sending audio: {len(audio_data)} bytes")
            await session.send_realtime_input(audio={"data": audio_data, "mime_type": mime_type})
        except Exception as e:
            print(f"❌ [GeminiLive] Error sending audio: {e}")
            raise
    
    async def _receive_loop(
        self, 
        session,
        on_audio: Optional[Callable],
        on_text: Optional[Callable],
        on_error: Optional[Callable],
        on_turn_complete: Optional[Callable]
    ):
        """Continuously receive responses from Gemini"""
        try:
            async for response in session.receive():
                # Handle server content
                if hasattr(response, 'server_content') and response.server_content:
                    content = response.server_content
                    
                    # Check for interruptions
                    if hasattr(content, 'interrupted') and content.interrupted:
                        print("⚠️  [GeminiLive] Interrupted by user")
                        continue
                    
                    # Handle model turn
                    if hasattr(content, 'model_turn') and content.model_turn:
                        for part in content.model_turn.parts:
                            # Audio data
                            if hasattr(part, 'inline_data') and part.inline_data:
                                audio_bytes = part.inline_data.data
                                if audio_bytes and on_audio:
                                    print(f"🎵 [GeminiLive] Received audio chunk: {len(audio_bytes)} bytes")
                                    await on_audio(audio_bytes)
                            
                            # Text data
                            if hasattr(part, 'text') and part.text and on_text:
                                print(f"💬 [GeminiLive] AI: {part.text}")
                                await on_text(part.text)
                    
                    # Handle turn complete
                    if hasattr(content, 'turn_complete') and content.turn_complete:
                        print("🏁 [GeminiLive] Turn complete")
                        if on_turn_complete:
                            await on_turn_complete()
                                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"❌ [GeminiLive] Receive loop error: {e}")
            if on_error:
                await on_error(str(e))
