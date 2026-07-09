from pydantic import BaseModel, Field
from typing import List, Optional
from .question import QuestionBase

class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, description="The title of the quiz.")
    description: Optional[str] = Field(None, description="A brief description of the quiz.")
    time_limit: Optional[int] = Field(None, description="Time limit for the quiz in minutes.")
    difficulty: str = Field(default="medium", description="Difficulty level: easy, medium, or hard.")

class QuizCreate(QuizBase):
    questions: List[QuestionBase] = Field(..., min_items=1, description="A list of questions in the quiz.")

class Quiz(QuizBase):
    id: str = Field(..., alias="_id", description="The unique identifier of the quiz.")
    questions: List[QuestionBase] = Field([], description="A list of questions in the quiz.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str
        }
    }
