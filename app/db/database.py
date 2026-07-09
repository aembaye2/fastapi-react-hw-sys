from . import connection
from .connection import db_manager

async def get_db(): #provides the database connection to the FastAPI app
    if db_manager.db is None:
        await connection.connect_to_mongo()
    return db_manager.db