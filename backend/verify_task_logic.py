import asyncio
# from database import get_database  <-- Removed
from models import RoomTaskCreate, RoomTask, TaskStatus
# from bson import ObjectId <-- keeping this, hoping it works or I mock it
from bson import ObjectId 
import datetime

async def test_create_task():
    print("Testing Room Task Creation...")
    
    # Mock Data
    room_id = ObjectId()
    print(f"Mock Room ID: {room_id}")
    
    task_input = RoomTaskCreate(title="Test Task")
    print(f"Input Model: {task_input}")
    
    # Simulate Logic in Router
    new_task = {
        "id": ObjectId().__str__(),
        "title": task_input.title,
        "status": "todo",
        "createdBy": "TestUser",
        "createdAt": datetime.datetime.utcnow().isoformat(),
        # This was the potential issue line:
        "scheduledDate": task_input.scheduledDate if hasattr(task_input, 'scheduledDate') else None
    }
    
    print(f"Generated Dict: {new_task}")
    
    # Validate against Response Model
    try:
        validated = RoomTask(**new_task)
        print(f"Validation Success: {validated}")
    except Exception as e:
        print(f"Validation Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_create_task())
