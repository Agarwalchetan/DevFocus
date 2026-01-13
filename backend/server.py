from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
import json
import bcrypt
# Monkey patch bcrypt for passlib compatibility
if not hasattr(bcrypt, '__about__'):
    try:
        from collections import namedtuple
        Version = namedtuple("Version", ["__version__"])
        bcrypt.__about__ = Version(bcrypt.__version__)
    except Exception:
        pass

from database import connect_to_mongo, close_mongo_connection, get_database
from models import *
from auth import get_password_hash, verify_password, create_access_token, get_current_user, get_optional_current_user
from insights_service import InsightsService

active_connections: Dict[str, List[WebSocket]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan)
# Triggering reload for RoomSessionLog fix

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
    
    # Check if email exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_dict = {
        "name": user_data.name,
        "username": user_data.username,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "streakCount": 0,
        "totalFocusMinutes": 0,
        "lastFocusDate": None,
        "createdAt": datetime.now(timezone.utc).isoformat()
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

    # Fallback for old users without username
    username = user.get("username")
    if not username:
        username = user["email"].split("@")[0]
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        username=username,
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
        "type": task_data.type,  # Now just a string, no .value needed
        "techTags": task_data.techTags,
        "estimatedTime": task_data.estimatedTime,
        "totalFocusedTime": 0,
        "status": TaskStatus.TODO.value,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "scheduledDate": task_data.scheduledDate
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
            updatedAt=task["updatedAt"],
            scheduledDate=task.get("scheduledDate")
        )
        for task in tasks
    ]

# --- PROFILE ENHANCEMENTS ---

@app.get("/api/users/search", response_model=List[Dict])
async def search_users(q: Optional[str] = None):
    db = get_database()
    query = {}
    if q and len(q.strip()) > 0:
        query = {
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"username": {"$regex": q, "$options": "i"}}
            ]
        }
    
    users = await db.users.find(query).sort("createdAt", -1).limit(50).to_list(50)
    
    return [
        {
            "username": u.get("username", u["email"].split("@")[0]),
            "name": u["name"],
            "bio": u.get("bio"),
            "avatar": None
        }
        for u in users
    ]

@app.post("/api/users/{username}/follow")
async def follow_user(username: str, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    # 1. Get Target User
    target_user = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    currentUserDoc = await db.users.find_one({"email": current_user.email})
    current_user_id = str(currentUserDoc["_id"])
    target_user_id = str(target_user["_id"])
    
    if current_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    # 2. Check if already following
    is_following = target_user_id in currentUserDoc.get("following", [])
    
    if is_following:
        # Unfollow
        await db.users.update_one({"_id": currentUserDoc["_id"]}, {"$pull": {"following": target_user_id}})
        await db.users.update_one({"_id": target_user["_id"]}, {"$pull": {"followers": current_user_id}})
        return {"message": "Unfollowed"}
    else:
        # Follow
        await db.users.update_one({"_id": currentUserDoc["_id"]}, {"$addToSet": {"following": target_user_id}})
        await db.users.update_one({"_id": target_user["_id"]}, {"$addToSet": {"followers": current_user_id}})
        return {"message": "Followed"}

@app.get("/api/users/{username}/followers", response_model=List[Dict])
async def get_followers(username: str):
    db = get_database()
    user = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    followers_ids = user.get("followers", [])
    if not followers_ids:
        return []

    from bson import ObjectId
    followers = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in followers_ids]}}).to_list(len(followers_ids))
    
    return [
        {
            "username": u.get("username", u["email"].split("@")[0]),
            "name": u["name"],
            "avatar": None
        }
        for u in followers
    ]

@app.get("/api/users/{username}/following", response_model=List[Dict])
async def get_following(username: str):
    db = get_database()
    user = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    following_ids = user.get("following", [])
    if not following_ids:
        return []

    from bson import ObjectId
    following = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in following_ids]}}).to_list(len(following_ids))
    
    return [
        {
            "username": u.get("username", u["email"].split("@")[0]),
            "name": u["name"],
            "avatar": None
        }
        for u in following
    ]

