from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime
import math
from ..schemas import attempt
from ..db.database import get_db
from ..auth.dependencies import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()


@router.post("/quizzes/{quiz_id}/submit", response_model=attempt.Attempt, status_code=201)
async def submit_quiz_attempt(
    quiz_id: str,
    submission_data: attempt.AttemptCreate,
    current_user=Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    try:
        if not ObjectId.is_valid(quiz_id):
            raise HTTPException(status_code=400, detail="Invalid quiz ID")

        quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        answers = submission_data.answers
        session_doc = None
        grading_lookup = {}

        if submission_data.session_id:
            if not ObjectId.is_valid(submission_data.session_id):
                raise HTTPException(
                    status_code=400, detail="Invalid session ID")

            session_doc = await db.quiz_sessions.find_one(
                {
                    "_id": ObjectId(submission_data.session_id),
                    "quiz_id": quiz_id,
                    "user_id": current_user.id,
                }
            )
            if not session_doc:
                raise HTTPException(
                    status_code=400,
                    detail="Quiz session not found or does not belong to this user",
                )

            grading_lookup = {
                item.get("question_index"): item
                for item in session_doc.get("grading_key", [])
            }

        total_questions = len(quiz["questions"])
        correct_count = 0
        graded_answers = []

        for answer_data in answers:
            question_index = answer_data.question_index
            is_correct = False
            question_type = "multiplechoice"
            rendered_question_text = None

            if question_index < len(quiz["questions"]):
                question = quiz["questions"][question_index]
                question_type = question.get("type", "multiplechoice")
                session_grade_data = grading_lookup.get(question_index, {})
                if question_type == "formula":
                    rendered_question_text = session_grade_data.get(
                        "rendered_question_text")

                if question_type in ("numeric", "formula"):
                    if question_type == "formula" and not submission_data.session_id:
                        raise HTTPException(
                            status_code=400,
                            detail="Formula questions require a valid session_id from /quizzes/{quiz_id}/play",
                        )

                    expected_answer = session_grade_data.get("expected_answer")
                    if expected_answer is None and question_type == "numeric":
                        expected_answer = question.get("numeric_answer")

                    submitted_answer = answer_data.numeric_answer
                    if expected_answer is not None and submitted_answer is not None:
                        if math.isclose(float(submitted_answer), float(expected_answer), rel_tol=0.0, abs_tol=1e-6):
                            is_correct = True
                else:
                    selected_options = answer_data.selected_options or []
                    correct_options = session_grade_data.get("correct_options")
                    if correct_options is None:
                        correct_options = [
                            i for i, opt in enumerate(question.get("options", [])) if opt.get("is_correct")
                        ]

                    if set(selected_options) == set(correct_options):
                        is_correct = True

            if is_correct:
                correct_count += 1

            graded_answers.append(
                {
                    **answer_data.model_dump(),
                    "is_correct": is_correct,
                    "question_type": question_type,
                    "rendered_question_text": rendered_question_text,
                }
            )

        score = (correct_count / total_questions *
                 100) if total_questions > 0 else 0

        attempt_data = {
            "user_id": current_user.id,
            "quiz_id": quiz_id,
            "quiz_title": quiz["title"],
            "session_id": submission_data.session_id,
            "answers": graded_answers,
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

        if session_doc:
            await db.quiz_sessions.delete_one({"_id": session_doc["_id"]})

        return created_attempt

    except HTTPException:
        raise

    except Exception as e:
        print(f"Quiz submission error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to submit quiz: {str(e)}")


@router.get("/attempts/", response_model=List[attempt.Attempt])
async def get_user_attempts(
    current_user=Depends(get_current_user),
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
    current_user=Depends(get_current_user),
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


@router.delete("/attempts/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attempt(
    attempt_id: str,
    current_user=Depends(get_current_user),
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

    result = await db.attempts.delete_one({
        "_id": ObjectId(attempt_id),
        "user_id": current_user.id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attempt not found")

    remaining_attempts = await db.attempts.find({"user_id": current_user.id}).to_list(1000)
    total_attempts = len(remaining_attempts)
    total_score = sum(item.get("score", 0) for item in remaining_attempts)
    avg_score = total_score / total_attempts if total_attempts > 0 else 0.0

    remaining_attempt_records = []
    for item in remaining_attempts:
        remaining_attempt_records.append(
            {
                "attempt_id": str(item.get("_id")),
                "quiz_id": item.get("quiz_id"),
                "quiz_title": item.get("quiz_title", "Unknown Quiz"),
                "score": round(item.get("score", 0), 2),
                "completed_at": item.get("completed_at"),
                "time_taken": item.get("time_taken"),
            }
        )

    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {
            "$set": {
                "total_attempts": total_attempts,
                "average_score": round(avg_score, 2),
                "quiz_attempts": remaining_attempt_records,
            }
        },
    )
