from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class User(BaseModel): # Represents a user in the system
    email: EmailStr
    full_name: str
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False
    registration_date: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    total_attempts: int = 0
    quiz_attempts: List[str] = []  # List of attempt IDs
    average_score: float = 0.0
    profile_picture: Optional[str] = None
    phone_number: Optional[str] = None
