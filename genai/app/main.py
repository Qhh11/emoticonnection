# Standard library imports
import json
import os
import logging 
from datetime import datetime, timezone

# Third-party imports
from dotenv import load_dotenv
from google import genai
from google.genai import types
import weaviate.classes.query as wq # Weaviate v4 query helper
from weaviate.classes.query import Filter

# Local imports - support both direct execution and module imports
try:
    from weaviate_client import WeaviateManager 
    from model import ConversationRecord
    from emotion_analytics import (
        EmotionAnalytics, 
        generate_weekly_emotion_report,
        generate_monthly_emotion_report,
        EmotionSummary
    )
except ImportError:
    from app.weaviate_client import WeaviateManager 
    from app.model import ConversationRecord
    from app.emotion_analytics import (
        EmotionAnalytics,
        generate_weekly_emotion_report,
        generate_monthly_emotion_report,
        EmotionSummary
    ) 


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load project root .env
project_root = Path(__file__).resolve().parents[2]
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
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
            model="gemini-2.5-flash-lite", 
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
    if weaviate_manager is None or weaviate_manager.client is None:
        raise RuntimeError("WeaviateManager is not initialized or connected.")
    
    if not weaviate_manager.client.is_connected():
        weaviate_manager.client.connect() 

    logger.info(f"Fetching conversations for user {user_id} since {start_time_iso}")

    try:
        conversations_collection = weaviate_manager.client.collections.get("Conversations")
        
        response = conversations_collection.query.fetch_objects(
            filters=(
                (Filter.by_property("userId1").equal(user_id) | Filter.by_property("userId2").equal(user_id)) & 
                Filter.by_property("timestamp").greater_or_equal(start_time_iso)
            ),
            limit=100,
            sort=wq.Sort.by_property("timestamp", ascending=True) 
        )

        if not response.objects:
            logger.info("No conversation history found.")
            return "No conversation history found for this period. Unable to generate report."

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


def generate_emotion_analytics_report(
    user_id: str,
    period_type: str = "weekly",
    end_date: str = None
) -> dict:
    """
    Generate comprehensive emotion analytics report.
    
    Args:
        user_id: User identifier
        period_type: 'weekly' or 'monthly'
        end_date: Optional end date (ISO format)
        
    Returns:
        Dict containing the full emotion analytics report with:
        - average_mood_score: Overall mood score (-1 to 1)
        - mood_stability: Stability measure (0 to 1)
        - emotion_distribution: Percentage breakdown of emotions
        - emotion_trend: Time series data with trend direction
        - word_cloud: High-frequency emotion words
        - triggers: Common trigger scenarios
        - summary_text: AI-generated summary
        - key_insights: List of key findings
        - suggestions: Personalized recommendations
        - trend_prediction: Future trend forecast
    """
    if weaviate_manager is None:
        raise RuntimeError("WeaviateManager is not initialized")
    
    logger.info(f"Generating {period_type} emotion analytics for user {user_id}")
    
    analytics = EmotionAnalytics(weaviate_manager, GEMINI_CLIENT)
    
    report = analytics.generate_report(user_id, period_type, end_date)
    
    # Convert to dictionary for API response
    return {
        "user_id": report.user_id,
        "period_type": report.period_type,
        "start_date": report.start_date,
        "end_date": report.end_date,
        "metrics": {
            "average_mood_score": report.average_mood_score,
            "mood_stability": report.mood_stability,
            "total_interactions": report.total_interactions
        },
        "emotion_distribution": report.emotion_distribution,
        "emotion_trend": {
            "period": report.emotion_trend.period,
            "data_points": report.emotion_trend.data_points,
            "trend_direction": report.emotion_trend.trend_direction,
            "volatility": report.emotion_trend.volatility
        },
        "word_cloud": {
            "words": report.word_cloud.words,
            "top_emotions": report.word_cloud.top_emotions,
            "total_count": report.word_cloud.total_count
        },
        "triggers": [
            {
                "trigger_type": t.trigger_type,
                "frequency": t.frequency,
                "associated_emotions": t.associated_emotions,
                "example_contexts": t.example_contexts,
                "impact_score": t.impact_score
            }
            for t in report.triggers
        ],
        "ai_analysis": {
            "summary_text": report.summary_text,
            "key_insights": report.key_insights,
            "suggestions": report.suggestions,
            "trend_prediction": report.trend_prediction
        }
    }


def get_emotion_curve_data(
    user_id: str,
    days: int = 7
) -> dict:
    """
    Get emotion fluctuation curve data for visualization.
    
    Args:
        user_id: User identifier
        days: Number of days to analyze
        
    Returns:
        Time series data suitable for charting
    """
    from datetime import datetime, timezone, timedelta
    
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days)
    
    start_date = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_date = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    analytics = EmotionAnalytics(weaviate_manager, GEMINI_CLIENT)
    
    # Fetch and analyze
    conversations = analytics.fetch_user_conversations(user_id, start_date, end_date)
    data_points = analytics.analyze_emotions_from_text(conversations)
    trend = analytics.generate_emotion_trend(data_points)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "curve_data": trend.data_points,
        "trend_direction": trend.trend_direction,
        "volatility": trend.volatility
    }

def insert_fake_data():
    manager = WeaviateManager()
    
    record = ConversationRecord(
        user_id1="test_user_123",
        user_id2="test_user_456",
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
