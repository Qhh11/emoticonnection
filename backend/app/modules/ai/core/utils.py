import os
import importlib.util
from pathlib import Path

def load_weaviate_manager():
    """动态加载 WeaviateManager"""
    try:
        # 尝试多种路径查找 genai/app
        current_file = Path(__file__).resolve()
        
        # 方法1: 从 backend/app/modules/ai/core 向上走 5 层到项目根目录
        project_root = current_file.parents[5]  # backend 的父目录是 emoticonnection
        genai_app_path = project_root / "genai" / "app"
        
        # 方法2: 如果方法1失败，尝试 WSL 路径
        if not genai_app_path.exists():
            wsl_path = Path("/mnt/c/Users/10857/Desktop/emoticonnection/genai/app")
            if wsl_path.exists():
                genai_app_path = wsl_path
        
        if not genai_app_path.exists():
            print(f"⚠️  genai/app path not found: {genai_app_path}")
            return None
        
        # 加载项目根目录的 .env 文件
        env_path = project_root / ".env"
        if env_path.exists():
            from dotenv import load_dotenv
            load_dotenv(env_path)
        
        # 导入 weaviate_client
        weaviate_spec = importlib.util.spec_from_file_location(
            "weaviate_client", genai_app_path / "weaviate_client.py"
        )
        weaviate_module = importlib.util.module_from_spec(weaviate_spec)
        weaviate_spec.loader.exec_module(weaviate_module)
        return weaviate_module.WeaviateManager()
    except Exception as e:
        print(f"⚠️  Failed to load WeaviateManager: {e}")
        import traceback
        traceback.print_exc()
        return None
