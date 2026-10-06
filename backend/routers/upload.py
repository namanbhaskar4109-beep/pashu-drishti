from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from backend.database import db
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/upload", tags=["Storage"])


class UploadRequest(BaseModel):
    image: str
    name: Optional[str] = "scan.jpg"


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(body: UploadRequest, request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to upload image.")

    if not body.image or not body.image.strip():
        raise HTTPException(status_code=400, detail="Base64 image data is required.")

    try:
        image_url = db.save_uploaded_image(body.image, body.name or "scan.jpg")
        return {"imageUrl": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
