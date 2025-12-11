# Standard library imports
import json
import os
from typing import List, Optional
from venv import logger

# Third-party imports
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
from google import genai
from google.genai import types
from app.weaviate_client import WeaviateManager

load_dotenv()

def check_environment_variables():
    if not GEMINI_API_KEY :
        raise RuntimeError("Missing GEMINI_API_KEY in environment")
    
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

weaviate_manager = WeaviateManager()

check_environment_variables() 

# Global Gemini Client instance
GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)


def call_gemini_api(prompt: str) -> str:
    """
    Call the Gemini API with the provided prompt and return the response.
    """
    logger.info("Calling Gemini API for content generation")
    
    try:
        # Load config, safe_cfg, etc. (configuration logic remains the same)
        with open(os.path.join(os.path.dirname(__file__), "gemini_config.json"), "r", encoding="utf-8") as f:
            cfg = json.load(f)

        gen_cfg = types.GenerateContentConfig(
            **cfg["generation_config"],
            safety_settings=[types.SafetySetting(**s) for s in cfg["safety_settings"]],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )

        response = GEMINI_CLIENT.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=gen_cfg
        )
        
        logger.info(f"Successfully generated content...")
        return response.text
        
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        raise


