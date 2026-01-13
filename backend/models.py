from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# Predefined task types (users can add their own)
DEFAULT_TASK_TYPES = ["Study", "Coding", "Debugging", "Planning"]

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class UserCreate(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    bio: Optional[str] = None
    streakCount: int
    totalFocusMinutes: int
    lastFocusDate: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    type: str  # Now accepts any string (predefined or custom)
    techTags: List[str] = []
    estimatedTime: int
    scheduledDate: Optional[str] = None  # ISO date string: "2026-01-15"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None  # Now accepts any string
    techTags: Optional[List[str]] = None
    estimatedTime: Optional[int] = None
    status: Optional[TaskStatus] = None
    scheduledDate: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    userId: str
    title: str
    type: str
    techTags: List[str]
    estimatedTime: int
    totalFocusedTime: int
    status: str
    createdAt: str
    updatedAt: str
    scheduledDate: Optional[str] = None

class FocusSessionCreate(BaseModel):
    taskId: str
    duration: int

class FocusSessionResponse(BaseModel):
    id: str
    userId: str
    taskId: str
    startTime: str
    endTime: Optional[str] = None
    duration: int
    completed: bool

class HeatmapEntryResponse(BaseModel):
    date: str
    totalMinutes: int
    categoryBreakdown: Dict[str, int]



class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class InsightResponse(BaseModel):
    type: str
    title: str
    description: str
    data: Dict
    icon: str

class BurnoutDetectionResponse(BaseModel):
    detected: bool
    severity: Optional[int] = None
    level: Optional[str] = None
    signals: Optional[List[str]] = None
    description: Optional[str] = None
    data: Optional[Dict] = None

class UserProfileResponse(BaseModel):
    id: str
    name: str
    username: str
    bio: Optional[str] = None
    avatar: Optional[str] = None
    streak: int
    stats: Dict[str, int] # today_minutes, week_minutes, total_minutes
    top_tech: Optional[str] = "N/A"
    heatmap_data: List[Dict] = []
    joined_at: str
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None

class SmartPlanTaskResponse(BaseModel):
    id: Optional[str] = None
    title: str
    type: str
    estimatedTime: int
    techTags: List[str] = []
    reason: Optional[str] = None

class SmartPlanResponse(BaseModel):
    suggested_tasks: List[SmartPlanTaskResponse]
    new_task_suggestion: Optional[SmartPlanTaskResponse] = None
    best_time_window: Dict
    estimated_total_duration: int
    recommended_capacity: float
    description: str

    generated_at: str

class RoomMemberStatus(str, Enum):
    PENDING = "pending"
    MEMBER = "member"
    ADMIN = "admin"

class RoomMember(BaseModel):
    userId: str
    name: str
    status: RoomMemberStatus = RoomMemberStatus.PENDING
    joinedAt: str

class ChatMessage(BaseModel):
    id: str
    userId: str
    userName: str
    content: str
    timestamp: str

class RoomTask(BaseModel):
    id: str
    title: str
    status: TaskStatus = TaskStatus.TODO
    assignedTo: Optional[str] = None # User Name
    createdBy: str
    createdAt: str

class FocusRoomCreate(BaseModel):
    name: str
    password: str # New: Required for all rooms now for simplicity, or optional
    description: Optional[str] = None

class SharedTaskCreate(BaseModel):
    title: str

class JoinRoomRequest(BaseModel):
    password: str

class FocusRoomResponse(BaseModel):
    roomId: str
    name: str
    description: Optional[str] = None
    ownerId: Optional[str] = None
    ownerName: Optional[str] = None # For UI display
    isPrivate: bool = True 
    activeUsers: List[Dict] = [] 
    members: List[RoomMember] = [] 
    blockedUsers: Optional[List[str]] = [] # List of User IDs
    pendingRequests: List[RoomMember] = [] 
    tasks: List[RoomTask] = []
    chatHistory: List[ChatMessage] = []
    createdAt: str
    # New Fields for Persistence & Expiry
    expiresAt: Optional[str] = None
    timerStartTime: Optional[str] = None
    timerDuration: Optional[int] = None
    timerStatus: Optional[str] = "stopped" # running, paused, stopped

class RoomSessionLog(BaseModel):
    duration: int
