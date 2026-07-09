from pydantic import BaseModel, Field
from typing import List

class Question(BaseModel): # Represents a quiz question
    question_text: str
    options: List[str]
    correct_option: int