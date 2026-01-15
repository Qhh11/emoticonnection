import jwt
from datetime import datetime, timedelta
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

class AuthManager:
    def __init__(self):
        # self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.secret_key = "mysecretkeymysecretkeymysecretkey"
        self.algorithm = "HS256"
    
    def create_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT token"""
        payload = {
            "user_id": user_data["user_id"],
            "email": user_data.get("email"),
            "user_type": user_data.get("user_type", "default"),
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            print("-------verify")
            print(token)
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            print(payload)
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")