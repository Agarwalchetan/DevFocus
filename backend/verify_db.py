import asyncio
from database import get_database
from bson import ObjectId

async def verify():
    db = get_database()
    rooms = await db.focus_rooms.find({}).to_list(length=100)
    print("--- Database Rooms ---")
    for r in rooms:
        print(f"Room: {r.get('name')} ({r.get('_id')})")
        print(f"  Owner: {r.get('ownerId')}")
        print(f"  Blocked: {r.get('blockedUsers')}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(verify())
