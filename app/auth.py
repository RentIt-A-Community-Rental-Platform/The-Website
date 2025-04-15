from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from typing import Optional
from .models import User

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl="https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl="https://oauth2.googleapis.com/token",
    scopes=["openid", "email", "profile"]
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
ALLOWED_DOMAIN = "nyu.edu"

async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
        
        # Check if the email is from the allowed domain
        if not idinfo["email"].endswith(f"@{ALLOWED_DOMAIN}"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only NYU email addresses are allowed"
            )
        
        # Get or create the user
        user = await User.find_one({"email": idinfo["email"]})
        if not user:
            user = User(
                id=idinfo["sub"],
                email=idinfo["email"],
                name=idinfo["name"],
                picture=idinfo.get("picture")
            )
            await user.insert()
        
        return user
        
    except Exception as e:
        raise credentials_exception

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 