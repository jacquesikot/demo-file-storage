"""
Supabase Storage Service Module
Handles all file operations using Supabase Storage instead of local filesystem
"""
import os
import json
import re
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from supabase import create_client, Client
from fastapi import HTTPException, UploadFile


class SupabaseStorageService:
    """Service class for managing files in Supabase Storage"""

    def __init__(self):
        """Initialize Supabase client with credentials from environment"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key for admin operations

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

        self.client: Client = create_client(supabase_url, supabase_key)
        self.bucket_name = "workflow-files"  # Main bucket for all files

        # Ensure bucket exists
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Ensure the storage bucket exists, create if it doesn't"""
        try:
            # Try to get bucket info
            self.client.storage.get_bucket(self.bucket_name)
        except Exception:
            # Bucket doesn't exist, create it
            try:
                self.client.storage.create_bucket(
                    self.bucket_name,
                    options={
                        "public": False,  # Private bucket
                        "file_size_limit": 52428800,  # 50MB limit
                        "allowed_mime_types": ["application/json", "text/markdown", "text/plain"]
                    }
                )
                print(f"Created Supabase storage bucket: {self.bucket_name}")
            except Exception as e:
                print(f"Bucket creation skipped or already exists: {e}")

    def _get_file_path(self, folder: str, filename: str) -> str:
        """Get the full storage path for a file"""
        return f"{folder}/{filename}"

    def list_files(self, folder: str, extension: str) -> List[dict]:
        """
        List all files in a specific folder with a specific extension

        Args:
            folder: The folder name (brand-data, brief-outputs, draft-outputs, etc.)
            extension: File extension to filter by (json, md, etc.)

        Returns:
            List of file metadata dictionaries
        """
        try:
            # List all files in the folder
            files = self.client.storage.from_(self.bucket_name).list(folder)

            result = []
            for file in files:
                if file["name"].endswith(f".{extension}"):
                    # Get file preview
                    preview = self._get_file_preview(folder, file["name"], extension)

                    result.append({
                        "name": file["name"],
                        "size": file.get("metadata", {}).get("size", 0),
                        "created_at": self._parse_timestamp(file.get("created_at")),
                        "preview": preview
                    })

            # Sort by creation time, newest first
            result.sort(key=lambda x: x["created_at"], reverse=True)
            return result

        except Exception as e:
            print(f"Error listing files in {folder}: {e}")
            return []

    def _parse_timestamp(self, timestamp_str: Optional[str]) -> float:
        """Parse ISO timestamp string to Unix timestamp"""
        if not timestamp_str:
            return datetime.now().timestamp()
        try:
            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            return dt.timestamp()
        except Exception:
            return datetime.now().timestamp()

    def _get_file_preview(self, folder: str, filename: str, extension: str, chars: int = 200) -> str:
        """Get a preview of the file content"""
        try:
            content = self.read_file(folder, filename)

            if extension == "json":
                data = json.loads(content)
                if "brandInfo" in data and isinstance(data["brandInfo"], dict):
                    brand_desc = data["brandInfo"].get("brandDescription", {})
                    if isinstance(brand_desc, dict):
                        return brand_desc.get("value", "")[:chars]
                return str(data)[:chars]
            elif extension == "md":
                # Remove markdown syntax for preview
                preview = re.sub(r'[#*`\[\]()]', '', content)
                return preview[:chars]
        except Exception as e:
            print(f"Error getting preview for {filename}: {e}")
            return ""
        return ""

    def read_file(self, folder: str, filename: str) -> str:
        """
        Read a file from Supabase Storage

        Args:
            folder: The folder name
            filename: The filename

        Returns:
            File content as string
        """
        try:
            file_path = self._get_file_path(folder, filename)

            # Download file content
            response = self.client.storage.from_(self.bucket_name).download(file_path)

            if response is None:
                raise HTTPException(status_code=404, detail="File not found")

            # Convert bytes to string
            content = response.decode('utf-8')
            return content

        except Exception as e:
            if "not found" in str(e).lower():
                raise HTTPException(status_code=404, detail="File not found")
            print(f"Error reading file {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    def write_file(self, folder: str, filename: str, content: str) -> bool:
        """
        Write or update a file in Supabase Storage

        Args:
            folder: The folder name
            filename: The filename
            content: Content to write (as string)

        Returns:
            True if successful
        """
        try:
            file_path = self._get_file_path(folder, filename)

            # Determine content type
            content_type = "application/json" if filename.endswith(".json") else "text/markdown"

            # Check if file exists
            try:
                existing = self.client.storage.from_(self.bucket_name).download(file_path)
                file_exists = existing is not None
            except Exception:
                file_exists = False

            # Upload or update file
            content_bytes = content.encode('utf-8')

            if file_exists:
                # Update existing file
                self.client.storage.from_(self.bucket_name).update(
                    file_path,
                    content_bytes,
                    {"content-type": content_type}
                )
            else:
                # Upload new file
                self.client.storage.from_(self.bucket_name).upload(
                    file_path,
                    content_bytes,
                    {"content-type": content_type}
                )

            return True

        except Exception as e:
            print(f"Error writing file {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")

    def delete_file(self, folder: str, filename: str) -> bool:
        """
        Delete a file from Supabase Storage

        Args:
            folder: The folder name
            filename: The filename

        Returns:
            True if successful, False if file doesn't exist
        """
        try:
            file_path = self._get_file_path(folder, filename)

            # Delete the file
            self.client.storage.from_(self.bucket_name).remove([file_path])
            return True

        except Exception as e:
            print(f"Error deleting file {filename}: {e}")
            return False

    async def save_upload(self, folder: str, file: UploadFile) -> str:
        """
        Save an uploaded file to Supabase Storage

        Args:
            folder: The folder name
            file: The uploaded file

        Returns:
            The filename
        """
        try:
            file_path = self._get_file_path(folder, file.filename)

            # Read file content
            content = await file.read()

            # Determine content type based on file extension
            if file.filename.endswith(".json"):
                content_type = "application/json"
            elif file.filename.endswith(".md"):
                content_type = "text/markdown"
            else:
                content_type = file.content_type or "text/plain"

            # Upload to Supabase Storage
            self.client.storage.from_(self.bucket_name).upload(
                file_path,
                content,
                {"content-type": content_type, "upsert": "true"}
            )

            return file.filename

        except Exception as e:
            print(f"Error uploading file {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    def save_file(self, folder: str, filename: str, content: str) -> bool:
        """
        Save/update a file in Supabase Storage

        Args:
            folder: The folder name
            filename: The filename
            content: Content to save

        Returns:
            True if successful
        """
        # Check if file exists first
        try:
            file_path = self._get_file_path(folder, filename)
            self.client.storage.from_(self.bucket_name).download(file_path)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found")

        return self.write_file(folder, filename, content)
