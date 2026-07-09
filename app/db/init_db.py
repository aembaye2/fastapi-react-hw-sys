from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime,timezone
from typing import Dict, Any, List
from bson import ObjectId
import bcrypt

async def create_user_indexes(db: AsyncIOMotorClient):  # Create indexes for the users collection to improve query performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("registration_date")
    await db.users.create_index("is_active")
    await db.users.create_index([("is_active", 1), ("registration_date", -1)])
    print("User collection indexes created successfully")


async def create_attempt_indexes(db: AsyncIOMotorClient):  # Create indexes for the attempts collection
    await db.attempts.create_index("user_id")
    await db.attempts.create_index("quiz_id")
    await db.attempts.create_index("attempt_date")
    await db.attempts.create_index([("user_id", 1), ("attempt_date", -1)])
    print("Attempt collection indexes created successfully")


async def update_user_stats(db: AsyncIOMotorClient, user_id: str):  # Update user statistics after a new attempt
    attempts = await db.attempts.find({"user_id": user_id}).to_list(1000)
    if not attempts:
        return
    total_attempts = len(attempts)
    total_score = sum(attempt["score"] for attempt in attempts)
    average_score = total_score / total_attempts if total_attempts > 0 else 0.0
    attempt_ids = [str(attempt["_id"]) for attempt in attempts]
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "total_attempts": total_attempts,
                "average_score": round(average_score, 2),
                "quiz_attempts": attempt_ids
            }
        }
    )

async def migrate_existing_users(db: AsyncIOMotorClient): # Migrate existing users to the new schema (adding missing fields with default values)
    users = await db.users.find({}).to_list(1000)
    for user in users:
        updates = {}
        # Add missing fields with default values
        if "is_active" not in user:
            updates["is_active"] = True
        if "is_admin" not in user:
            updates["is_admin"] = False
        if "registration_date" not in user:
            updates["registration_date"] = datetime.now(timezone.utc)
        if "total_attempts" not in user:
            updates["total_attempts"] = 0
        if "quiz_attempts" not in user:
            updates["quiz_attempts"] = []
        if "average_score" not in user:
            updates["average_score"] = 0.0

        if updates:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": updates}
            )
    print(f"Migrated {len(users)} users to new schema")

async def create_admin_user(db: AsyncIOMotorClient, email: str, password: str, full_name: str):  # Create an admin user

    existing_admin = await db.users.find_one({"email": email})
    if existing_admin:
        print(f"Admin user with email {email} already exists")
        return
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_user = {
        "email": email,
        "full_name": full_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_admin": True,
        "registration_date": datetime.now(timezone.utc),
        "total_attempts": 0,
        "quiz_attempts": [],
        "average_score": 0.0
    }
    result = await db.users.insert_one(admin_user)
    print(f"Admin user created with ID: {result.inserted_id}")

async def initialize_database(db: AsyncIOMotorClient):
    print("Initializing database...")
    await create_user_indexes(db)
    await create_attempt_indexes(db)
    await migrate_existing_users(db)
    print("Database initialization completed!")
