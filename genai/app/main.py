# Standard library imports
import json
import os
import logging 
from datetime import datetime, timezone

# Third-party imports
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
from google import genai
from google.genai import types
import weaviate.classes.query as wq # Weaviate v4 query helper
from weaviate.classes.query import Filter


from weaviate_client import WeaviateManager 
from model import ConversationRecord 


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def check_environment_variables():
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError("Missing GEMINI_API_KEY in environment")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
check_environment_variables()

GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)

try:
    weaviate_manager = WeaviateManager()
except Exception as e:
    logger.warning(f"Weaviate failed to initialize at module level: {e}")
    weaviate_manager = None

def call_gemini_api(prompt: str) -> str:
    """Call the Gemini API."""
    logger.info("Calling Gemini API for content generation")
    try:
        config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                
            gen_cfg = types.GenerateContentConfig(
                **cfg.get("generation_config", {}),
                safety_settings=[types.SafetySetting(**s) for s in cfg.get("safety_settings", [])],
            )
        else:
            gen_cfg = types.GenerateContentConfig(temperature=0.7)

        response = GEMINI_CLIENT.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=gen_cfg
        )
        return response.text
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        raise

def generate_weekly_report(user_id: str, start_time_iso: str) -> str:
    """
    Generate a weekly report based on the user conversation history using Gemini API and Weaviate.
    
    Args:
        user_id (str): The 'userId' field in Weaviate.
        start_time_iso (str): ISO 8601 formatted date string (e.g., '2023-10-25T00:00:00Z').
    """
    # 1. 检查连接
    if weaviate_manager is None or weaviate_manager.client is None:
        raise RuntimeError("WeaviateManager is not initialized or connected.")
    
    if not weaviate_manager.client.is_connected():
        weaviate_manager.client.connect() 

    logger.info(f"Fetching conversations for user {user_id} since {start_time_iso}")

    try:
        conversations_collection = weaviate_manager.client.collections.get("Conversations")
        
        response = conversations_collection.query.fetch_objects(
            filters=(
                Filter.by_property("userId").equal(user_id) & 
                Filter.by_property("timestamp").greater_or_equal(start_time_iso)
            ),
            limit=100,
            sort=wq.Sort.by_property("timestamp", ascending=True) 
        )

        if not response.objects:
            logger.info("No conversation history found.")
            return "No conversation history found for this period. Unable to generate report."

        # 4. 格式化数据
        history_lines = []
        for obj in response.objects:
            props = obj.properties
            
            timestamp = props.get('timestamp', 'Unknown Time')
            u_query = props.get('userQuery', '[No Query]')
            ai_resp = props.get('llmResponse', '[No Response]')
            
            history_lines.append(f"Time: {timestamp}\nUser: {u_query}\nAI: {ai_resp}\n---")
        
        conversation_history = "\n".join(history_lines)
        
        logger.info(f"Retrieved {len(history_lines)} conversation turns.")

        prompt_template = PromptTemplate(
            input_variables=["conversation_history"],
            template="""
            You are an empathetic AI assistant summarizing a user's week based on their chat history.
            
            Review the following conversation logs between the User and the AI:
            {conversation_history}

            Please generate a 'Weekly Report' that includes:
            1. **Key Topics**: What did the user talk about?
            2. **Emotional State**: Based on the tone, how was the user feeling?
            3. **Action Items/Advice given**: What suggestions did the AI give?
            
            Keep it concise and professional.
            
            Weekly Report:
            """
        )
        
        prompt = prompt_template.format(conversation_history=conversation_history)
        
        report = call_gemini_api(prompt)
        return report

    except Exception as e:
        logger.error(f"Error during report generation: {e}")
        if "could not find class" in str(e):
            logger.error("HINT: Did you run 'python -m init_schema' to create the database table?")
        raise

def insert_fake_data():
    manager = WeaviateManager()
    
    record = ConversationRecord(
        user_id="test_user_123",
        timestamp=datetime.now(timezone.utc),
        query_text="Hey, I struggled with sleeping this week.",
        response_text="I'm sorry to hear that. Have you tried meditation?",
        sentiment="Negative"
    )
    
    data_dict = record.to_weaviate_dict()
    success = manager.write_data("Conversations", [data_dict])
    
    if success:
        print("Test data inserted successfully!")
    
    manager.close()

if __name__ == "__main__":
    try:
        insert_fake_data()

        report = generate_weekly_report("test_user_123", "2023-10-01T00:00:00Z")
        print(report)

    finally:
        try:
            weaviate_manager.close()
        except Exception:
            pass
