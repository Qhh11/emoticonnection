from typing import Optional, List
from .gemini_config import get_helper_model, GeminiClient

class AIHelperService:
    """
    AI Service for helper functions like rewriting, reply suggestions, etc.
    Distinct from the main empathetic chat companion.
    """
    def __init__(self):
        self.client = None
        self.model_id = None
        self.system_instruction = "You an helpful AI assistant."
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini client"""
        self.model_id = get_helper_model()
        self.client = GeminiClient.get_client()
        
        if not self.client:
            print("⚠️  WARNING: GEMINI_API_KEY not found in AIHelperService.")

    async def _generate_text(self, prompt: str) -> str:
        """Helper to generate text from Gemini with a single prompt"""
        if not self.client:
            return "AI service unavailable."
        try:
            from google.genai import types
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_instruction
                )
            )
            return response.text
        except Exception as e:
            print(f"❌ Gemini Utils Error: {e}")
            return "Error processing request."

    async def rewrite_content(self, text: str, context: Optional[str] = None, styles: Optional[list] = None) -> str:
        """
        Rewrite user input.
        If styles is provided, returns a JSON string with keys as styles.
        """
        if styles:
            prompt = f"""
            Rewrite the following text in these specific styles: {', '.join(styles)}.
            Original Text: "{text}"
            
            Return ONLY a valid JSON object where keys are the style names and values are the rewritten text.
            Do not include Markdown formatting (```json).
            Example format:
            {{
                "style1": "rewritten text...",
                "style2": "rewritten text..."
            }}
            """
            return await self._generate_text(prompt)

        prompt = f"""
        Please rewrite the following text to make it more fluent, coherent, and logically structured.
        Keep the original meaning but improve the expression.
        
        Original Text: "{text}"
        """
        if context:
            prompt += f"\nContext/Tone desired: {context}"
        
        prompt += "\n\nRewritten Text:"
        return await self._generate_text(prompt)

    async def suggest_reply(self, history: list, context: Optional[str] = None, styles: Optional[list] = None) -> str:
        """
        Suggest replies.
        If styles is provided, returns a JSON string with keys as styles.
        """
        # Format history for the prompt with clearer roles
        transcript = ""
        for msg in history[-8:]: # Increased context slightly
            role_raw = msg.get("role", "unknown")
            # Map standard Gemini roles or custom ones to conversational labels
            role_label = "Me" if role_raw in ["user", "me"] else "Partner"
            content = " ".join(msg.get("parts", []))
            transcript += f"[{role_label}]: {content}\n"

        if styles:
            prompt = f"""
            You are assisting 'Me' in a conversation with 'Partner'.
            Based on the transcript below, suggest a reply for 'Me' that responds to 'Partner'.
            
            Transcript:
            {transcript}
            
            Current Task: Generate 4 distinct replies for 'Me' in these styles: {', '.join(styles)}.
            Focus on responding to the latest things 'Partner' said. Even if 'Me' was the last one to speak, find a way to follow up or deepen the connection.
            
            Return ONLY a valid JSON object where keys are the style names and values are the suggested replies.
            Do not include Markdown formatting.
            """
            return await self._generate_text(prompt)

        prompt = f"""
        You are assisting 'Me' in a conversation with 'Partner'.
        Based on the transcript below, suggest 4 distinct, natural, and helpful replies that 'Me' could send next.
        
        Transcript:
        {transcript}
        
        Focus on responding to 'Partner' and maintaining a good emotional connection.
        """
        if context:
            prompt += f"\nAdditional Context for 'Me': {context}"
            
        prompt += """
        
        Please provide exactly 4 options numbered 1 to 4.
        Format:
        1. [Option 1]
        2. [Option 2]
        3. [Option 3]
        4. [Option 4]
        """
        return await self._generate_text(prompt)

    async def suggest_topic(self, history: list, context: Optional[str] = None) -> str:
        """
        Suggest conversation topics or advice when user is stuck.
        """
        transcript = ""
        for msg in history[-5:]: 
            role = msg.get("role")
            content = " ".join(msg.get("parts", []))
            transcript += f"{role}: {content}\n"
            
        prompt = f"""
        The user doesn't know what to say next in this conversation.
        Based on the transcript, suggest 4 interesting topics or questions to keep the conversation going deeper or in a fun direction.
        
        Transcript:
        {transcript}
        
        """
        if context:
            prompt += f"\nAdditional Context: {context}"
            
        prompt += """
        
        Provide exactly 4 suggestions.
        """
        return await self._generate_text(prompt)
