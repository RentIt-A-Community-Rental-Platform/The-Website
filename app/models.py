from beanie import Document, Indexed
from typing import List, Optional
from datetime import datetime
from pydantic import Field

class User(Document):
    id: str = Field(alias="_id")
    email: Indexed(str, unique=True)
    name: str
    picture: Optional[str] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "users"

class AvailabilityPeriod(Document):
    start_date: datetime
    end_date: datetime
    
    class Settings:
        name = "availability_periods"

class ItemListing(Document):
    user_id: str
    title: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    category: str
    image_url: Optional[str] = None
    status: str = "available"  # available, rented, unavailable
    created_at: datetime = Field(default_factory=datetime.utcnow)
    availability_periods: List[AvailabilityPeriod] = []
    
    class Settings:
        name = "item_listings" 