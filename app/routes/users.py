from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from ..schemas import user, attempt
from ..db.database import get_db
from ..db.init_db import update_user_stats
from ..auth.dependencies import get_current_user, get_current_active_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime,timezone
import bcrypt

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me", response_model=user.User)
async def get_current_user_profile(current_user: user.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=user.User)
async def update_current_user(
    user_update: user.UserUpdate,
    current_user: user.User = Depends(get_current_active_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    return user.User(**updated_user)

@router.get("/me/attempts", response_model=List[attempt.Attempt])
async def get_user_attempts(
    current_user: user.User = Depends(get_current_active_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    attempts = await db.attempts.find({"user_id": current_user.id}).sort("attempt_date", -1).to_list(1000)
    for attempt_doc in attempts:
        attempt_doc["_id"] = str(attempt_doc["_id"])
        if "attempt_date" in attempt_doc and attempt_doc["attempt_date"]:
            attempt_doc["attempt_date"] = attempt_doc["attempt_date"].isoformat()
    return attempts

@router.get("/me/stats")
async def get_user_stats(
    current_user: user.User = Depends(get_current_active_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    user_doc = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    recent_attempts = await db.attempts.find(
        {"user_id": current_user.id}
    ).sort("attempt_date", -1).limit(10).to_list(10)
    best_score = max((attempt_["score"] for attempt_ in recent_attempts), default=0.0)
    recent_average = sum(attempt_["score"] for attempt_ in recent_attempts) / len(recent_attempts) if recent_attempts else 0.0
    return {
        "total_attempts": user_doc.get("total_attempts", 0),
        "average_score": user_doc.get("average_score", 0.0),
        "best_score": best_score,
        "recent_average": round(recent_average, 2),
        "registration_date": user_doc.get("registration_date"),
        "last_login": user_doc.get("last_login")
    }

@router.post("/me/login")
async def update_last_login(
    current_user: user.User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Last login updated successfully"}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: user.User = Depends(get_current_active_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    result = await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

@router.get("/dashboard")
async def get_user_dashboard(
    current_user: user.User = Depends(get_current_active_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    user_id = current_user.id

    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    total_quizzes = await db.quizzes.count_documents({})

    user_attempts = await db.attempts.find({"user_id": user_id}).sort("completed_at", -1).to_list(1000)

    total_attempts = len(user_attempts)
    completed_quizzes = len(set(attempt["quiz_id"] for attempt in user_attempts))

    total_minutes = sum(attempt.get("time_taken", 0) for attempt in user_attempts) / 60

    avg_score = sum(attempt["score"] for attempt in user_attempts) / total_attempts if total_attempts > 0 else 0

    recent_attempts = user_attempts[:10]
    for attempt in recent_attempts:
        attempt["_id"] = str(attempt["_id"])
        if "completed_at" in attempt and attempt["completed_at"]:
            if isinstance(attempt["completed_at"], str):
                pass
            else:
                attempt["completed_at"] = attempt["completed_at"].isoformat()

    timeline_data = []
    for attempt in user_attempts:
        completed_at = attempt.get("completed_at")
        if completed_at:
            date_str = completed_at if isinstance(completed_at, str) else completed_at.isoformat()
            timeline_data.append({
                "date": date_str,
                "score": attempt["score"],
                "quiz_title": attempt.get("quiz_title", "Unknown Quiz")
            })

    timeline_data.sort(key=lambda x: x["date"])

    website_views = 1500

    return {
        "totalQuizzes": total_quizzes,
        "completedQuizzes": completed_quizzes,
        "totalAttempts": total_attempts,
        "totalMinutes": round(total_minutes, 2),
        "averageScore": round(avg_score, 2),
        "lastLogin": user_doc.get("last_login").isoformat() if user_doc.get("last_login") else None,
        "recentAttempts": recent_attempts,
        "scoreTimeline": timeline_data,
        "websiteViews": website_views
    }
