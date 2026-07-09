from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime
from ..schemas import attempt
from ..db.database import get_db
from ..auth.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

@router.post("/quizzes/{quiz_id}/submit", response_model=attempt.Attempt, status_code=201)
async def submit_quiz_attempt(
    quiz_id: str,
    submission_data: attempt.AttemptCreate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    try:
        if not ObjectId.is_valid(quiz_id):
            raise HTTPException(status_code=400, detail="Invalid quiz ID")

        quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        answers = submission_data.answers

        total_questions = len(quiz["questions"])
        correct_count = 0

        for answer_data in answers:
            question_index = answer_data.question_index
            selected_options = answer_data.selected_options

            if question_index < len(quiz["questions"]):
                question = quiz["questions"][question_index]
                correct_options = [i for i, opt in enumerate(question["options"]) if opt["is_correct"]]

                if set(selected_options) == set(correct_options):
                    correct_count += 1

        score = (correct_count / total_questions * 100) if total_questions > 0 else 0

        attempt_data = {
            "user_id": current_user.id,
            "quiz_id": quiz_id,
            "quiz_title": quiz["title"],
            "answers": [answer.model_dump() for answer in answers],
            "score": round(score, 2),
            "completed_at": datetime.utcnow(),
            "time_taken": submission_data.time_taken
        }

        result = await db.attempts.insert_one(attempt_data)

        user = await db.users.find_one({"_id": ObjectId(current_user.id)})
        if user:
            user_attempts = await db.attempts.find({"user_id": current_user.id}).to_list(1000)
            total_attempts = len(user_attempts)
            total_score = sum(attempt["score"] for attempt in user_attempts)
            avg_score = total_score / total_attempts if total_attempts > 0 else 0

            attempt_record = {
                "attempt_id": str(result.inserted_id),
                "quiz_id": quiz_id,
                "quiz_title": quiz["title"],
                "score": round(score, 2),
                "completed_at": datetime.utcnow(),
                "time_taken": submission_data.time_taken
            }

            await db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {
                    "$set": {
                        "total_attempts": total_attempts,
                        "average_score": round(avg_score, 2)
                    },
                    "$push": {
                        "quiz_attempts": attempt_record
                    }
                }
            )

        created_attempt = await db.attempts.find_one({"_id": result.inserted_id})
        created_attempt["_id"] = str(created_attempt["_id"])

        return created_attempt

    except Exception as e:
        print(f"Quiz submission error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")

@router.get("/attempts/", response_model=List[attempt.Attempt])
async def get_user_attempts(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db),
    limit: int = 20,
    skip: int = 0
):
    total_attempts = await db.attempts.count_documents({"user_id": current_user.id})

    cursor = db.attempts.find({"user_id": current_user.id})
    cursor = cursor.sort("completed_at", -1)
    cursor = cursor.skip(skip).limit(limit)

    attempts = await cursor.to_list(limit)
    for attempt_doc in attempts:
        attempt_doc["_id"] = str(attempt_doc["_id"])

    return attempts

@router.get("/attempts/{attempt_id}", response_model=attempt.Attempt)
async def get_attempt_by_id(
    attempt_id: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    if not ObjectId.is_valid(attempt_id):
        raise HTTPException(status_code=400, detail="Invalid attempt ID")

    attempt_doc = await db.attempts.find_one({
        "_id": ObjectId(attempt_id),
        "user_id": current_user.id
    })

    if not attempt_doc:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt_doc["_id"] = str(attempt_doc["_id"])
    return attempt_doc
