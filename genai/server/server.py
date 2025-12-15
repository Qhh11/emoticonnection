# Standard library imports
import json
import os
import logging
from typing import Optional

# Third-party imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Add parent directory to path for imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.weaviate_client import WeaviateManager
from app.main import call_gemini_api, generate_weekly_report

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
