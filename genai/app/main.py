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
from weaviate_client import get_weaviate_client

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = get_weaviate_client()

print("Weaviate is ready:", client.is_ready())

def check_environment_variables():
    if not GEMINI_API_KEY :
        raise RuntimeError("Missing GEMINI_API_KEY in environment")

def call_gemini_api(prompt: str) -> str:
    """
    Call the Gemini API with the provided prompt and return the response.
    """
    logger.info("Calling Gemini API for content generation")
    check_environment_variables()
    
    try:
        # Load the configuration from the JSON file
        with open(os.path.join(os.path.dirname(__file__), "gemini_config.json"), "r", encoding="utf-8") as f:
            cfg = json.load(f)

        gen_cfg = types.GenerationConfig(**cfg["generation_config"])
        safe_cfg = [types.SafetySetting(**s) for s in cfg["safety_settings"]]

        gen_cfg = types.GenerateContentConfig(
            **cfg["generation_config"],
            safety_settings=safe_cfg,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )

        client = genai.Client(api_key = GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=gen_cfg
        )
        
        logger.info(f"Successfully generated content with Gemini API (response length: {len(response.text) if response.text else 0} characters)")
        return response.text
        
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        raise


