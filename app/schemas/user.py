from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="The email address of the user.")
    full_name: str = Field(..., description="The full name of the user.")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="The password for the user account.")

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class QuizAttemptRecord(BaseModel):
    attempt_id: str = Field(..., description="The ID of the attempt")
    quiz_id: str = Field(..., description="The ID of the quiz")
    quiz_title: str = Field(..., description="The title of the quiz")
    score: float = Field(..., description="Score achieved in the attempt")
    completed_at: datetime = Field(..., description="When the attempt was completed")
    time_taken: Optional[int] = Field(None, description="Time taken in seconds")

class User(UserBase):
    id: str = Field(..., alias="_id", description="The unique identifier of the user.")
    is_active: bool = Field(default=True, description="Whether the user account is active.")
    is_admin: bool = Field(default=False, description="Whether the user has admin privileges.")
    registration_date: datetime = Field(..., description="When the user registered.")
    last_login: Optional[datetime] = Field(None, description="When the user last logged in.")
    total_attempts: int = Field(default=0, description="Total number of quiz attempts.")
    quiz_attempts: List[Dict[str, Any]] = Field(default=[], description="List of quiz attempt records.")
    average_score: float = Field(default=0.0, description="Average score across all attempts.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str,
            datetime: lambda v: v.isoformat() if v else None
        }
    }

class UserInDB(User):
    hashed_password: str = Field(..., description="The hashed password of the user.")

class UserStats(BaseModel):
    total_users: int
    active_users: int
    total_attempts: int
    average_score: float
