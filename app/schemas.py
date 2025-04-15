from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class AvailabilityPeriodBase(BaseModel):
    start_date: datetime
    end_date: datetime

class AvailabilityPeriodCreate(AvailabilityPeriodBase):
    pass

class AvailabilityPeriod(AvailabilityPeriodBase):
    id: int
    item_id: int

    class Config:
        from_attributes = True

class ItemListingBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    category: str
    image_url: Optional[str] = None

class ItemListingCreate(ItemListingBase):
    availability_periods: List[AvailabilityPeriodCreate]

class ItemListing(ItemListingBase):
    id: int
    user_id: str
    status: str
    created_at: datetime
    availability_periods: List[AvailabilityPeriod]

    class Config:
        from_attributes = True

class GeminiResponse(BaseModel):
    title: str
    description: str
    category: str 