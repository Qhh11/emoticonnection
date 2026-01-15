import redis
import time
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class RateLimiter:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0,
            decode_responses=True
        ) if os.getenv("REDIS_HOST") else None
        
        # Rate limits (requests per minute)
        self.limits = {
            "default": 60,
            "authenticated": 120,
            "premium": 300
        }
    
    def is_allowed(self, client_id: str, user_type: str = "default") -> bool:
        """Check if client is within rate limits"""
        if not self.redis_client:
            return True  # No rate limiting if Redis unavailable
        
        limit = self.limits.get(user_type, self.limits["default"])
        key = f"rate_limit:{client_id}"
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                # First request
                self.redis_client.setex(key, 60, 1)
                return True
            
            if int(current) >= limit:
                return False
            
            # Increment counter
            self.redis_client.incr(key)
            return True
        except Exception:
            return True  # Allow request if Redis fails