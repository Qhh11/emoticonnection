"""MongoDB 数据库连接配置"""

import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv

# Prefer `database/.env` when starting from repo root.
_database_env = Path(__file__).resolve().parents[1] / ".env"
if _database_env.exists():
    load_dotenv(dotenv_path=_database_env)
load_dotenv()

# MongoDB 连接配置
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "emotionconnect")

# 异步客户端（用于 FastAPI）
async_client = None
async_db = None

# 同步客户端（用于脚本和初始化）
sync_client = None
sync_db = None


async def connect_to_mongodb():
    """建立异步 MongoDB 连接"""
    global async_client, async_db
    async_client = AsyncIOMotorClient(MONGODB_URL)
    async_db = async_client[DATABASE_NAME]
    print(f"✅ Connected to MongoDB: {DATABASE_NAME}")


async def close_mongodb_connection():
    """关闭异步 MongoDB 连接"""
    global async_client
    if async_client:
        async_client.close()
        print("❌ MongoDB connection closed")


def get_sync_database():
    """获取同步数据库连接（用于初始化脚本）"""
    global sync_client, sync_db
    if not sync_client:
        sync_client = MongoClient(MONGODB_URL)
        sync_db = sync_client[DATABASE_NAME]
    return sync_db


def get_database():
    """获取异步数据库实例"""
    return async_db
