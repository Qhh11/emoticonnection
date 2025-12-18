from fastapi import APIRouter, HTTPException, Body
from app.modules.auth.schemas.auth import LoginRequest, RegisterRequest, AuthResponse

# Database imports
import sys
from pathlib import Path

# Adjust path to include database (same as other modules)
# File path: backend/app/modules/auth/api/auth.py
# Depth: api(0), auth(1), modules(2), app(3), backend(4), emoticonnection?
# main.py is in backend/app.
# other modules use parents[5] / "database".
# Let's stick to the pattern.
try:
    database_path = Path(__file__).resolve().parents[5] / "database"
    if str(database_path) not in sys.path:
        sys.path.insert(0, str(database_path))
except:
    pass

try:
    from crud.user_crud import authenticate_user, create_user_with_password, get_all_users
except ImportError:
    # Fallback if path setup differs
    from database.crud.user_crud import authenticate_user, create_user_with_password, get_all_users

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    """
    Login endpoint.
    Uses synchronous DB call (runs in threadpool).
    """
    user = authenticate_user(username=request.username.strip(), password=request.password)
    if not user:
        # Return 401 but with success=False in body if client prefers or just 401
        # Schema has success: bool.
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return AuthResponse(
        success=True,
        message="Login successful",
        user_id=str(user.get("_id")),
        nickname=user.get("nickname") or user.get("username")
    )

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest):
    """
    Register endpoint.
    Uses synchronous DB call (runs in threadpool).
    """
    # Check if create_user_with_password returns ID or None
    user_id = create_user_with_password(
        username=request.username.strip(),
        password=request.password,
        email=(request.email.strip() if request.email else None),
        nickname=(request.nickname.strip() if request.nickname else "")
    )

    if not user_id:
        raise HTTPException(status_code=400, detail="User already exists")

    return AuthResponse(
        success=True,
        message="Registration successful",
        user_id=str(user_id)
    )

@router.get("/users")
def get_users():
    """List all users for peer chat contact list"""
    users = get_all_users()
    return [
        {
            "id": str(u["_id"]),
            "nickname": u.get("nickname") or u.get("username"),
            "username": u.get("username")
        }
        for u in users
    ]