# --- PUBLIC PROFILE STATS ---
@app.get("/api/users/{username}", response_model=UserProfileResponse)
async def get_public_profile(username: str, current_user: Optional[TokenData] = Depends(get_optional_current_user)):
    db = get_database()
    # Case insensitive search
    user = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id = str(user["_id"])
    
    # Check Following Status
    is_following = False
    if current_user:
        currentUserDoc = await db.users.find_one({"email": current_user.email})
        if currentUserDoc:
            is_following = user_id in currentUserDoc.get("following", [])

    # 1. Fetch all session logs for stats
    # Assuming logs are stored in 'focus_sessions' or aggregated in user. 
    # Actually, previous implementation might store logs in 'tasks' or separate collection.
    # Checking models... 'FocusSessionResponse'.
    
    # Let's aggregate from 'focus_sessions' if it exists, or just use User totals for MVP if granular data isn't easily queryable.
    # However, user requested "Today's Focus", "This Week". User model only has 'totalFocusMinutes'.
    # I need to fetch sessions.
    
    sessions = await db.focus_sessions.find({"userId": user_id}).to_list(10000)
    
    # Calculate Stats
    now = datetime.now(timezone.utc)
    today = now.date()
    start_of_week = today - timedelta(days=today.weekday()) # Monday
    
    today_minutes = 0
    week_minutes = 0
    total_minutes = user.get("totalFocusMinutes", 0)
    tag_counts = {}
    heatmap_data = [] # Format: { date: "2024-01-01", count: 5 }
    
    # Helper to parse date
    # Sessions might store 'startTime' as ISO string
    
    date_map = {}
    
    for session in sessions:
        try:
            # Parse start time
            s_time = datetime.fromisoformat(session["startTime"].replace("Z", "+00:00"))
            s_date = s_time.date()
            duration = session.get("duration", 0) # minutes
            
            # 1. Time Stats
            if s_date == today:
                today_minutes += duration
            if s_date >= start_of_week:
                week_minutes += duration
            
            # 2. Heatmap Data (Count = minutes or sessions? Usually intensity. Let's use minutes)
            d_str = s_date.isoformat()
            if d_str not in date_map: date_map[d_str] = 0
            date_map[d_str] += duration

            # 3. Tags (Need to fetch task to get tags? Session has taskId)
            # Optimization: If session doesn't have tags, we might skip or do a $lookup.
            # For MVP, if we don't have tags in session, we skip Top Tech for now or do a second query.
            # Let's defer Top Tech to avoid N+1 query if session doesn't embed it.
        except Exception: 
            pass

    # Convert map to list
    for d, mins in date_map.items():
        heatmap_data.append({"date": d, "count": mins})

    # Top Tech (Mock or fetch if feasible)
    # If we want real Top Tech, we need to aggregate tasks.
    # Let's fetch recent tasks for this user
    recent_tasks = await db.tasks.find({"userId": user_id}).sort("updatedAt", -1).limit(50).to_list(50)
    for t in recent_tasks:
        for tag in t.get("techTags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + t.get("totalFocusedTime", 0)
            
    top_tech = "N/A"
    if tag_counts:
        top_tech = max(tag_counts, key=tag_counts.get)

    return UserProfileResponse(
        id=user_id,
        name=user["name"],
        username=user.get("username", username),
        bio=user.get("bio"),
        avatar=None, # Future
        streak=user.get("streakCount", 0),
        stats={
            "today_minutes": today_minutes,
            "week_minutes": week_minutes,
            "total_minutes": total_minutes
        },
        top_tech=top_tech,
        heatmap_data=heatmap_data,
        joined_at=user["createdAt"],
        followers_count=len(user.get("followers", [])),
        following_count=len(user.get("following", [])),
        is_following=is_following
    )

# --- PROFILE ENHANCEMENTS ---

@app.patch("/api/users/me", response_model=UserResponse)
async def update_user(user_update: UserUpdate, current_user: TokenData = Depends(get_current_user)):
    db = get_database()
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    result = await db.users.update_one(
        {"email": current_user.email},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    user = await db.users.find_one({"email": current_user.email})
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        username=user.get("username", user["email"].split("@")[0]),
        email=user["email"],
        bio=user.get("bio"),
        streakCount=user.get("streakCount", 0),
        totalFocusMinutes=user.get("totalFocusMinutes", 0),
        lastFocusDate=user.get("lastFocusDate")
    )

# --- TASK TYPES MANAGEMENT ---

@app.get("/api/task-types", response_model=List[str])
async def get_task_types(current_user: TokenData = Depends(get_current_user)):
    """Get all task types (predefined + custom)"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    custom_types = user.get("customTaskTypes", [])
    # Merge predefined and custom, remove duplicates
    all_types = DEFAULT_TASK_TYPES + [t for t in custom_types if t not in DEFAULT_TASK_TYPES]
    
    return all_types

@app.post("/api/task-types")
async def add_task_type(request: dict, current_user: TokenData = Depends(get_current_user)):
    """Add a new custom task type"""
    db = get_database()
    
    task_type = request.get("type", "").strip()
    if not task_type:
        raise HTTPException(status_code=400, detail="Task type cannot be empty")
    
    user = await db.users.find_one({"email": current_user.email})
    custom_types = user.get("customTaskTypes", [])
    
    # Check if already exists (case-insensitive)
    if any(t.lower() == task_type.lower() for t in DEFAULT_TASK_TYPES + custom_types):
        raise HTTPException(status_code=400, detail="Task type already exists")
    
    # Add to user's custom types
    await db.users.update_one(
        {"email": current_user.email},
        {"$addToSet": {"customTaskTypes": task_type}}
    )
    
    return {"message": "Task type added", "type": task_type}

@app.delete("/api/task-types/{task_type}")
async def delete_task_type(task_type: str, current_user: TokenData = Depends(get_current_user)):
    """Delete a custom task type"""
    db = get_database()
    
    # Don't allow deleting predefined types
    if task_type in DEFAULT_TASK_TYPES:
        raise HTTPException(status_code=400, detail="Cannot delete predefined task types")
    
    await db.users.update_one(
        {"email": current_user.email},
        {"$pull": {"customTaskTypes": task_type}}
    )
    
    return {"message": "Task type deleted"}


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
        updatedAt=updated_task["updatedAt"],
        scheduledDate=updated_task.get("scheduledDate")
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

# --- ROUTES ---
from rooms_router import router as rooms_router
app.include_router(rooms_router)

@app.get("/api/insights")
async def get_insights(current_user: TokenData = Depends(get_current_user)):
    """Get all cached insights (weekly, monthly, burnout, smart plan)"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    insights_data = await insights_service.get_cached_insights(str(user["_id"]))
    
    return {
        "weekly_insights": insights_data.get("weekly_insights", []),
        "monthly_insights": insights_data.get("monthly_insights", []),
        "burnout_detection": insights_data.get("burnout_detection"),
        "smart_plan": insights_data.get("smart_plan"),
        "generated_at": insights_data.get("generated_at")
    }

@app.post("/api/insights/refresh")
async def refresh_insights(current_user: TokenData = Depends(get_current_user)):
    """Force refresh insights cache"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    insights_data = await insights_service.cache_insights(str(user["_id"]))
    
    return {
        "message": "Insights refreshed successfully",
        "weekly_insights": insights_data.get("weekly_insights", []),
        "monthly_insights": insights_data.get("monthly_insights", []),
        "burnout_detection": insights_data.get("burnout_detection"),
        "smart_plan": insights_data.get("smart_plan"),
        "generated_at": insights_data.get("generated_at")
    }

@app.get("/api/insights/weekly")
async def get_weekly_insights(current_user: TokenData = Depends(get_current_user)):
    """Get weekly insights"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    insights = await insights_service.calculate_weekly_insights(str(user["_id"]))
    
    return {"insights": insights}

@app.get("/api/insights/monthly")
async def get_monthly_insights(current_user: TokenData = Depends(get_current_user)):
    """Get monthly insights"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    insights = await insights_service.calculate_monthly_insights(str(user["_id"]))
    
    return {"insights": insights}

@app.get("/api/insights/burnout")
async def get_burnout_detection(current_user: TokenData = Depends(get_current_user)):
    """Get burnout detection data"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    burnout_data = await insights_service.detect_burnout(str(user["_id"]))
    
    return {"burnout": burnout_data}

@app.get("/api/insights/smart-plan")
async def get_smart_plan(current_user: TokenData = Depends(get_current_user)):
    """Get smart daily plan"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    plan = await insights_service.generate_smart_plan(str(user["_id"]))
    
    return {"plan": plan}

@app.post("/api/insights/chat")
async def chat_with_ai(
    request: dict,
    current_user: TokenData = Depends(get_current_user)
):
    """Chat with AI productivity coach with user history context"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    message = request.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    insights_service = InsightsService(db)
    response = await insights_service.chat_with_context(str(user["_id"]), message)
    
    return {"response": response}

@app.get("/api/insights/daily-recommendations")
async def get_daily_recommendations(current_user: TokenData = Depends(get_current_user)):
    """Get 5 daily AI-generated recommendations"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    insights_service = InsightsService(db)
    recommendations = await insights_service.generate_daily_recommendations(str(user["_id"]))
    
    return {"recommendations": recommendations}


@app.get("/api/history/tasks")
async def get_task_history(current_user: TokenData = Depends(get_current_user)):
    """Get all tasks with their focus session data"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    tasks = await db.tasks.find({"userId": str(user["_id"])}).sort("updatedAt", -1).to_list(None)
    
    result = []
    for task in tasks:
        # Get session count for this task
        session_count = await db.focus_sessions.count_documents({
            "taskId": str(task["_id"]),
            "completed": True
        })
        
        result.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "type": task["type"],
            "techTags": task["techTags"],
            "estimatedTime": task["estimatedTime"],
            "totalFocusedTime": task.get("totalFocusedTime", 0),
            "status": task["status"],
            "sessionCount": session_count,
            "createdAt": task["createdAt"],
            "updatedAt": task["updatedAt"]
        })
    
    return {"tasks": result}

