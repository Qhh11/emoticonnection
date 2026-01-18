from typing import Optional
from .gemini_config import get_helper_model

class AIHelperService:
    """
    AI Service for helper functions like rewriting, reply suggestions, etc.
    Distinct from the main empathetic chat companion.
    """
    def __init__(self):
        self.model = None
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini client with a neutral/helpful instruction"""
        # We use a general helpful system instruction or none for these utility tasks
        self.model = get_helper_model("You an helpful AI assistant.")
        
        if not self.model:
            print("⚠️  WARNING: GEMINI_API_KEY not found in AIHelperService.")

    async def _generate_text(self, prompt: str) -> str:
        """Helper to generate text from Gemini with a single prompt"""
        if not self.model:
            return "AI service unavailable."
        try:
            # For utility tasks, we don't need history, just a fresh chat or direct generation
            chat = self.model.start_chat(history=[])
            response = await chat.send_message_async(prompt)
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
        # Format history for the prompt
        transcript = ""
        for msg in history[-5:]: # Look at last 5 messages for context
            role = msg.get("role")
            content = " ".join(msg.get("parts", []))
            transcript += f"{role}: {content}\n"

        if styles:
            prompt = f"""
            Based on the conversation transcript below, suggest a reply for the 'user' in each of these styles: {', '.join(styles)}.
            
            Transcript:
            {transcript}
            
            Return ONLY a valid JSON object where keys are the style names and values are the suggested replies.
            Do not include Markdown formatting.
            """
            return await self._generate_text(prompt)

        prompt = f"""
        Based on the following conversation transcript, suggest 4 distinct, natural, and helpful replies that the 'user' could send next.
        Focus on emotion connection and empathy if appropriate.
        
        Transcript:
        {transcript}
        
        """
        if context:
            prompt += f"\nAdditional Context: {context}"
            
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
