from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Attempt(BaseModel): # Represents a quiz attempt
    quiz_id: str
    user_id: str
    answers: List[int]
    score: float
    max_score: float = Field(..., description="Maximum possible score for the quiz")
    percentage: float = Field(..., description="Score as a percentage")
    time_taken: Optional[int] = Field(None, description="Time taken in seconds")
    attempt_date: datetime = Field(default_factory=datetime.utcnow)
    is_completed: bool = Field(default=True, description="Whether the attempt was completed")
    correct_answers: int = Field(..., description="Number of correct answers")
    total_questions: int = Field(..., description="Total number of questions in the quiz")
