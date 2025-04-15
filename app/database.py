from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from .models import User, ItemListing, AvailabilityPeriod

MONGODB_URL = os.getenv(
    "DATABASE_URL",
    "mongodb+srv://mkassem582:WmqH9D5vb9rAkPd@rentit.xwzhsm9.mongodb.net/db?retryWrites=true&w=majority&appName=RentIt"
)

async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(MONGODB_URL)
    
    # Initialize beanie with the Product document class
    await init_beanie(
        database=client.db,
        document_models=[
            User,
            ItemListing,
            AvailabilityPeriod
        ]
    ) 