import argparse
import asyncio
import getpass
from datetime import datetime, timezone

from ..auth.jwt_handler import jwt_handler
from .connection import connect_to_mongo, close_mongo_connection, db_manager


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or promote an admin user for QuizAPI."
    )
    parser.add_argument("--email", required=True, help="Admin user email")
    parser.add_argument("--full-name", required=True, help="Admin full name")
    return parser.parse_args()


async def create_or_promote_admin(email: str, full_name: str, password: str) -> None:
    db = db_manager.db
    existing_user = await db.users.find_one({"email": email})
    hashed_password = jwt_handler.hash_password(password)

    if existing_user:
        await db.users.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "full_name": full_name,
                    "hashed_password": hashed_password,
                    "is_active": True,
                    "is_admin": True,
                }
            },
        )
        print(f"Updated existing user as admin: {email}")
        return

    admin_doc = {
        "email": email,
        "full_name": full_name,
        "hashed_password": hashed_password,
        "is_active": True,
        "is_admin": True,
        "registration_date": datetime.now(timezone.utc),
        "last_login": None,
        "total_attempts": 0,
        "quiz_attempts": [],
        "average_score": 0.0,
    }

    result = await db.users.insert_one(admin_doc)
    print(f"Created admin user with id: {result.inserted_id}")


async def async_main(args: argparse.Namespace, password: str) -> None:
    await connect_to_mongo()
    try:
        await create_or_promote_admin(args.email, args.full_name, password)
    finally:
        await close_mongo_connection()


def main() -> None:
    args = parse_args()

    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        raise SystemExit("Passwords do not match.")

    asyncio.run(async_main(args, password))


if __name__ == "__main__":
    main()
