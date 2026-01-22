
import os
import asyncio
import json
import base64
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from dotenv import load_dotenv

from app.modules.ai.core.gemini_config import GeminiClient, GeminiModels

# Load env variables
load_dotenv()

class GeminiLiveService:
    def __init__(self):
        self.client = GeminiClient.get_client()
        if not self.client:
            raise ValueError("Failed to initialize Gemini Client")
            
        self.model = GeminiModels.NATIVE_AUDIO
        
        # Configuration matches the user's request
        self.config = {
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {"prebuilt_voice_config": {"voice_name": "Kore"}} # Default voice
            },
            # Enable thinking as per docs for this model
            "thinking_config": {
                 "thinking_budget": 1024,
            },
             # Enable VAD
             "realtime_input_config": {
                "automatic_activity_detection": {
                    "disabled": False 
                }
             }
        }

    async def handle_websocket(self, websocket: WebSocket):
        """
        Handles the WebSocket connection between the Client (Frontend) and Gemini Live API.
        """
        await websocket.accept()
        print("[GeminiLive] WebSocket connection accepted")
        
        # Local conversation log for this session
        conversation_log = []

        try:
            # Connect to Gemini Live session
            async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                print(f"[GeminiLive] Connected to Gemini session")

                async def receive_from_client():
                    try:
                        while True:
                            # Check if websocket is still connected
                            if websocket.client_state.value == 3: # 3 is DISCONNECTED
                                break
                                
                            try:
                                message = await websocket.receive()
                            except RuntimeError as re:
                                if "disconnect message has been received" in str(re):
                                    break
                                raise
                            
                            # Binary Message -> 16kHz PCM Audio
                            if "bytes" in message and message["bytes"]:
                                await session.send_realtime_input(
                                    audio={"data": message["bytes"], "mime_type": "audio/pcm;rate=16000"}
                                )
                            
                            # Text Message -> JSON (text input or control)
                            elif "text" in message and message["text"]:
                                try:
                                    data = json.loads(message["text"])
                                    if "text" in data:
                                        text_content = data["text"]
                                        conversation_log.append({"role": "user", "content": text_content})
                                        await session.send_client_content(
                                            turns=[{"role": "user", "parts": [{"text": text_content}]}],
                                            turn_complete=True
                                        )
                                except json.JSONDecodeError:
                                    text_content = message["text"]
                                    conversation_log.append({"role": "user", "content": text_content})
                                    await session.send_client_content(
                                        turns=[{"role": "user", "parts": [{"text": text_content}]}],
                                        turn_complete=True
                                    )

                    except (WebSocketDisconnect, asyncio.CancelledError):
                        pass
                    except Exception as e:
                        print(f"[GeminiLive] receive_from_client error: {e}")

                async def send_to_client():
                    try:
                        current_ai_turn = ""
                        async for response in session.receive():
                            server_content = response.server_content
                            if server_content is None:
                                continue

                            # 1. Handle Audio & Text Generation
                            if server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data and websocket.client_state.value != 3:
                                        await websocket.send_bytes(part.inline_data.data)
                                    
                                    if part.text:
                                        current_ai_turn += part.text
                                        if websocket.client_state.value != 3:
                                            await websocket.send_json({"type": "text", "content": part.text})

                            # 2. Handle Interruption (VAD)
                            if server_content.interrupted:
                                print("[GeminiLive] Interrupted by user (VAD)")
                                if current_ai_turn:
                                    conversation_log.append({"role": "ai", "content": current_ai_turn + " [Interrupted]"})
                                    current_ai_turn = ""
                                if websocket.client_state.value != 3:
                                    await websocket.send_json({"type": "interrupted"})

                            # 3. Handle Turn Complete
                            if server_content.turn_complete:
                                if current_ai_turn:
                                    conversation_log.append({"role": "ai", "content": current_ai_turn})
                                    current_ai_turn = ""
                                if websocket.client_state.value != 3:
                                    await websocket.send_json({"type": "turn_complete"})

                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        print(f"[GeminiLive] send_to_client error: {e}")

                # Run both tasks concurrently
                receive_task = asyncio.create_task(receive_from_client())
                send_task = asyncio.create_task(send_to_client())
                
                # Wait for either task to complete
                done, pending = await asyncio.wait(
                    [receive_task, send_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # Cancel the other task
                for task in pending:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                
                if conversation_log:
                    print(f"[GeminiLive] Session ended. Captured {len(conversation_log)} turns.")

        except Exception as e:
            # Outer block catches session errors
            if not isinstance(e, (asyncio.CancelledError, WebSocketDisconnect)):
                print(f"[GeminiLive] Session exception: {e}")
        finally:
            try:
                if websocket.client_state.value != 3:
                     await websocket.close(code=1000)
            except:
                pass
