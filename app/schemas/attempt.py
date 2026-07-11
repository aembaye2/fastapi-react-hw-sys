from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class AnswerData(BaseModel):
    question_index: int = Field(..., description="Index of the question")
    selected_options: List[int] = Field(
        default_factory=list, description="List of selected option indices for multiplechoice")
    numeric_answer: Optional[float] = Field(
        None, description="Numeric answer value for numeric questions")
    is_correct: Optional[bool] = Field(
        None, description="Whether this answer was graded as correct")
    question_type: Optional[str] = Field(
        None, description="Question type captured at grading time")
    rendered_question_text: Optional[str] = Field(
        None,
        description="Rendered formula prompt shown to the user during the attempt"
    )


class AttemptBase(BaseModel):
    quiz_id: str = Field(..., description="The ID of the quiz being attempted")
    session_id: Optional[str] = Field(
        None, description="Runtime quiz session id for dynamic question grading")
    answers: List[AnswerData] = Field(
        ..., description="List of answers with question indices and selected options")
    time_taken: Optional[int] = Field(
        None, description="Time taken in seconds")


class AttemptCreate(AttemptBase):
    pass


class Attempt(BaseModel):
    id: str = Field(..., alias="_id",
                    description="The unique identifier of the attempt")
    user_id: str = Field(...,
                         description="The ID of the user who made the attempt")
    quiz_id: str = Field(..., description="The ID of the quiz being attempted")
    answers: List[AnswerData] = Field(
        ..., description="List of answers with question indices and selected options")
    score: float = Field(..., description="Score achieved in the attempt")
    completed_at: datetime = Field(...,
                                   description="When the attempt was completed")
    time_taken: Optional[int] = Field(
        None, description="Time taken in seconds")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str,
            datetime: lambda v: v.isoformat() if v else None
        }
    }
