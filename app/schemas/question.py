from pydantic import BaseModel, Field
from typing import List, Optional

class OptionBase(BaseModel):
    option_text: str = Field(..., min_length=1, description="The text of the option.")
    is_correct: bool = Field(default=False, description="Whether this option is the correct answer.")

class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1, description="The text of the question.")
    options: List[OptionBase] = Field(..., min_items=2, description="A list of possible answers for the question.")

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: str = Field(..., alias="_id", description="The unique identifier of the question.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str
        }
    }
