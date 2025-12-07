"""
MongoDB connection configuration for FastAPI backend
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "emotionconnect")

# Global database instance
mongodb_client: AsyncIOMotorClient = None
mongodb: AsyncIOMotorClient = None


async def connect_to_mongodb():
    """Connect to MongoDB on application startup"""
    global mongodb_client, mongodb
    mongodb_client = AsyncIOMotorClient(MONGODB_URL)
    mongodb = mongodb_client[DATABASE_NAME]
    print(f"✅ Connected to MongoDB: {DATABASE_NAME}")


async def close_mongodb_connection():
    """Close MongoDB connection on application shutdown"""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        print("❌ MongoDB connection closed")


def get_database():
    """Get the MongoDB database instance"""
    return mongodb
