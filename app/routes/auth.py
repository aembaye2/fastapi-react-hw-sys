from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from bson import ObjectId
import re

from ..schemas import auth as auth_schemas, user as user_schemas
from ..auth.jwt_handler import jwt_handler
from ..auth.dependencies import get_current_user, get_current_user_with_token
from ..db.database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: user_schemas.UserCreate,
    db: AsyncIOMotorClient = Depends(get_db)
):
    try:
        normalized_email = user_data.email.strip().lower()

        existing_user = await db.users.find_one({
            "email": {
                "$regex": f"^{re.escape(normalized_email)}$",
                "$options": "i",
            }
        })
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        hashed_password = jwt_handler.hash_password(user_data.password)

        user_doc = {
            "email": normalized_email,
            "full_name": user_data.full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "is_admin": False,
            "registration_date": datetime.now(timezone.utc),
            "last_login": None,
            "total_attempts": 0,
            "quiz_attempts": [],
            "average_score": 0.0
        }

        result = await db.users.insert_one(user_doc)

        return {
            "message": "User registered successfully",
            "user_id": str(result.inserted_id),
            "email": normalized_email
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login")
async def login_user(
    login_data: auth_schemas.LoginRequest,
    db: AsyncIOMotorClient = Depends(get_db)
):
    try:
        normalized_email = login_data.email.strip().lower()
        user = await db.users.find_one({
            "email": {
                "$regex": f"^{re.escape(normalized_email)}$",
                "$options": "i",
            }
        })
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not jwt_handler.verify_password(login_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )

        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )

        user_id = str(user["_id"])
        token_data = {
            "sub": user_id,
            "email": user["email"],
            "is_admin": user.get("is_admin", False)
        }

        access_token = jwt_handler.create_access_token(token_data)
        refresh_token = jwt_handler.create_refresh_token({"sub": user_id})

        user_response = {
            "id": user_id,
            "email": user["email"],
            "full_name": user["full_name"],
            "is_admin": user.get("is_admin", False),
            "is_active": user.get("is_active", True)
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_response
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/me")
async def get_authenticated_user(current_user: user_schemas.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
    }


@router.post("/refresh", response_model=auth_schemas.TokenResponse)
async def refresh_access_token(
    token_data: auth_schemas.RefreshTokenRequest,
    db: AsyncIOMotorClient = Depends(get_db)
):
    payload = jwt_handler.verify_token(token_data.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload"
        )

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    access_token = jwt_handler.create_access_token(
        {
            "sub": str(user["_id"]),
            "email": user["email"],
            "is_admin": user.get("is_admin", False),
        }
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout_user(
    current_user_and_token=Depends(get_current_user_with_token)
):
    _, access_token = current_user_and_token
    jwt_handler.blacklist_token(access_token)
    return {"message": "Logged out successfully"}
