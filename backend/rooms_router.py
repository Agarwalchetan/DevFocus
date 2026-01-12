from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
from database import get_database
from models import (
    FocusRoomCreate, FocusRoomResponse, TokenData, JoinRoomRequest, 
    RoomMember, ChatMessage, RoomTask, TaskCreate, TaskUpdate, SharedTaskCreate, RoomSessionLog
)
from auth import verify_password, get_current_user, get_password_hash
from bson import ObjectId
from typing import List, Optional
import datetime
from datetime import timedelta
import asyncio
import json

router = APIRouter()

# --- Connection Manager for WebSockets ---
class ConnectionManager:
    def __init__(self):
        # stored as {room_id: [WebSocket, ...]}
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            # Dispatch to all clients
            # Handle broken pipes
            to_remove = []
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    to_remove.append(connection)
            
            for conn in to_remove:
                self.active_connections[room_id].remove(conn)

manager = ConnectionManager()

# --- ROOM CRUD ---

@router.get("/api/rooms", response_model=List[FocusRoomResponse])
async def get_rooms(search: Optional[str] = None, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    query = {}
    
    # Auto-deletion check could happen here or background job
    # For now, we rely on MongoDB TTL which we will set up
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
        
    rooms_cursor = db.focus_rooms.find(query)
    rooms = []
    async for room in rooms_cursor:
        room["roomId"] = str(room["_id"])
        room["ownerId"] = str(room.get("ownerId"))
        
        # Populate ownerName for UI helper (could be costly for large lists but fine for now)
        # Populate ownerName for UI helper (could be costly for large lists but fine for now)
        if room.get("ownerId"):
            try:
                owner_doc = await db.users.find_one({"_id": ObjectId(room["ownerId"])})
                if owner_doc:
                    room["ownerName"] = owner_doc.get("name")
            except Exception:
                room["ownerName"] = "Unknown"
        else:
            room["ownerName"] = "Unknown"
        
        # Sanitize timerDuration if float (sanitize bad data)
        if room.get("timerDuration"):
            room["timerDuration"] = int(room["timerDuration"])
            
        rooms.append(room)
        
    return rooms

@router.post("/api/rooms", response_model=FocusRoomResponse)
async def create_room(room: FocusRoomCreate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    # 24 Hour Expiry
    expires_at = datetime.datetime.utcnow() + timedelta(hours=24)
    
    new_room = {
        "name": room.name,
        "description": room.description,
        "ownerId": str(user["_id"]),
        "password": get_password_hash(room.password),
        "isPrivate": True,
        "members": [{
            "userId": str(user["_id"]),
            "name": user["name"],
            "status": "admin", # Owner is admin
            "joinedAt": datetime.datetime.utcnow().isoformat()
        }],
        "pendingRequests": [],
        "tasks": [],
        "chatHistory": [],
        "createdAt": datetime.datetime.utcnow().isoformat(),
        "expiresAt": expires_at.isoformat(),
        # Initial Timer State
        "timerStatus": "stopped",
        "timerDuration": 25, 
        "timerStartTime": None
    }
    
    result = await db.focus_rooms.insert_one(new_room)
    created_room = await db.focus_rooms.find_one({"_id": result.inserted_id})
    
    created_room["roomId"] = str(created_room["_id"])
    created_room["ownerId"] = str(created_room["ownerId"])
    created_room["ownerName"] = user.get("name")
    
    return created_room

@router.post("/api/rooms/{room_id}/join")
async def join_room_request(room_id: str, request: JoinRoomRequest, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # Check already member
    if any(m["userId"] == str(user["_id"]) for m in room.get("members", [])):
        return {"message": "Already a member", "status": "member"}
        
    # Verify Password (if exists)
    if room.get("password") and not verify_password(request.password, room["password"]):
         raise HTTPException(status_code=403, detail="Invalid password")
    
    # Check pending
    if any(p["userId"] == str(user["_id"]) for p in room.get("pendingRequests", [])):
        return {"message": "Request already pending", "status": "pending"}

    # Add to pending
    new_member = {
        "userId": str(user["_id"]),
        "name": user["name"],
        "status": "pending",
        "joinedAt": datetime.datetime.utcnow().isoformat()
    }
    
    await db.focus_rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$push": {"pendingRequests": new_member}}
    )
    
    # Notify Owner via WS? (Optimization)
    await manager.broadcast({
        "type": "room_update", 
        "trigger": "new_join_request"
    }, room_id)
    
    return {"message": "Join request sent", "status": "pending"}

@router.post("/api/rooms/{room_id}/approve")
async def approve_member(room_id: str, member_id: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404)
        
    if str(room.get("ownerId")) != str(user["_id"]):
         raise HTTPException(status_code=403, detail="Only owner can approve")
         
    # Find pending request
    pending = next((p for p in room.get("pendingRequests", []) if p["userId"] == member_id), None)
    if not pending:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Move to Member
    member_data = {
        "userId": pending["userId"],
        "name": pending["name"],
        "status": "member", # Approved
        "joinedAt": datetime.datetime.utcnow().isoformat()
    }
    
    await db.focus_rooms.update_one(
        {"_id": ObjectId(room_id)},
        {
            "$pull": {"pendingRequests": {"userId": member_id}},
            "$push": {"members": member_data}
        }
    )
    
    # Broadcast Update - IMPORTANT for Lobby Auto-Join
    await manager.broadcast({
        "type": "member_approved",
        "userId": member_id,
        "roomName": room["name"]
    }, room_id)
    
    await manager.broadcast({
        "type": "room_update",
        "trigger": "member_approved"
    }, room_id)
    
    return {"message": "Approved"}

# --- IN-ROOM FEATURES ---

@router.get("/api/rooms/{room_id}/chat", response_model=List[ChatMessage])
async def get_room_chat(room_id: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    if not room: return []
    return room.get("chatHistory", [])

@router.get("/api/rooms/{room_id}/tasks", response_model=List[RoomTask])
async def get_room_tasks(room_id: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    if not room: return []
    return room.get("tasks", [])

@router.post("/api/rooms/{room_id}/tasks", response_model=RoomTask)
async def create_room_task(room_id: str, task: SharedTaskCreate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    new_task = {
        "id": ObjectId().__str__(),
        "title": task.title,
        "status": "todo",
        "createdBy": user["name"],
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    
    await db.focus_rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$push": {"tasks": new_task}}
    )
    
    await manager.broadcast({
        "type": "new_task",
        "task": new_task
    }, room_id)
    
    return new_task

@router.patch("/api/rooms/{room_id}/tasks/{task_id}")
async def update_room_task(room_id: str, task_id: str, update: TaskUpdate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    update_fields = {}
    if update.status:
        update_fields["tasks.$.status"] = update.status
    if update.assignedTo:
         update_fields["tasks.$.assignedTo"] = update.assignedTo
         
    if not update_fields:
        return {"message": "No updates"}
        
    await db.focus_rooms.update_one(
        {"_id": ObjectId(room_id), "tasks.id": task_id},
        {"$set": update_fields}
    )
    
    # Broadcast update
    await manager.broadcast({
        "type": "task_updated",
        "taskId": task_id,
        "updates": update.dict(exclude_unset=True)
    }, room_id)
    
    return {"message": "Updated"}

# --- TIMER & SESSION LOGIC ---

@router.post("/api/rooms/{room_id}/timer")
async def update_timer_state(room_id: str, action: str, duration: Optional[int] = 25, current_user: TokenData = Depends(get_current_user)):
    # action: "start", "stop", "pause", "reset"
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    
    if not room:
        raise HTTPException(status_code=404)
        
    # Check Admin/Owner rights? For now let's assume any member can control timer (collaborative) or restrict to owner
    # User asked for "Admin" controls, so restrict to owner for critical actions?
    # Let's check status.
    is_owner = str(room.get("ownerId")) == str(user["_id"])
    
    updates = {}
    broadcast_msg = {"type": "timer_update"}
    
    if action == "start":
        updates["timerStatus"] = "running"
        updates["timerDuration"] = duration or room.get("timerDuration", 25)
        updates["timerStartTime"] = datetime.datetime.utcnow().isoformat()
        broadcast_msg.update({
             "status": "running", 
             "startTime": updates["timerStartTime"], 
             "duration": updates["timerDuration"]
        })
        
    elif action == "stop" or action == "reset":
        updates["timerStatus"] = "stopped"
        updates["timerStartTime"] = None
        # Maybe don't reset duration
        broadcast_msg.update({"status": "stopped", "startTime": None})
        
        # LOG SESSION FOR HEATMAP (If stopped from running)
        if room.get("timerStatus") == "running":
            # Heuristic: Credit users for time elapsed?
            pass

    elif action == "pause":
         updates["timerStatus"] = "paused"
         # Calculate remaining
         start_str = room.get("timerStartTime")
         if start_str:
             start_time = datetime.datetime.fromisoformat(start_str)
             elapsed = (datetime.datetime.utcnow() - start_time).total_seconds() / 60
             remaining = max(0, int(room.get("timerDuration", 25) - elapsed))
             updates["timerDuration"] = remaining # Update duration to remaining
             updates["timerStartTime"] = None
         broadcast_msg.update({"status": "paused", "duration": updates.get("timerDuration")})

    if updates:
        await db.focus_rooms.update_one({"_id": ObjectId(room_id)}, {"$set": updates})
        await manager.broadcast(broadcast_msg, room_id)
        
    return {"status": "updated"}


# --- WEBSOCKET HANDLER ---

@router.websocket("/api/ws/room/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    db = get_database()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Enrich with Server Time
            message["timestamp"] = datetime.datetime.utcnow().isoformat()
            
            # PERSISTENCE HANDLERS based on type
            if message["type"] == "chat_message":
                 new_msg = {
                    "id": message.get("id"),
                    "userId": message.get("userId"),
                    "userName": message.get("userName"),
                    "content": message.get("content"),
                    "timestamp": message["timestamp"]
                 }
                 await db.focus_rooms.update_one(
                     {"_id": ObjectId(room_id)},
                     {"$push": {"chatHistory": new_msg}}
                 )
                 # Broadcast back to room
                 await manager.broadcast(message, room_id)
            
            elif message["type"] == "timer_start":
                # Handle client-initiated timer (legacy/fallback)
                # It's better to use the HTTP endpoint for source of truth, but if frontend sends this:
                await db.focus_rooms.update_one(
                     {"_id": ObjectId(room_id)},
                     {"$set": {
                         "timerStatus": "running",
                         "timerDuration": message.get("duration", 25),
                         "timerStartTime": datetime.datetime.utcnow().isoformat()
                     }}
                 )
                await manager.broadcast(message, room_id)
                
            else:
                 # Generic broadcast for other events
                 await manager.broadcast(message, room_id)
                 
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast({"type": "user_left", "userId": "unknown"}, room_id)


# --- HEATMAP & SESSION LOGGING ---

# --- HEATMAP & SESSION LOGGING ---

@router.post("/api/rooms/{room_id}/log_session")
async def log_room_session(room_id: str, log_data: RoomSessionLog, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    room = await db.focus_rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Fetch requesting user to check permissions
    user = await db.users.find_one({"email": current_user.email})
    if room["ownerId"] != str(user["_id"]):
         raise HTTPException(status_code=403, detail="Only admin can log session credits")

    duration = log_data.duration
    if duration <= 0:
        return {"message": "Duration too short to log"}

    # Credit ALL active users
    # activeUsers is a list of dicts: [{userId: "...", ...}]
    active_users = room.get("activeUsers", [])
    
    today = datetime.datetime.utcnow().date().isoformat()
    count = 0
    
    for active_u in active_users:
        uid = active_u.get("userId")
        if not uid:
            continue
            
        # Update User Stats
        await db.users.update_one(
             {"_id": ObjectId(uid)},
             {
                 "$inc": {"totalFocusMinutes": duration},
                 "$set": {"lastFocusDate": datetime.datetime.utcnow().isoformat()}
             }
        )
        
        # Update Heatmap
        # Default category for Room sessions: "Study"
        task_type = "Study" 
        
        existing_heatmap = await db.heatmap_entries.find_one({"userId": uid, "date": today})
        
        if existing_heatmap:
            category_breakdown = existing_heatmap.get("categoryBreakdown", {})
            category_breakdown[task_type] = category_breakdown.get(task_type, 0) + duration
            
            await db.heatmap_entries.update_one(
                {"userId": uid, "date": today},
                {
                    "$inc": {"totalMinutes": duration},
                    "$set": {"categoryBreakdown": category_breakdown}
                }
            )
        else:
            await db.heatmap_entries.insert_one({
                "userId": uid,
                "date": today,
                "totalMinutes": duration,
                "categoryBreakdown": {task_type: duration}
            })
        count += 1
            
    return {"message": f"Logged {duration} minutes for {count} users"}
