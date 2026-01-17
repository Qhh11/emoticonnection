import os
import uuid
import base64
from pathlib import Path
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

# Path to .env in project root: emoticonnection/.env
# This file: emoticonnection/backend/app/modules/ai/core/audio.py
root_env = Path(__file__).resolve().parents[5] / ".env"
load_dotenv(root_env)

class AudioService:
    """
    Service for handling Audio:
    - Speech-to-Text (STT) using OpenAI Whisper or Gemini Fallback
    - Text-to-Speech (TTS) using OpenAI TTS or gTTS Fallback
    """
    def __init__(self):
        # OpenAI Setup
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
             print("⚠️  WARNING: OPENAI_API_KEY not found. Using Fallbacks (Gemini/gTTS).")
             self.client = None
        else:
            self.client = OpenAI(api_key=self.openai_api_key)

        # Gemini Setup (Fallback for STT)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                # Use the model name without 'models/' prefix for newer API
                self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            except Exception as e:
                print(f"⚠️ Failed to initialize Gemini Model: {e}")
                self.gemini_model = None
        else:
            print("⚠️ GEMINI_API_KEY not found. Gemini STT fallback will not work.")
            self.gemini_model = None

        # Directory handling
        # Go up from: backend/app/modules/ai/core/audio.py
        # To: backend/static/uploads/ai_voice/
        self.base_dir = Path(__file__).resolve().parents[5] # emoticonnection
        self.upload_dir = self.base_dir / "backend" / "static" / "uploads" / "ai_voice"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def transcribe_audio(self, file_path: str) -> str:
        """
        Transcribe audio file to text using OpenAI Whisper or Gemini Fallback
        """
        if self.client:
            try:
                with open(file_path, "rb") as audio_file:
                    transcript = self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file
                    )
                return transcript.text
            except Exception as e:
                print(f"⚠️ OpenAI STT failed: {e}. Trying Gemini...")
        
        # Fallback to Gemini STT
        if self.gemini_model:
            try:
                # Infer mime_type from extension
                ext = Path(file_path).suffix.lower().replace(".", "")
                mime_type = f"audio/{ext}" if ext else "audio/wav"
                if ext == "webm": mime_type = "audio/webm"
                if ext == "mp3": mime_type = "audio/mp3"

                # Upload the audio file using Gemini's File API
                print(f"📤 Uploading audio file to Gemini: {file_path}")
                uploaded_file = genai.upload_file(path=file_path, mime_type=mime_type)
                
                # Using Gemini 1.5 Flash for audio transcription
                response = self.gemini_model.generate_content([
                    uploaded_file,
                    "Transcribe this audio to text exactly. Only return the transcribed text, nothing else."
                ])
                
                # Clean up the uploaded file from Gemini servers
                try:
                    uploaded_file.delete()
                except:
                    pass  # Ignore cleanup errors
                
                return response.text
            except Exception as e:
                print(f"❌ Gemini STT Error: {e}")
                raise
        
        raise Exception("No available STT provider (OpenAI or Gemini)")

    async def generate_speech(self, text: str) -> str:
        """
        Generate speech from text using OpenAI TTS or gTTS Fallback
        Returns: Path (URL path) to the generated audio file
        """
        filename = f"tts_{uuid.uuid4().hex}.mp3"
        save_path = self.upload_dir / filename
        
        # Try OpenAI first
        if self.client:
            try:
                response = self.client.audio.speech.create(
                    model="tts-1",
                    voice="alloy", 
                    input=text
                )
                response.stream_to_file(save_path)
                return f"/static/uploads/ai_voice/{filename}"
            except Exception as e:
                print(f"⚠️ OpenAI TTS failed: {e}. Trying gTTS...")
        
        # Fallback to gTTS
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang='en')
            tts.save(str(save_path))
            return f"/static/uploads/ai_voice/{filename}"
        except Exception as e:
            print(f"❌ gTTS Error: {e}")
            raise

    def save_base64_audio(self, base64_data: str, extension: str = "webm") -> str:
        """
        Save base64 encoded audio to a temporary file
        Returns: Absolute path to the saved file
        """
        try:
            # Decode base64
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]
            
            audio_data = base64.b64decode(base64_data)
            
            # Generate unique filename
            filename = f"upload_{uuid.uuid4().hex}.{extension}"
            file_path = self.upload_dir / filename
            
            # Write to file
            with open(file_path, "wb") as f:
                f.write(audio_data)
                
            return str(file_path)
        except Exception as e:
            print(f"❌ Failed to save base64 audio: {e}")
            raise
