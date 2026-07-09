from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Literal


class OptionBase(BaseModel):
    option_text: str = Field(..., min_length=1,
                             description="The text of the option.")
    is_correct: bool = Field(
        default=False, description="Whether this option is the correct answer.")


class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1,
                               description="The text of the question.")
    type: Literal["multiplechoice", "numeric"] = Field(
        default="multiplechoice",
        description="Question type: multiplechoice or numeric."
    )
    options: Optional[List[OptionBase]] = Field(
        default=None,
        description="A list of possible answers for multiplechoice questions."
    )
    numeric_answer: Optional[float] = Field(
        default=None,
        description="Expected numeric answer when type is numeric."
    )

    @model_validator(mode="after")
    def validate_question_by_type(self):
        if self.type == "multiplechoice":
            if not self.options or len(self.options) < 2:
                raise ValueError(
                    "multiplechoice questions require at least two options")
            if not any(option.is_correct for option in self.options):
                raise ValueError(
                    "multiplechoice questions require at least one correct option")
        elif self.type == "numeric":
            if self.numeric_answer is None:
                raise ValueError("numeric questions require a numeric_answer")
        return self


class QuestionCreate(QuestionBase):
    pass


class Question(QuestionBase):
    id: str = Field(..., alias="_id",
                    description="The unique identifier of the question.")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            str: str
        }
    }
