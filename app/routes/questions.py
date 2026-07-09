from fastapi import APIRouter, Depends, HTTPException
from typing import List
from .. import schemas
from ..db.database import get_db
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()


@router.get("/quizzes/{quiz_id}/questions/", response_model=List[schemas.Question])
async def get_questions_for_quiz(quiz_id: str, db: AsyncIOMotorClient = Depends(get_db)):
    quiz = await db.quizzes.find_one({"_id": quiz_id})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz["questions"]