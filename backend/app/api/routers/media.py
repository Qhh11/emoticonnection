"""
Media Upload API Routes

This file implements endpoints for:
- Uploading images
- Uploading videos
- Managing media files
"""

import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ============================================================================
# Initialize Router
# ============================================================================

router = APIRouter(
    prefix="/media",
    tags=["media"]
)

# ============================================================================
# Configuration
# ============================================================================

# Get the backend directory (parent of app/)
# __file__ is at: backend/app/api/v1/routers/media.py
# We need to go up to: backend/
# media.py -> routers -> v1 -> api -> app -> backend (5 levels up)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

# Max file sizes (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100 MB

# ============================================================================
# Response Models
# ============================================================================

class MediaUploadResponse(BaseModel):
    """Response model for successful media upload"""
    success: bool
    media_url: str
    media_type: str
    filename: str
    file_size: int


# ============================================================================
# Helper Functions
# ============================================================================

def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    return Path(filename).suffix.lower()


def is_valid_extension(filename: str) -> bool:
    """Check if file extension is allowed"""
    ext = get_file_extension(filename)
    return ext in ALLOWED_EXTENSIONS


def get_media_type(filename: str) -> str:
    """Determine media type based on extension"""
    ext = get_file_extension(filename)
    if ext in ALLOWED_IMAGE_EXTENSIONS:
        return "image"
    elif ext in ALLOWED_VIDEO_EXTENSIONS:
        return "video"
    return "unknown"


def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename to avoid collisions"""
    ext = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex
    return f"{unique_id}{ext}"


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(file: UploadFile = File(...)):
    """
    Upload an image or video file

    ENDPOINT: POST /media/upload

    REQUEST:
    - Content-Type: multipart/form-data
    - Body: file (binary data)

    RESPONSE:
    {
        "success": true,
        "media_url": "/static/uploads/abc123.jpg",
        "media_type": "image",
        "filename": "abc123.jpg",
        "file_size": 245678
    }

    VALIDATION:
    - Only allowed file types (jpg, png, gif, mp4, etc.)
    - Max 10 MB for images
    - Max 100 MB for videos
    """

    # Validate file extension
    if not is_valid_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Determine media type
    media_type = get_media_type(file.filename)

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Validate file size
    if media_type == "image" and file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Max size: {MAX_IMAGE_SIZE / 1024 / 1024} MB"
        )
    elif media_type == "video" and file_size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Video too large. Max size: {MAX_VIDEO_SIZE / 1024 / 1024} MB"
        )

    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename)
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # Generate URL for accessing the file
    media_url = f"/static/uploads/{unique_filename}"

    print(f"[Media] Uploaded {media_type}: {unique_filename} ({file_size} bytes)")

    return MediaUploadResponse(
        success=True,
        media_url=media_url,
        media_type=media_type,
        filename=unique_filename,
        file_size=file_size
    )


@router.get("/info/{filename}")
async def get_media_info(filename: str):
    """
    Get information about an uploaded media file

    ENDPOINT: GET /media/info/abc123.jpg

    RESPONSE:
    {
        "exists": true,
        "filename": "abc123.jpg",
        "media_type": "image",
        "file_size": 245678,
        "url": "/static/uploads/abc123.jpg"
    }
    """
    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = file_path.stat().st_size
    media_type = get_media_type(filename)

    return {
        "exists": True,
        "filename": filename,
        "media_type": media_type,
        "file_size": file_size,
        "url": f"/static/uploads/{filename}"
    }


@router.delete("/delete/{filename}")
async def delete_media(filename: str):
    """
    Delete an uploaded media file

    ENDPOINT: DELETE /media/delete/abc123.jpg

    RESPONSE:
    {
        "success": true,
        "message": "File deleted successfully"
    }

    NOTE: In production, add authentication to prevent unauthorized deletion
    """
    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        file_path.unlink()
        print(f"[Media] Deleted file: {filename}")
        return {
            "success": True,
            "message": "File deleted successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )
