"""
GridFS Storage Service - 使用 MongoDB GridFS 存储媒体文件

GridFS 是 MongoDB 内置的文件存储系统，适合存储大于 16MB 的文件。
文件会被分块存储在 MongoDB 中，可以直接使用现有的 MongoDB Atlas 连接。
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, BinaryIO
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from bson import ObjectId


class GridFSStorage:
    """GridFS 文件存储服务"""

    def __init__(self, db):
        """
        初始化 GridFS 存储

        Args:
            db: AsyncIOMotorDatabase 实例
        """
        self.db = db
        self.fs = AsyncIOMotorGridFSBucket(db)

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        上传文件到 GridFS

        Args:
            file_content: 文件二进制内容
            filename: 原始文件名
            content_type: MIME 类型 (e.g., "image/jpeg")
            metadata: 额外的元数据

        Returns:
            包含文件 ID 和 URL 的字典
        """
        # 生成唯一文件名
        ext = Path(filename).suffix.lower()
        unique_filename = f"{uuid.uuid4().hex}{ext}"

        # 准备元数据
        file_metadata = {
            "original_filename": filename,
            "content_type": content_type,
            "uploaded_at": datetime.utcnow(),
            **(metadata or {})
        }

        # 上传到 GridFS
        file_id = await self.fs.upload_from_stream(
            unique_filename,
            file_content,
            metadata=file_metadata
        )

        print(f"[GridFS] Uploaded file: {unique_filename} (id: {file_id})")

        return {
            "file_id": str(file_id),
            "filename": unique_filename,
            "original_filename": filename,
            "content_type": content_type,
            "size": len(file_content),
            "url": f"/api/media/file/{file_id}"
        }

    async def get_file(self, file_id: str) -> Optional[Dict]:
        """
        从 GridFS 获取文件

        Args:
            file_id: 文件 ID (ObjectId 字符串)

        Returns:
            包含文件内容和元数据的字典，或 None
        """
        try:
            oid = ObjectId(file_id)
        except Exception:
            return None

        try:
            # 打开文件流
            grid_out = await self.fs.open_download_stream(oid)

            # 读取内容
            content = await grid_out.read()

            return {
                "content": content,
                "filename": grid_out.filename,
                "content_type": grid_out.metadata.get("content_type", "application/octet-stream"),
                "size": grid_out.length,
                "metadata": grid_out.metadata
            }
        except Exception as e:
            print(f"[GridFS] Error reading file {file_id}: {e}")
            return None

    async def delete_file(self, file_id: str) -> bool:
        """
        从 GridFS 删除文件

        Args:
            file_id: 文件 ID (ObjectId 字符串)

        Returns:
            是否删除成功
        """
        try:
            oid = ObjectId(file_id)
            await self.fs.delete(oid)
            print(f"[GridFS] Deleted file: {file_id}")
            return True
        except Exception as e:
            print(f"[GridFS] Error deleting file {file_id}: {e}")
            return False

    async def get_file_info(self, file_id: str) -> Optional[Dict]:
        """
        获取文件信息（不下载内容）

        Args:
            file_id: 文件 ID (ObjectId 字符串)

        Returns:
            文件信息字典，或 None
        """
        try:
            oid = ObjectId(file_id)
        except Exception:
            return None

        try:
            # 查找文件元数据
            cursor = self.db.fs.files.find({"_id": oid})
            file_doc = await cursor.to_list(length=1)

            if not file_doc:
                return None

            doc = file_doc[0]
            return {
                "file_id": str(doc["_id"]),
                "filename": doc["filename"],
                "size": doc["length"],
                "upload_date": doc["uploadDate"],
                "content_type": doc.get("metadata", {}).get("content_type", "application/octet-stream"),
                "metadata": doc.get("metadata", {})
            }
        except Exception as e:
            print(f"[GridFS] Error getting file info {file_id}: {e}")
            return None
