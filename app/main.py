from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from typing import List
from datetime import datetime

from . import models, schemas
from .database import init_db
from .auth import get_current_active_user
from .utils.gemini import GeminiService

app = FastAPI(title="University Rentals API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Initialize Gemini service
gemini_service = GeminiService()

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@app.post("/items/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user)
):
    # Validate file type
    if not file.content_type in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG and PNG images are allowed"
        )
    
    # Validate file size (10MB)
    file_size = 0
    for chunk in file.file:
        file_size += len(chunk)
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 10MB limit"
            )
    
    # Save the file
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("uploads", filename)
    
    with open(file_path, "wb") as buffer:
        file.file.seek(0)
        buffer.write(file.file.read())
    
    # Get Gemini suggestions
    suggestions = await gemini_service.analyze_image(file_path)
    if not suggestions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze image"
        )
    
    return {
        "image_url": f"/uploads/{filename}",
        "suggestions": suggestions
    }

@app.post("/items", response_model=schemas.ItemListing)
async def create_item(
    item: schemas.ItemListingCreate,
    current_user: models.User = Depends(get_current_active_user)
):
    # Create availability periods
    availability_periods = [
        models.AvailabilityPeriod(**period.dict())
        for period in item.availability_periods
    ]
    
    # Create item listing
    db_item = models.ItemListing(
        user_id=current_user.id,
        **item.dict(exclude={"availability_periods"}),
        availability_periods=availability_periods
    )
    
    await db_item.insert()
    return db_item

@app.get("/items", response_model=List[schemas.ItemListing])
async def list_items(skip: int = 0, limit: int = 100):
    items = await models.ItemListing.find_all().skip(skip).limit(limit).to_list()
    return items

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 