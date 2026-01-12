from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class TaskType(str, Enum):
    STUDY = "Study"
    CODING = "Coding"
    DEBUGGING = "Debugging"
    PLANNING = "Planning"

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    streakCount: int
    totalFocusMinutes: int
    lastFocusDate: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    type: TaskType
    techTags: List[str] = []
    estimatedTime: int
    scheduledDate: Optional[str] = None  # ISO date string: "2026-01-15"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[TaskType] = None
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

class FocusRoomCreate(BaseModel):
    name: str
    isPrivate: bool = False

class FocusRoomResponse(BaseModel):
    roomId: str
    name: str
    isPrivate: bool
    activeUsers: List[Dict]
    createdAt: str

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
    ownerId: str
    ownerName: Optional[str] = None # For UI display
    isPrivate: bool = True 
    activeUsers: List[Dict] = [] 
    members: List[RoomMember] = [] 
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
