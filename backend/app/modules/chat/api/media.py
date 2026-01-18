"""
Media Upload API Routes

This file implements endpoints for:
- Uploading images/videos to MongoDB GridFS (cloud storage)
- Retrieving media files
- Managing media files

Storage: MongoDB GridFS (stored in MongoDB Atlas cloud)
"""

import sys
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

# Import database config
database_path = Path(__file__).resolve().parents[5] / "database"
sys.path.insert(0, str(database_path))
from config.mongodb_config import get_database  # type: ignore

# Import GridFS storage
from app.modules.media.gridfs_storage import GridFSStorage

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

# Allowed file types
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

# MIME types mapping
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
}

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
    file_id: str  # GridFS file ID


# ============================================================================
# Helper Functions
# ============================================================================

def get_gridfs_storage() -> GridFSStorage:
    """Get GridFS storage instance"""
    db = get_database()
    return GridFSStorage(db)


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


def get_content_type(filename: str) -> str:
    """Get MIME type for file"""
    ext = get_file_extension(filename)
    return MIME_TYPES.get(ext, "application/octet-stream")


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(file: UploadFile = File(...)):
    """
    Upload an image or video file to MongoDB GridFS (cloud storage)

    ENDPOINT: POST /api/media/upload

    REQUEST:
    - Content-Type: multipart/form-data
    - Body: file (binary data)

    RESPONSE:
    {
        "success": true,
        "media_url": "/api/media/file/507f1f77bcf86cd799439011",
        "media_type": "image",
        "filename": "abc123.jpg",
        "file_size": 245678,
        "file_id": "507f1f77bcf86cd799439011"
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
    content_type = get_content_type(file.filename)

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

    # Upload to GridFS
    storage = get_gridfs_storage()
    try:
        result = await storage.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=content_type,
            metadata={"media_type": media_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )

    print(f"[Media] Uploaded {media_type} to GridFS: {result['filename']} ({file_size} bytes)")

    return MediaUploadResponse(
        success=True,
        media_url=result["url"],
        media_type=media_type,
        filename=result["filename"],
        file_size=file_size,
        file_id=result["file_id"]
    )


@router.get("/file/{file_id}")
async def get_media_file(file_id: str):
    """
    Retrieve a media file from GridFS

    ENDPOINT: GET /api/media/file/{file_id}

    Returns the actual file content with appropriate Content-Type header
    """
    storage = get_gridfs_storage()
    file_data = await storage.get_file(file_id)

    if not file_data:
        raise HTTPException(status_code=404, detail="File not found")

    return Response(
        content=file_data["content"],
        media_type=file_data["content_type"],
        headers={
            "Content-Disposition": f'inline; filename="{file_data["filename"]}"',
            "Cache-Control": "public, max-age=31536000"  # Cache for 1 year
        }
    )


@router.get("/info/{file_id}")
async def get_media_info(file_id: str):
    """
    Get information about an uploaded media file

    ENDPOINT: GET /api/media/info/{file_id}

    RESPONSE:
    {
        "exists": true,
        "file_id": "507f1f77bcf86cd799439011",
        "filename": "abc123.jpg",
        "media_type": "image",
        "file_size": 245678,
        "url": "/api/media/file/507f1f77bcf86cd799439011"
    }
    """
    storage = get_gridfs_storage()
    file_info = await storage.get_file_info(file_id)

    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")

    media_type = file_info.get("metadata", {}).get("media_type", "unknown")

    return {
        "exists": True,
        "file_id": file_info["file_id"],
        "filename": file_info["filename"],
        "media_type": media_type,
        "file_size": file_info["size"],
        "content_type": file_info["content_type"],
        "url": f"/api/media/file/{file_id}"
    }


@router.delete("/delete/{file_id}")
async def delete_media(file_id: str):
    """
    Delete an uploaded media file from GridFS

    ENDPOINT: DELETE /api/media/delete/{file_id}

    RESPONSE:
    {
        "success": true,
        "message": "File deleted successfully"
    }

    NOTE: In production, add authentication to prevent unauthorized deletion
    """
    storage = get_gridfs_storage()
    success = await storage.delete_file(file_id)

    if not success:
        raise HTTPException(status_code=404, detail="File not found or failed to delete")

    return {
        "success": True,
        "message": "File deleted successfully"
    }