@app.get("/api/history/sessions")
async def get_session_history(current_user: TokenData = Depends(get_current_user)):
    """Get all focus sessions with task details"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from bson import ObjectId
    sessions = await db.focus_sessions.find({
        "userId": str(user["_id"]),
        "completed": True
    }).sort("startTime", -1).to_list(None)
    
    result = []
    for session in sessions:
        # Get task details
        task = await db.tasks.find_one({"_id": ObjectId(session["taskId"])})
        
        result.append({
            "id": str(session["_id"]),
            "taskId": session["taskId"],
            "taskTitle": task["title"] if task else "Unknown Task",
            "taskType": task["type"] if task else "Coding",
            "startTime": session["startTime"],
            "endTime": session.get("endTime"),
            "duration": session["duration"],
            "completed": session["completed"]
        })
    
    return {"sessions": result}

@app.get("/api/history/analytics")
async def get_history_analytics(current_user: TokenData = Depends(get_current_user)):
    """Get comprehensive analytics from task and session history"""
    db = get_database()
    user = await db.users.find_one({"email": current_user.email})
    
    from collections import Counter
    
    # Get all tasks
    tasks = await db.tasks.find({"userId": str(user["_id"])}).to_list(None)
    
    # Get all completed sessions
    sessions = await db.focus_sessions.find({
        "userId": str(user["_id"]),
        "completed": True
    }).to_list(None)
    
    # Calculate tech tag usage
    tech_tags_counter = Counter()
    for task in tasks:
        for tag in task.get("techTags", []):
            tech_tags_counter[tag] += task.get("totalFocusedTime", 0)
    
    most_used_tags = [
        {"name": tag, "minutes": minutes}
        for tag, minutes in tech_tags_counter.most_common(10)
    ]
    
    # Calculate task type distribution
    type_counter = Counter()
    for task in tasks:
        type_counter[task["type"]] += task.get("totalFocusedTime", 0)
    
    task_type_distribution = [
        {"type": task_type, "minutes": minutes}
        for task_type, minutes in type_counter.items()
    ]
    
    # Calculate productivity metrics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t["status"] == "completed"])
    total_focus_time = sum(task.get("totalFocusedTime", 0) for task in tasks)
    total_sessions = len(sessions)
    avg_session_duration = sum(s["duration"] for s in sessions) / total_sessions if total_sessions > 0 else 0
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get recent activity (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    recent_sessions = [s for s in sessions if s.get("startTime", "") >= thirty_days_ago]
    recent_focus_time = sum(s["duration"] for s in recent_sessions)
    
    return {
        "mostUsedTags": most_used_tags,
        "taskTypeDistribution": task_type_distribution,
        "productivityMetrics": {
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "totalFocusTime": total_focus_time,
            "totalSessions": total_sessions,
            "avgSessionDuration": round(avg_session_duration, 1),
            "completionRate": round(completion_rate, 1),
            "recentFocusTime": recent_focus_time,
            "recentSessions": len(recent_sessions)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
