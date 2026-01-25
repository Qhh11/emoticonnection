import asyncio
import os
import sys
import traceback
import pyaudio
from google import genai
from google.genai.types import LiveConnectConfig, HttpOptions, Modality
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
root_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(root_env)

# check if Python >= 3.11
if sys.version_info < (3, 11, 0):
    print("Error: This script requires Python 3.11 or newer.")
    sys.exit(1)

# Audio configuration
FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000     # Microphone input rate
RECEIVE_SAMPLE_RATE = 24000  # Gemini output rate
CHUNK_SIZE = 1024

# API Configuration
# We use the Gemini Developer API (Google AI Studio) as configured in the project
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in environment.")
    sys.exit(1)

client = genai.Client(
    api_key=api_key,
    http_options={"api_version": "v1alpha"}
)

# User requested model
MODEL = "models/gemini-2.0-flash-exp" 
CONFIG = LiveConnectConfig(
    response_modalities=[Modality.AUDIO],
)

pya = pyaudio.PyAudio()

class AudioLoop:
    """Manages bidirectional audio streaming with Gemini."""
    
    def __init__(self):
        self.audio_in_queue = None  # Audio from Gemini to speakers
        self.out_queue = None       # Audio from microphone to Gemini
        self.session = None         # Gemini API session
        self.audio_stream = None    # Microphone stream
    
    async def listen_audio(self):
        """Captures audio from microphone and queues it for sending."""
        try:
            mic_info = pya.get_default_input_device_info()
            print(f"[Audio] Using microphone: {mic_info['name']}")
            
            self.audio_stream = await asyncio.to_thread(
                pya.open,
                format=FORMAT, 
                channels=CHANNELS, 
                rate=SEND_SAMPLE_RATE,
                input=True, 
                input_device_index=mic_info["index"],
                frames_per_buffer=CHUNK_SIZE,
            )
            
            kwargs = {"exception_on_overflow": False}
            
            while True:
                data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, **kwargs)
                await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})
        except Exception as e:
            print(f"[Audio] Microphone error: {e}")
            raise
    
    async def receive_audio(self):
        """Receives audio responses from Gemini."""
        try:
            while True:
                async for response in self.session.receive():
                    # Handle audio data
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.inline_data:
                                self.audio_in_queue.put_nowait(part.inline_data.data)
                    
                    # Handle text (if model includes it)
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.text:
                                print(f"Gemini: {part.text}")
        except Exception as e:
            print(f"[Audio] Receive error: {e}")
            raise
    
    async def play_audio(self):
        """Plays audio responses through speakers."""
        try:
            stream = await asyncio.to_thread(
                pya.open,
                format=FORMAT, 
                channels=CHANNELS, 
                rate=RECEIVE_SAMPLE_RATE,
                output=True,
            )
            print("[Audio] Output stream opened.")
            
            while True:
                bytestream = await self.audio_in_queue.get()
                await asyncio.to_thread(stream.write, bytestream)
        except Exception as e:
            print(f"[Audio] Playback error: {e}")
            raise
    
    async def send_realtime(self):
        """Sends microphone audio to Gemini API."""
        try:
            while True:
                msg = await self.out_queue.get()
                # Use send_realtime_input for raw audio data
                await self.session.send_realtime_input(
                    audio={"data": msg["data"], "mime_type": "audio/pcm"}
                )
        except Exception as e:
            print(f"[Audio] Send error: {e}")
            raise
    
    async def run(self):
        """Coordinates all audio streaming tasks."""
        try:
            print(f"Connecting to model: {MODEL}...")
            async with (
                client.aio.live.connect(model=MODEL, config=CONFIG) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session
                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=10)
                
                print("\n" + "="*50)
                print("Voice chat started! Speak now.")
                print("Press Ctrl+C to quit.")
                print("="*50 + "\n")
                
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())
                
                await asyncio.Future() 
                
        except asyncio.CancelledError:
            pass
        except ExceptionGroup as EG:
            traceback.print_exception(EG)
        except Exception as e:
            print(f"An error occurred: {e}")
            traceback.print_exc()
        finally:
            if self.audio_stream:
                self.audio_stream.stop_stream()
                self.audio_stream.close()
            print("Voice chat session ended.")

if __name__ == "__main__":
    try:
        main = AudioLoop()
        asyncio.run(main.run())
    except KeyboardInterrupt:
        print("\nChat terminated by user.")
    finally:
        pya.terminate()
        print("Audio resources released.")
