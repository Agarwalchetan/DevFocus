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

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[TaskType] = None
    techTags: Optional[List[str]] = None
    estimatedTime: Optional[int] = None
    status: Optional[TaskStatus] = None

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
