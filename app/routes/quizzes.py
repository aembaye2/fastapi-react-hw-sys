from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from .. import schemas, models
from ..db.database import get_db
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()


@router.get("/quizzes/", response_model=List[schemas.Quiz])
async def get_quizzes(db: AsyncIOMotorClient = Depends(get_db)):
    quizzes = await db.quizzes.find().to_list(1000)
    for quiz in quizzes:
        quiz["_id"] = str(quiz["_id"])
    return quizzes

@router.get("/quizzes/{quiz_id}", response_model=schemas.Quiz)
async def get_quiz(quiz_id: str, db: AsyncIOMotorClient = Depends(get_db)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz["_id"] = str(quiz["_id"])
    return quiz