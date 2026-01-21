
import os
import asyncio
import json
import base64
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from dotenv import load_dotenv

# Load env variables
load_dotenv()

class GeminiLiveService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        
        # Use v1alpha as per documentation for native audio features
        self.client = genai.Client(api_key=self.api_key, http_options={"api_version": "v1alpha"})
        self.model = "gemini-2.5-flash-native-audio-preview-12-2025"
        
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

        try:
            # Connect to Gemini Live
            async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                print(f"[GeminiLive] Connected to Gemini session")

                # Task to receive audio/text from Client and send to Gemini
                async def receive_from_client():
                    try:
                        while True:
                            # We expect the frontend to send either raw bytes (audio) or JSON (control)
                            # However, FastAPI's receive() can handle both if we just use receive_message logic,
                            # or we can enforce a protocol.
                            # Let's support:
                            # - Binary Message -> 16kHz PCM Audio
                            # - Text Message -> JSON (config, interruption, etc.)
                            
                            message = await websocket.receive()
                            
                            if "bytes" in message and message["bytes"]:
                                # Forward audio to Gemini
                                # print(f"Audio chunk: {len(message['bytes'])}")
                                await session.send_realtime_input(
                                    audio={"data": message["bytes"], "mime_type": "audio/pcm;rate=16000"}
                                )
                            
                            elif "text" in message and message["text"]:
                                try:
                                    data = json.loads(message["text"])
                                    # Handle JSON commands if any
                                    # For example, manual interruption or text input
                                    if "text" in data:
                                        await session.send_client_content(
                                            turns=[{"role": "user", "parts": [{"text": data["text"]}]}],
                                            turn_complete=True
                                        )
                                except json.JSONDecodeError:
                                    print("[GeminiLive] Invalid JSON from client")

                    except WebSocketDisconnect:
                        print("[GeminiLive] Client disconnected")
                    except Exception as e:
                        print(f"[GeminiLive] Error in receive_from_client: {e}")

                # Task to receive from Gemini and send to Client
                async def send_to_client():
                    try:
                        async for response in session.receive():
                            server_content = response.server_content
                            if server_content is None:
                                continue

                            # 1. Handle Audio & Text Generation
                            if server_content.model_turn:
                                for part in server_content.model_turn.parts:
                                    if part.inline_data:
                                        # Send Audio Bytes directly
                                        await websocket.send_bytes(part.inline_data.data)
                                    
                                    if part.text:
                                        # Send Text as JSON
                                        await websocket.send_json({"type": "text", "content": part.text})

                            # 2. Handle Interruption (VAD)
                            if server_content.interrupted:
                                print("[GeminiLive] Interrupted by user (VAD)")
                                await websocket.send_json({"type": "interrupted"})

                            # 3. Handle Turn Complete
                            if server_content.turn_complete:
                                # await websocket.send_json({"type": "turn_complete"})
                                pass

                    except Exception as e:
                        print(f"[GeminiLive] Error in send_to_client: {e}")

                # Run both tasks concurrently
                await asyncio.gather(receive_from_client(), send_to_client())

        except Exception as e:
            print(f"[GeminiLive] Connection failed: {e}")
            try:
                await websocket.close(code=1011, reason=str(e))
            except:
                pass
