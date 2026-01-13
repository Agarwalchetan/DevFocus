import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

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
    
    # Simplified connection - let motor handle SSL automatically
    # mongodb+srv:// automatically handles TLS/SSL
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=30000,  # 30 seconds - give more time
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        # Let pymongo auto-detect SSL from URI (mongodb+srv handles this)
        tls=True,  # Explicitly enable TLS for mongodb+srv
        retryWrites=True,
        maxPoolSize=10,
        minPoolSize=1
    )
    
    database = client[DB_NAME]
    
    # Test connection with better error reporting
    try:
        # Simple ping to test connection
        result = await client.admin.command('ping')
        print(f"✅ Successfully connected to MongoDB: {DB_NAME}")
        print(f"   MongoDB server version: {result}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Error message: {str(e)}")
        print(f"   Connection string format: {MONGO_URL[:30]}...")  # Show first 30 chars only
        raise
    
    # Create indexes (with error handling)
    try:
        await database.users.create_index("email", unique=True)
        print("✅ Created index: users.email")
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
