from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from ..schemas import question, quiz, attempt, user
from ..db.database import get_db
from ..auth.dependencies import get_current_admin_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)],
    responses={404: {"description": "Not found"}},
)


# User Management Endpoints
@router.get("/users", response_model=List[user.User])
async def admin_get_all_users(
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(100, ge=1, le=1000,
                       description="Number of users to return"),
    active_only: bool = Query(False, description="Filter active users only"),
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):   # Get all users with pagination and filtering options
    filter_query = {}
    if active_only:
        filter_query["is_active"] = True

    users_cursor = db.users.find(filter_query).skip(skip).limit(limit)
    users = await users_cursor.to_list(length=limit)

    for user_doc in users:
        user_doc["_id"] = str(user_doc["_id"])
        # Convert datetime fields to ISO format if they exist
        if "registration_date" in user_doc and user_doc["registration_date"]:
            user_doc["registration_date"] = user_doc["registration_date"].isoformat()
        if "last_login" in user_doc and user_doc["last_login"]:
            user_doc["last_login"] = user_doc["last_login"].isoformat()

    return users


@router.get("/users/stats", response_model=user.UserStats)
async def admin_get_user_stats(
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get overall user statistics"""
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})

    # Calculate total attempts and average score
    pipeline = [
        {"$group": {
            "_id": None,
            "total_attempts": {"$sum": "$total_attempts"},
            "avg_score": {"$avg": "$average_score"}
        }}
    ]

    stats_result = await db.users.aggregate(pipeline).to_list(1)
    total_attempts = stats_result[0]["total_attempts"] if stats_result else 0
    average_score = stats_result[0]["avg_score"] if stats_result else 0.0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_attempts": total_attempts,
        "average_score": round(average_score, 2)
    }


@router.get("/users/{user_id}", response_model=user.User)
async def admin_get_user(
    user_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get a specific user by ID"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    user_doc["_id"] = str(user_doc["_id"])
    if "registration_date" in user_doc and user_doc["registration_date"]:
        user_doc["registration_date"] = user_doc["registration_date"].isoformat()
    if "last_login" in user_doc and user_doc["last_login"]:
        user_doc["last_login"] = user_doc["last_login"].isoformat()

    return user_doc


@router.put("/users/{user_id}/toggle-active", response_model=user.User)
async def admin_toggle_user_active(
    user_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Toggle user active status"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Prevent admin from deactivating themselves
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own active status"
        )

    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    new_status = not user_doc.get("is_active", True)
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": new_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user["_id"] = str(updated_user["_id"])
    return updated_user


@router.put("/users/{user_id}/toggle-admin", response_model=user.User)
async def admin_toggle_user_admin(
    user_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Toggle user admin status"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Prevent admin from removing their own admin status
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own admin status"
        )

    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    new_admin_status = not user_doc.get("is_admin", False)
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_admin": new_admin_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user["_id"] = str(updated_user["_id"])
    return updated_user


@router.get("/users/{user_id}/attempts", response_model=List[attempt.Attempt])
async def admin_get_user_attempts(
    user_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get all attempts by a specific user"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Check if user exists
    user_exists = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")

    attempts = await db.attempts.find({"user_id": user_id}).to_list(1000)
    for attempt_doc in attempts:
        attempt_doc["_id"] = str(attempt_doc["_id"])

    return attempts


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Permanently delete a user and their attempts."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Prevent admin from deleting themselves
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )

    result = await db.users.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Remove attempts owned by the deleted user to avoid orphaned records.
    await db.attempts.delete_many({"user_id": user_id})

# Quiz Management Endpoints


@router.post("/quizzes", response_model=quiz.Quiz)
async def admin_create_quiz(
    quiz_data: quiz.QuizCreate,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Create a new quiz"""
    quiz_dict = quiz_data.model_dump()
    quiz_dict["created_by"] = current_admin.id
    quiz_dict["created_at"] = datetime.utcnow()

    result = await db.quizzes.insert_one(quiz_dict)
    quiz_dict["_id"] = str(result.inserted_id)

    return quiz_dict


@router.get("/quizzes", response_model=List[quiz.Quiz])
async def admin_get_all_quizzes(
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get all quizzes for admin"""
    quizzes = await db.quizzes.find().to_list(1000)
    for quiz_doc in quizzes:
        quiz_doc["_id"] = str(quiz_doc["_id"])
    return quizzes


@router.put("/quizzes/{quiz_id}", response_model=quiz.Quiz)
async def admin_update_quiz(
    quiz_id: str,
    quiz_data: quiz.QuizCreate,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Update a quiz"""
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz_dict = quiz_data.model_dump()
    quiz_dict["updated_at"] = datetime.utcnow()

    result = await db.quizzes.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": quiz_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    updated_quiz = await db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    updated_quiz["_id"] = str(updated_quiz["_id"])
    return updated_quiz


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_quiz(
    quiz_id: str,
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Delete a quiz"""
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    result = await db.quizzes.delete_one({"_id": ObjectId(quiz_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

# Dashboard Endpoints


@router.get("/dashboard")
async def admin_get_dashboard_stats(
    current_admin: user.User = Depends(get_current_admin_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get comprehensive dashboard statistics for admin"""
    try:
        # Get basic counts
        total_users = await db.users.count_documents({})
        total_quizzes = await db.quizzes.count_documents({})
        total_attempts = await db.attempts.count_documents({})

        # Get advanced statistics
        user_stats_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_score": {"$avg": "$score"},
                    "total_time": {"$sum": "$time_taken"}
                }
            }
        ]

        attempt_stats = await db.attempts.aggregate(user_stats_pipeline).to_list(1)
        avg_score = attempt_stats[0]["avg_score"] if attempt_stats else 0
        total_minutes = (
            attempt_stats[0]["total_time"] or 0) / 60 if attempt_stats else 0

        # Calculate averages
        avg_attempts_per_user = total_attempts / total_users if total_users > 0 else 0
        avg_attempts_per_quiz = total_attempts / \
            total_quizzes if total_quizzes > 0 else 0

        # User engagement (users who have taken at least one quiz)
        engaged_users = len(await db.attempts.distinct("user_id"))
        user_engagement = (engaged_users / total_users *
                           100) if total_users > 0 else 0

        # Recent activity data for charts
        recent_attempts_pipeline = [
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$completed_at"
                        }
                    },
                    "count": {"$sum": 1},
                    "avg_score": {"$avg": "$score"}
                }
            },
            {"$sort": {"_id": -1}},
            {"$limit": 7}
        ]

        recent_activity = await db.attempts.aggregate(recent_attempts_pipeline).to_list(7)

        return {
            "total_users": total_users,
            "total_quizzes": total_quizzes,
            "total_attempts": total_attempts,
            "total_minutes_taken": round(total_minutes, 2),
            "avg_score_percentage": round(avg_score, 2) if avg_score else 0,
            "avg_attempts_per_user": round(avg_attempts_per_user, 2),
            "avg_attempts_per_quiz": round(avg_attempts_per_quiz, 2),
            "user_engagement": round(user_engagement, 2),
            "recent_activity": recent_activity
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")
