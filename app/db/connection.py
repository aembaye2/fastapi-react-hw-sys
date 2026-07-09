from motor.motor_asyncio import AsyncIOMotorClient
from ..utils.config import get_settings
import certifi


class DB:  # mongodb client and database manager
    client: AsyncIOMotorClient = None
    db = None


db_manager = DB()


async def connect_to_mongo():
    print("Connecting to MongoDB...")
    settings = get_settings()
    is_srv_uri = settings.mongodb_url.startswith("mongodb+srv://")

    # Use Atlas-friendly options only for SRV URIs; local MongoDB should stay non-TLS.
    if is_srv_uri:
        client_options = {
            "tls": True,
            "tlsCAFile": certifi.where(),
            "retryWrites": True,
            "w": "majority",
            "serverSelectionTimeoutMS": 30000,
            "connectTimeoutMS": 20000,
            "tlsAllowInvalidCertificates": False,
        }
    else:
        client_options = {
            "serverSelectionTimeoutMS": 30000,
            "connectTimeoutMS": 20000,
        }

    try:
        # Print a sanitized MongoDB URL for debugging.
        if "@" in settings.mongodb_url:
            safe_url = settings.mongodb_url.replace(
                settings.mongodb_url.split("@")[0], "mongodb://****:****"
            )
        else:
            safe_url = settings.mongodb_url
        print(f"Connecting to: {safe_url}")

        db_manager.client = AsyncIOMotorClient(
            settings.mongodb_url, **client_options)
        db_manager.db = db_manager.client[settings.mongodb_database]
        await db_manager.db.command("ping")
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        raise


async def close_mongo_connection():
    print("Closing MongoDB connection...")
    if db_manager.client:
        db_manager.client.close()
    print("MongoDB connection closed.")
