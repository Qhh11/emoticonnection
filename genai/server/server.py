# Standard library imports
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

# Third-party imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pymongo import MongoClient

# Add parent directory to path for imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.weaviate_client import WeaviateManager
from app.main import call_gemini_api, generate_weekly_report, generate_emotion_analytics_report, get_emotion_curve_data
from app.emotion_analytics import EmotionAnalytics

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def check_environment_variables():
    """Check if required environment variables are set."""
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY in environment")

check_environment_variables()

# Global instances
GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)
weaviate_manager = WeaviateManager()

# MongoDB connection for persistent emotion scores
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGODB_URI)
mongo_db = mongo_client["emoticonnection"]
daily_scores_collection = mongo_db["daily_emotion_scores"]


# ==================== API Routes ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'Gemini API Server',
        'weaviate_connected': weaviate_manager.client is not None
    }), 200


@app.route('/api/generate', methods=['POST'])
def generate_content():
    """
    Generate content using Gemini API.
    
    Request body:
        {
            "prompt": "Your prompt here"
        }
    
    Returns:
        {
            "success": true,
            "data": "Generated content",
            "prompt": "Original prompt"
        }
    """
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: prompt'
            }), 400
        
        prompt = data['prompt']
        
        if not prompt or not prompt.strip():
            return jsonify({
                'success': False,
                'error': 'Prompt cannot be empty'
            }), 400
        
        # Call Gemini API
        response_text = call_gemini_api(prompt)
        
        return jsonify({
            'success': True,
            'data': response_text,
            'prompt': prompt
        }), 200
        
    except Exception as e:
        logger.error(f"Error in generate_content endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/weaviate/search', methods=['POST'])
def vector_search():
    """
    Perform vector search using Weaviate.
    
    Request body:
        {
            "collection": "YourCollection",
            "query": "Search query",
            "limit": 5
        }
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        data = request.get_json()
        
        collection_name = data.get('collection')
        query = data.get('query')
        limit = data.get('limit', 5)
        
        if not collection_name or not query:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: collection and query'
            }), 400
        
        # Perform search using WeaviateManager
        results = weaviate_manager.search(
            collection_name=collection_name,
            query_text=query,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'data': results,
            'count': len(results)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in vector_search endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/weaviate/ingest', methods=['POST'])
def ingest_data():
    """
    Ingest data into Weaviate.
    
    Request body:
        {
            "collection": "YourCollection",
            "documents": [
                {"text": "Document 1", "metadata": {}},
                {"text": "Document 2", "metadata": {}}
            ]
        }
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        data = request.get_json()
        
        collection_name = data.get('collection')
        documents = data.get('documents', [])
        
        if not collection_name or not documents:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: collection and documents'
            }), 400
        
        # Ingest data using WeaviateManager
        weaviate_manager.ingest_data(
            collection_name=collection_name,
            data_list=documents
        )
        
        return jsonify({
            'success': True,
            'message': f'Successfully ingested {len(documents)} documents',
            'count': len(documents)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in ingest_data endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/reports/weekly', methods=['POST'])
def get_weekly_report():
    """
    Generate a weekly report for a user based on their conversation history.
    
    Request body:
        {
            "user_id": "test_user_123",
            "start_time": "2023-10-01T00:00:00Z"
        }
    
    Returns:
        {
            "success": true,
            "data": {
                "user_id": "test_user_123",
                "start_time": "2023-10-01T00:00:00Z",
                "report": "Generated weekly report content..."
            }
        }
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        user_id = data.get('user_id')
        start_time = data.get('start_time')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing required field: user_id'
            }), 400
        
        if not start_time:
            return jsonify({
                'success': False,
                'error': 'Missing required field: start_time (ISO 8601 format, e.g., 2023-10-01T00:00:00Z)'
            }), 400
        
        # Generate weekly report
        logger.info(f"Generating weekly report for user {user_id} since {start_time}")
        report = generate_weekly_report(user_id, start_time)
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'start_time': start_time,
                'report': report
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_weekly_report endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


# ==================== Emotion Analytics Endpoints ====================

@app.route('/api/emotion-analytics', methods=['GET'])
def get_emotion_analytics():
    """
    Generate comprehensive emotion analytics report.
    
    Query parameters:
        user_id (required): User identifier
        period_type (optional): 'weekly' or 'monthly' (default: 'weekly')
        end_date (optional): End date in ISO format
    
    Returns:
        Complete emotion analytics including:
        - metrics: average_mood_score, mood_stability, total_interactions
        - emotion_distribution: percentage breakdown
        - emotion_trend: time series data
        - word_cloud: high-frequency emotion words
        - triggers: common trigger scenarios
        - ai_analysis: summary, insights, suggestions, predictions
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        user_id = request.args.get('user_id')
        period_type = request.args.get('period_type', 'weekly')
        end_date = request.args.get('end_date')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: user_id'
            }), 400
        
        if period_type not in ['weekly', 'monthly']:
            return jsonify({
                'success': False,
                'error': "period_type must be 'weekly' or 'monthly'"
            }), 400
        
        logger.info(f"Generating {period_type} emotion analytics for user {user_id}")
        
        report = generate_emotion_analytics_report(user_id, period_type, end_date)
        
        return jsonify(report), 200
        
    except Exception as e:
        logger.error(f"Error in get_emotion_analytics endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/emotion-curve', methods=['GET'])
def get_emotion_curve():
    """
    Get emotion fluctuation curve data for visualization.
    
    Query parameters:
        user_id (required): User identifier
        days (optional): Number of days to analyze (default: 7)
    
    Returns:
        Time series data suitable for charting
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        user_id = request.args.get('user_id')
        days = request.args.get('days', 7, type=int)
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: user_id'
            }), 400
        
        if days < 1 or days > 90:
            return jsonify({
                'success': False,
                'error': 'days must be between 1 and 90'
            }), 400
        
        logger.info(f"Getting emotion curve for user {user_id}, last {days} days")
        
        curve_data = get_emotion_curve_data(user_id, days)
        
        return jsonify(curve_data), 200
        
    except Exception as e:
        logger.error(f"Error in get_emotion_curve endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/emotion-summary', methods=['GET'])
def get_emotion_summary():
    """
    Get simplified emotion summary with key metrics.
    
    Query parameters:
        user_id (required): User identifier
        period_type (optional): 'weekly' or 'monthly' (default: 'weekly')
    
    Returns:
        Simplified summary with key metrics and suggestions
    """
    try:
        if not weaviate_manager.client:
            return jsonify({
                'success': False,
                'error': 'Weaviate is not connected'
            }), 503
        
        user_id = request.args.get('user_id')
        period_type = request.args.get('period_type', 'weekly')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing required parameter: user_id'
            }), 400
        
        logger.info(f"Getting emotion summary for user {user_id}")
        
        report = generate_emotion_analytics_report(user_id, period_type)
        
        # Return simplified summary
        summary = {
            'user_id': user_id,
            'period_type': period_type,
            'average_mood_score': report['metrics']['average_mood_score'],
            'mood_stability': report['metrics']['mood_stability'],
            'dominant_emotions': list(report['emotion_distribution'].keys())[:3],
            'trend_direction': report['emotion_trend']['trend_direction'],
            'summary': report['ai_analysis']['summary_text'],
            'top_suggestions': report['ai_analysis']['suggestions'][:3]
        }
        
        return jsonify(summary), 200

    except Exception as e:
        logger.error(f"Error in get_emotion_summary endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== Emotion Scores Persistence API ====================

@app.route('/api/emotion-scores/weekly', methods=['GET'])
def get_weekly_emotion_scores():
    """
    Get user's persisted daily emotion scores for the past 7 days.

    Query parameters:
        user_id (required): User identifier

    Returns:
        Consistent data across all devices (stored in MongoDB)
    """
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'Missing user_id'}), 400

    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # 1. Lock past scores (ensure they can't be modified)
        daily_scores_collection.update_many(
            {"user_id": user_id, "date": {"$lt": today}, "locked": False},
            {"$set": {"locked": True}}
        )

        # 2. Get 7 days of data
        start_date = (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d")
        scores = list(daily_scores_collection.find(
            {"user_id": user_id, "date": {"$gte": start_date, "$lte": today}},
            {"_id": 0}
        ).sort("date", 1))

        # 3. If no scores exist, try to migrate from weekly report
        if not scores:
            scores = _migrate_from_weekly_report(user_id, today)

        # Convert datetime objects to strings for JSON serialization
        for score in scores:
            if isinstance(score.get('created_at'), datetime):
                score['created_at'] = score['created_at'].isoformat()
            if isinstance(score.get('updated_at'), datetime):
                score['updated_at'] = score['updated_at'].isoformat()

        return jsonify({"scores": scores}), 200

    except Exception as e:
        logger.error(f"Error in get_weekly_emotion_scores: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/emotion-scores/monthly', methods=['GET'])
def get_monthly_emotion_scores():
    """
    Get user's persisted daily emotion scores for the past 30 days.

    Query parameters:
        user_id (required): User identifier
    """
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'Missing user_id'}), 400

    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")

        daily_scores_collection.update_many(
            {"user_id": user_id, "date": {"$lt": today}, "locked": False},
            {"$set": {"locked": True}}
        )

        start_date = (datetime.utcnow() - timedelta(days=29)).strftime("%Y-%m-%d")
        scores = list(daily_scores_collection.find(
            {"user_id": user_id, "date": {"$gte": start_date, "$lte": today}},
            {"_id": 0}
        ).sort("date", 1))

        # Convert datetime objects to strings
        for score in scores:
            if isinstance(score.get('created_at'), datetime):
                score['created_at'] = score['created_at'].isoformat()
            if isinstance(score.get('updated_at'), datetime):
                score['updated_at'] = score['updated_at'].isoformat()

        return jsonify({"scores": scores}), 200

    except Exception as e:
        logger.error(f"Error in get_monthly_emotion_scores: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/emotion-scores/refresh-today', methods=['POST'])
def refresh_today_score():
    """
    Refresh today's emotion score based on today's chat conversations.
    Called after AI chat interactions to update the score.
    """
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'Missing user_id'}), 400

    try:
        # Generate daily report (only analyzes today's data)
        report = generate_emotion_analytics_report(user_id, 'daily')

        today = datetime.utcnow().strftime("%Y-%m-%d")

        # Get dominant emotion from distribution
        emotion_dist = report.get('emotion_distribution', {})
        dominant_emotion = 'neutral'
        if emotion_dist:
            dominant_emotion = max(emotion_dist.keys(), key=lambda k: emotion_dist[k])

        score_doc = {
            "user_id": user_id,
            "date": today,
            "avg_score": report.get('metrics', {}).get('average_mood_score', 0.0),
            "dominant_emotion": dominant_emotion,
            "interaction_count": report.get('metrics', {}).get('total_interactions', 0),
            "locked": False,
            "updated_at": datetime.utcnow()
        }

        daily_scores_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": score_doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )

        # Convert datetime for response
        score_doc["updated_at"] = score_doc["updated_at"].isoformat()

        return jsonify({"success": True, "score": score_doc}), 200

    except Exception as e:
        logger.error(f"Error in refresh_today_score: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


def _migrate_from_weekly_report(user_id: str, today: str) -> list:
    """
    Migrate historical data from weekly report on first access.
    This ensures existing users have their past data persisted.
    """
    try:
        logger.info(f"Migrating emotion scores from weekly report for user {user_id}")
        report = generate_emotion_analytics_report(user_id, 'weekly')
        data_points = report.get('emotion_trend', {}).get('data_points', [])

        migrated = []
        for dp in data_points:
            date_str = dp.get('date', '')[:10]  # Only take date part
            if not date_str:
                continue

            doc = {
                "user_id": user_id,
                "date": date_str,
                "avg_score": dp.get('avg_score', 0.0),
                "dominant_emotion": dp.get('dominant_emotion', 'neutral'),
                "interaction_count": dp.get('count', 1),
                "locked": date_str < today,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Only insert if not exists (avoid overwriting)
            daily_scores_collection.update_one(
                {"user_id": user_id, "date": doc['date']},
                {"$setOnInsert": doc},
                upsert=True
            )

            # Prepare for response
            doc_copy = doc.copy()
            doc_copy["created_at"] = doc["created_at"].isoformat()
            doc_copy["updated_at"] = doc["updated_at"].isoformat()
            migrated.append(doc_copy)

        logger.info(f"Migrated {len(migrated)} scores for user {user_id}")
        return migrated

    except Exception as e:
        logger.error(f"Migration failed for user {user_id}: {e}")
        return []


# ==================== Main ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Flask server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    try:
        app.run(
            host='0.0.0.0',
            port=port,
            debug=debug
        )
    finally:
        # Cleanup
        if weaviate_manager:
            weaviate_manager.close()
