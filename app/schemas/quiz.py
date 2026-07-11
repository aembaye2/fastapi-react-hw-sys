from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from .question import QuestionBase


class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, description="The title of the quiz.")
    description: Optional[str] = Field(
        None, description="A brief description of the quiz.")
    time_limit: Optional[int] = Field(
        None, description="Time limit for the quiz in minutes.")
    difficulty: str = Field(
        default="medium", description="Difficulty level: easy, medium, or hard.")


class QuizCreate(QuizBase):
    questions: List[QuestionBase] = Field(..., min_items=1,
                                          description="A list of questions in the quiz.")


class Quiz(QuizBase):
    id: str = Field(..., alias="_id",
                    description="The unique identifier of the quiz.")
    questions: List[QuestionBase] = Field(
        [], description="A list of questions in the quiz.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str
        }
    }


class OptionForPlay(BaseModel):
    option_text: str = Field(...,
                             description="Option text shown to quiz takers.")


class QuestionForPlay(BaseModel):
    question_text: str = Field(...,
                               description="Question prompt shown to quiz takers.")
    type: Literal["multiplechoice", "numeric", "formula"] = Field(
        default="multiplechoice",
        description="Question type for rendering in the quiz player."
    )
    options: List[OptionForPlay] = Field(
        default_factory=list,
        description="Answer options for multiplechoice questions."
    )


class QuizPlay(BaseModel):
    session_id: str = Field(...,
                            description="Runtime quiz session id used for grading.")
    quiz_id: str = Field(..., description="Quiz id.")
    title: str = Field(..., description="Quiz title.")
    description: Optional[str] = Field(None, description="Quiz description.")
    time_limit: Optional[int] = Field(
        None, description="Time limit in minutes.")
    difficulty: str = Field(default="medium", description="Quiz difficulty.")
    questions: List[QuestionForPlay] = Field(
        default_factory=list,
        description="Questions prepared for quiz play without answer keys."
    )
