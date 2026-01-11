import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'devfocus')

client = None
database = None

async def connect_to_mongo():
    global client, database
    client = AsyncIOMotorClient(MONGO_URL)
    database = client[DB_NAME]
    
    await database.users.create_index("email", unique=True)
    await database.tasks.create_index([("userId", 1), ("createdAt", -1)])
    await database.focus_sessions.create_index([("userId", 1), ("startTime", -1)])
    await database.heatmap_entries.create_index([("userId", 1), ("date", -1)], unique=True)
    
    print(f"Connected to MongoDB: {DB_NAME}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    return database
