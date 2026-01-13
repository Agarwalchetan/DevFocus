import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import certifi

# Support both MONGODB_URI (Render) and MONGO_URL (local)
MONGO_URL = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'devfocus')

client = None
database = None

async def connect_to_mongo():
    global client, database
    
    if not MONGO_URL:
        raise ValueError("MongoDB connection string not found. Set MONGODB_URI or MONGO_URL environment variable.")
    
    print(f"Connecting to MongoDB...")
    
    # MongoDB connection options for better stability
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=10000,  # 10 seconds
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        retryWrites=True,
        tlsCAFile=certifi.where(),  # Use certifi for SSL certificates
        # These options help with Render deployment
        maxPoolSize=10,
        minPoolSize=1
    )
    
    database = client[DB_NAME]
    
    # Test connection
    try:
        await client.admin.command('ping')
        print(f"✅ Successfully connected to MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {str(e)}")
        raise
    
    # Create indexes (with error handling)
    try:
        await database.users.create_index("email", unique=True)
        await database.tasks.create_index([("userId", 1), ("createdAt", -1)])
        await database.focus_sessions.create_index([("userId", 1), ("startTime", -1)])
        await database.heatmap_entries.create_index([("userId", 1), ("date", -1)], unique=True)
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"⚠️  Warning: Index creation error (may already exist): {str(e)}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    return database
