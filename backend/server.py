from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Dict
import json

from database import connect_to_mongo, close_mongo_connection, get_database
from models import *
from auth import get_password_hash, verify_password, create_access_token, get_current_user

active_connections: Dict[str, List[WebSocket]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    db = get_database()
    
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "name": user_data.name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "streakCount": 0,
        "totalFocusMinutes": 0,
        "lastFocusDate": None,
        "createdAt": datetime.utcnow().isoformat()
    }
    
    result = await db.users.insert_one(user_dict)
    access_token = create_access_token(data={"sub": user_data.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_database()
    
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": credentials.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        streakCount=user.get("streakCount", 0),
        totalFocusMinutes=user.get("totalFocusMinutes", 0),
        lastFocusDate=user.get("lastFocusDate")
    )

@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    task_dict = {
        "userId": str(user["_id"]),
        "title": task_data.title,
        "type": task_data.type.value,
        "techTags": task_data.techTags,
        "estimatedTime": task_data.estimatedTime,
        "totalFocusedTime": 0,
        "status": TaskStatus.TODO.value,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }
    
    result = await db.tasks.insert_one(task_dict)
    task_dict["id"] = str(result.inserted_id)
    
    return TaskResponse(**task_dict)

@app.get("/api/tasks", response_model=List[TaskResponse])
async def get_tasks(current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    tasks = await db.tasks.find({"userId": str(user["_id"])}).sort("createdAt", -1).to_list(100)
    
    return [
        TaskResponse(
            id=str(task["_id"]),
            userId=task["userId"],
            title=task["title"],
            type=task["type"],
            techTags=task["techTags"],
            estimatedTime=task["estimatedTime"],
            totalFocusedTime=task.get("totalFocusedTime", 0),
            status=task["status"],
            createdAt=task["createdAt"],
            updatedAt=task["updatedAt"]
        )
        for task in tasks
    ]

@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from bson import ObjectId
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "userId": str(user["_id"])})
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_data.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        update_data["updatedAt"] = datetime.utcnow().isoformat()
        await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    
    return TaskResponse(
        id=str(updated_task["_id"]),
        userId=updated_task["userId"],
        title=updated_task["title"],
        type=updated_task["type"],
        techTags=updated_task["techTags"],
        estimatedTime=updated_task["estimatedTime"],
        totalFocusedTime=updated_task.get("totalFocusedTime", 0),
        status=updated_task["status"],
        createdAt=updated_task["createdAt"],
        updatedAt=updated_task["updatedAt"]
    )

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from bson import ObjectId
    result = await db.tasks.delete_one({"_id": ObjectId(task_id), "userId": str(user["_id"])})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

@app.post("/api/focus-sessions", response_model=FocusSessionResponse)
async def start_focus_session(session_data: FocusSessionCreate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from bson import ObjectId
    task = await db.tasks.find_one({"_id": ObjectId(session_data.taskId), "userId": str(user["_id"])})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session_dict = {
        "userId": str(user["_id"]),
        "taskId": session_data.taskId,
        "startTime": datetime.utcnow().isoformat(),
        "endTime": None,
        "duration": session_data.duration,
        "completed": False
    }
    
    result = await db.focus_sessions.insert_one(session_dict)
    session_dict["id"] = str(result.inserted_id)
    
    return FocusSessionResponse(**session_dict)

@app.patch("/api/focus-sessions/{session_id}/complete")
async def complete_focus_session(session_id: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from bson import ObjectId
    session = await db.focus_sessions.find_one({"_id": ObjectId(session_id), "userId": str(user["_id"])})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    end_time = datetime.utcnow()
    await db.focus_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"endTime": end_time.isoformat(), "completed": True}}
    )
    
    await db.tasks.update_one(
        {"_id": ObjectId(session["taskId"])},
        {"$inc": {"totalFocusedTime": session["duration"]}}
    )
    
    today = end_time.date().isoformat()
    task = await db.tasks.find_one({"_id": ObjectId(session["taskId"])})
    task_type = task.get("type", "Coding")
    
    existing_heatmap = await db.heatmap_entries.find_one({"userId": str(user["_id"]), "date": today})
    
    if existing_heatmap:
        category_breakdown = existing_heatmap.get("categoryBreakdown", {})
        category_breakdown[task_type] = category_breakdown.get(task_type, 0) + session["duration"]
        
        await db.heatmap_entries.update_one(
            {"userId": str(user["_id"]), "date": today},
            {
                "$inc": {"totalMinutes": session["duration"]},
                "$set": {"categoryBreakdown": category_breakdown}
            }
        )
    else:
        await db.heatmap_entries.insert_one({
            "userId": str(user["_id"]),
            "date": today,
            "totalMinutes": session["duration"],
            "categoryBreakdown": {task_type: session["duration"]}
        })
    
    last_focus_date = user.get("lastFocusDate")
    yesterday = (datetime.utcnow().date() - timedelta(days=1)).isoformat()
    
    if last_focus_date == yesterday:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$inc": {"streakCount": 1, "totalFocusMinutes": session["duration"]},
                "$set": {"lastFocusDate": today}
            }
        )
    elif last_focus_date != today:
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"streakCount": 1, "lastFocusDate": today},
                "$inc": {"totalFocusMinutes": session["duration"]}
            }
        )
    else:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"totalFocusMinutes": session["duration"]}}
        )
    
    return {"message": "Session completed successfully"}

@app.get("/api/heatmap", response_model=List[HeatmapEntryResponse])
async def get_heatmap(current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    entries = await db.heatmap_entries.find({"userId": str(user["_id"])}).sort("date", -1).to_list(365)
    
    return [
        HeatmapEntryResponse(
            date=entry["date"],
            totalMinutes=entry["totalMinutes"],
            categoryBreakdown=entry.get("categoryBreakdown", {})
        )
        for entry in entries
    ]

@app.get("/api/rooms", response_model=List[FocusRoomResponse])
async def get_focus_rooms():
    db = get_database()
    rooms = await db.focus_rooms.find({"isPrivate": False}).to_list(50)
    
    return [
        FocusRoomResponse(
            roomId=str(room["_id"]),
            name=room["name"],
            isPrivate=room["isPrivate"],
            activeUsers=room.get("activeUsers", []),
            createdAt=room["createdAt"]
        )
        for room in rooms
    ]

@app.post("/api/rooms", response_model=FocusRoomResponse)
async def create_focus_room(room_data: FocusRoomCreate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    room_dict = {
        "name": room_data.name,
        "isPrivate": room_data.isPrivate,
        "activeUsers": [],
        "createdAt": datetime.utcnow().isoformat()
    }
    
    result = await db.focus_rooms.insert_one(room_dict)
    room_dict["roomId"] = str(result.inserted_id)
    
    return FocusRoomResponse(**room_dict)

@app.websocket("/api/ws/room/{room_id}")
async def websocket_room(websocket: WebSocket, room_id: str):
    await websocket.accept()
    
    if room_id not in active_connections:
        active_connections[room_id] = []
    
    active_connections[room_id].append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            for connection in active_connections[room_id]:
                if connection != websocket:
                    await connection.send_text(json.dumps(message))
    
    except WebSocketDisconnect:
        active_connections[room_id].remove(websocket)
        if not active_connections[room_id]:
            del active_connections[room_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
