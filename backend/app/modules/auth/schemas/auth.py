from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    nickname: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    user_id: Optional[str] = None
    nickname: Optional[str] = None
    token: Optional[str] = None # For future JWT integration
