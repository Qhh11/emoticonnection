import sys
import importlib.util
from pathlib import Path

def _load_emotion_analytics():
    """Dynamically load emotion_analytics module from genai/app"""
    try:
        # Get the project root directory - backend is at /Users/kaikai/emoticonnection/backend
        # genai/app is at /Users/kaikai/emoticonnection/genai/app
        
        # Hardcode the path relative to the backend app root for reliability in this environment
        # simulate running from backend/app/modules/ai/api/diary.py which is 4 levels deep from backend
        # But here we are at backend/test_import.py
        
        backend_app_path = Path(__file__).resolve().parent # /Users/kaikai/emoticonnection/backend
        project_root = backend_app_path.parent # /Users/kaikai/emoticonnection
        
        emotion_analytics_path = project_root / "genai" / "app" / "emotion_analytics.py"
        
        print(f"Looking for: {emotion_analytics_path}")
        
        if not emotion_analytics_path.exists():
            # Fallback to absolute path if relative fails
            emotion_analytics_path = Path("/Users/kaikai/emoticonnection/genai/app/emotion_analytics.py")
            
        if not emotion_analytics_path.exists():
             raise FileNotFoundError(f"emotion_analytics.py not found at {emotion_analytics_path}")

        # Add the parent directory to sys.path to allow imports within the module
        module_dir = emotion_analytics_path.parent
        if str(module_dir) not in sys.path:
            sys.path.append(str(module_dir))

        # Load emotion_analytics module
        spec = importlib.util.spec_from_file_location(
            "emotion_analytics", 
            str(emotion_analytics_path)
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load emotion_analytics.py from {emotion_analytics_path}")
        
        emotion_analytics = importlib.util.module_from_spec(spec)
        sys.modules["emotion_analytics"] = emotion_analytics
        spec.loader.exec_module(emotion_analytics)
        
        return emotion_analytics
    except Exception as e:
        print(f"Error loading emotion_analytics: {e}")
        import traceback
        traceback.print_exc()
        raise ImportError(f"Failed to load emotion_analytics module: {e}")

if __name__ == "__main__":
    try:
        module = _load_emotion_analytics()
        print("✅ Successfully loaded emotion_analytics")
        print(f"Module: {module}")
    except Exception as e:
        print(f"❌ Failed to load: {e}")
