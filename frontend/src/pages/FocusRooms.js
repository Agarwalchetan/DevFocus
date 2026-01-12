import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { User, Lock, Plus, MessageSquare, CheckSquare, Clock, Users, Send, Play, Pause, RotateCcw, Crown, AlertOctagon, ChevronLeft, ChevronRight, Sidebar } from "lucide-react";
import { useWebSocket } from '../hooks/useCustomHooks';

export const FocusRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [user, setUser] = useState({}); // User info
  const [loading, setLoading] = useState(true);
  const [personalTasks, setPersonalTasks] = useState([]);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedRoomToJoin, setSelectedRoomToJoin] = useState(null);

  // Form Inputs
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // In-Room State
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerStatus, setTimerStatus] = useState("stopped"); // stored locally for quick UI, synced via effect
  const [chatMessage, setChatMessage] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const chatScrollRef = useRef(null);

  // Layout State
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const token = localStorage.getItem('token');
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  // Custom Hook for WS
  const { messages, sendMessage, isConnected } = useWebSocket(
    currentRoom?.roomId,
    token
  );

  const fetchPersonalTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPersonalTasks(data.filter(t => t.status !== 'completed'));
    } catch (e) { }
  }, [API_URL, token]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUser(data);
    } catch (e) { console.error(e); }
  }, [API_URL, token]);

  const fetchRooms = useCallback(async () => {
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`${API_URL}/api/rooms${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, searchQuery]);

  const getMyStatus = useCallback((room) => {
    const uid = String(user.id || user._id);
    if (room.ownerId === uid) return 'admin';
    const member = room.members?.find(m => String(m.userId) === uid);
    if (member) return 'member';
    const pending = room.pendingRequests?.find(p => String(p.userId) === uid);
    if (pending) return 'pending';
    return null;
  }, [user]);

  const fetchRoomDetails = useCallback(async (roomId) => {
    try {
      // Temporarily use search to find single or just re-list if we don't have get-one
      // We can use the existing /api/rooms listing logic for now as it's efficient enough for MVP
      const res = await fetch(`${API_URL}/api/rooms?search=`, { headers: { Authorization: `Bearer ${token}` } });
      const all = await res.json();
      const found = all.find(r => r.roomId === roomId);
      if (found) {
        const myStatus = getMyStatus(found);
        setCurrentRoom({ ...found, status: myStatus });

        // Initial Timer Sync - UTC SAFE
        if (found.timerStatus === 'running' && found.timerStartTime) {
          // Add Z if missing to force UTC parsing in new Date()
          const timeStr = found.timerStartTime.endsWith('Z') ? found.timerStartTime : found.timerStartTime + 'Z';
          const start = new Date(timeStr).getTime();
          // Force UTC now
          const now = new Date().getTime();
          // Note: new Date() gives local time value, but .getTime() gives UTC timestamp.
          // The issue is parsing the ISO string. new Date("...Z") parses as UTC.
          // So (now - start) is correct if start is UTC.

          const elapsedSecs = (now - start) / 1000;
          const durationSecs = (found.timerDuration || 25) * 60;
          const remaining = Math.max(0, durationSecs - elapsedSecs);
          setTimeLeft(remaining);
          setTimerStatus('running');
        } else {
          setTimeLeft((found.timerDuration || 25) * 60);
          setTimerStatus(found.timerStatus || 'stopped');
        }
      }
    } catch (e) { }
  }, [API_URL, token, getMyStatus]);

  // Fetch User & Rooms on Mount
  useEffect(() => {
    fetchUser();
    fetchRooms();
    fetchPersonalTasks();
  }, [fetchUser, fetchRooms, fetchPersonalTasks]);

  // Scroll Chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, currentRoom?.chatHistory]);

  // --- ROOM SYNC & TIMER LOGIC ---

  // Keep track of processed messages to avoid duplicates/loops
  const processedMessagesLen = useRef(0);

  // Sync Room Data from incoming messages
  useEffect(() => {
    if (!messages) return;

    const newCount = messages.length;
    if (newCount > processedMessagesLen.current) {
      // Process only NEW messages
      const newMessages = messages.slice(processedMessagesLen.current);

      newMessages.forEach(msg => {
        // 1. Handle Member Approval (Lobby -> Member)
        if (msg.type === 'member_approved') {
          // If I am the one approved
          if (msg.userId === (user.id || user._id)) {
            toast.success("You have been approved! Entering room...");
            // We must re-fetch. Since status is dynamic based on list, fetching list is safe.
            if (currentRoom?.roomId) fetchRoomDetails(currentRoom.roomId);
          }
        }

        // 2. Handle Room Updates (Join Requests for Admins, etc)
        if (msg.type === 'room_update') {
          // Triggers when someone joins, leaves, or is approved.
          // We need to re-fetch to update pendingRequests list or member list.
          if (currentRoom?.roomId) fetchRoomDetails(currentRoom.roomId);
        }

        // 3. Handle Timer Updates
        if (msg.type === 'timer_update') {
          // Re-fetch to sync time logic (server is truth)
          if (currentRoom?.roomId) fetchRoomDetails(currentRoom.roomId);
        }

        // 4. Handle Tasks
        if (msg.type === 'task_updated' || msg.type === 'new_task') {
          if (currentRoom?.roomId) fetchRoomDetails(currentRoom.roomId);
        }
      });

      processedMessagesLen.current = newCount;
    }
  }, [messages, currentRoom?.roomId, fetchRoomDetails, user.id, user._id]);


  // Task Type Toggle State
  const [newTaskType, setNewTaskType] = useState('shared'); // 'shared' | 'personal'

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (newTaskType === 'personal') {
      // Create Personal Task
      fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newTaskTitle,
          type: 'Study', // Default
          techTags: [],
          estimatedTime: 25
        })
      }).then((res) => {
        if (res.ok) toast.success("Added to your Personal Dashboard");
        else toast.error("Failed to add personal task");
        setNewTaskTitle('');
        fetchPersonalTasks(); // Refresh personal tasks
      });
    } else {
      // Create Room Task (Shared)
      fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTaskTitle })
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          console.error("Task Creation Failed:", err);
          toast.error(err.detail ? JSON.stringify(err.detail) : "Failed to create task");
          return;
        }
        setNewTaskTitle('');
        fetchRoomDetails(currentRoom.roomId);
      }).catch(e => {
        console.error("Network Error:", e);
        toast.error("Network Error");
      });
    }
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';

    // Optimistic Update (Optional, but UI will flicker if we wait for fetch)
    // For now we rely on fetch/WS for source of truth to avoid complex local state management logic

    if (task.source === 'personal') {
      try {
        const res = await fetch(`${API_URL}/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          toast.success("Task updated");
          fetchPersonalTasks();
        } else {
          toast.error("Failed to update task");
        }
      } catch (e) { toast.error("Failed to update task"); }
    } else {
      // Room Task
      try {
        const res = await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) toast.error("Failed to update room task");
        // WS will handle the rest
      } catch (e) { toast.error("Failed to update room task"); }
    }
  };

  // Helper to log session
  const logSession = useCallback(async (duration) => {
    try {
      if (!currentRoom?.roomId) return;
      await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/log_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ duration: Math.floor(duration) })
      });
      toast.success("Focus Session Logged & Heatmap Updated!");
    } catch (e) { console.error("Logging failed", e); }
  }, [API_URL, token, currentRoom?.roomId]);

  // Timer Actions (Admin)
  const controlTimer = useCallback(async (action, duration = 25) => {
    try {
      if (!currentRoom?.roomId) return;
      await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/timer?action=${action}&duration=${duration}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) { toast.error("Action failed"); }
  }, [API_URL, token, currentRoom?.roomId]);

  // Timer Tick
  useEffect(() => {
    let interval;
    if (timerStatus === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished
            if (currentRoom?.status === 'admin') {
              // Auto-log the session duration (curr duration in room settings)
              // Use existing duration from room data or fallback
              const duration = currentRoom.timerDuration || 25;
              logSession(duration);
              // Reset/Stop timer on backend
              controlTimer('reset');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus, timeLeft, currentRoom?.status, currentRoom?.timerDuration, logSession, controlTimer]);




  const createRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName,
          password: roomPassword,
          description: roomDescription
        }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        const roomWithStatus = { ...newRoom, status: 'admin' };
        setCurrentRoom(roomWithStatus);
        setDialogOpen(false);
        toast.success("Room created!");
        fetchRooms();
      } else {
        toast.error("Failed to create room");
      }
    } catch (error) { toast.error('Error creating room'); }
  };

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    if (!selectedRoomToJoin) return;
    try {
      const response = await fetch(`${API_URL}/api/rooms/${selectedRoomToJoin.roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: joinPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.status === 'member') {
          fetchRoomDetails(selectedRoomToJoin.roomId);
          setJoinDialogOpen(false);
        } else {
          toast.success("Request sent! Entering Lobby...");
          setCurrentRoom({ ...selectedRoomToJoin, status: 'pending' });
          setJoinDialogOpen(false);
        }
      } else {
        toast.error(data.detail || "Error joining");
      }
    } catch (error) { toast.error("Failed to join"); }
  };

  const approveMember = async (userId) => {
    if (!currentRoom) return;
    await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/approve?member_id=${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success("Approved!");
    fetchRoomDetails(currentRoom.roomId);
  };

  const sendMessageHandler = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendMessage({
      type: 'chat_message',
      id: Date.now().toString(),
      userId: user.id || user._id,
      userName: user.name,
      content: chatMessage,
    });
    setChatMessage('');
  };


  // --- VIEWS ---

  if (currentRoom) {
    // ... existing view code ...
  }

  // ... (Update Task UI below) ...

  // --- VIEWS ---

  if (currentRoom) {
    const isOwner = currentRoom.status === 'admin';
    const isPending = currentRoom.status === 'pending';

    // Timezone safe parsing: backend sends ISO w/o Z usually if naive, so we assume UTC
    const parseTime = (webTime) => {
      if (!webTime) return null;
      if (webTime.endsWith('Z')) return new Date(webTime);
      return new Date(webTime + 'Z');
    };

    const expiry = parseTime(currentRoom.expiresAt);
    const now = new Date();
    // Calculate hours left (UTC comparison)
    const hoursLeft = expiry ? Math.max(0, Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))) : 24;

    if (isPending) {
      // LOBBY VIEW
      return (
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Waiting for Approval</CardTitle>
              <CardDescription>
                You have requested to join <strong>{currentRoom.name}</strong>.
                <br />The owner must approve your request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setCurrentRoom(null)}>Cancel Request</Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    // ACTIVE ROOM VIEW - NEW FLEX LAYOUT
    return (
      <div className="h-[calc(100vh-6rem)] flex overflow-hidden border rounded-xl bg-background shadow-sm relative">

        {/* LEFT SIDEBAR: Requests & Tasks */}
        <div className={`flex flex-col border-r bg-card transition-all duration-300 ease-in-out relative ${isLeftOpen ? 'w-80' : 'w-0 opacity-0'} shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b h-14 shrink-0 overflow-hidden">
            <h3 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Room Tasks</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsLeftOpen(false)}><ChevronLeft className="w-4 h-4" /></Button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 min-w-[20rem]">
            {/* Admin Requests Panel */}
            {isOwner && currentRoom.pendingRequests?.length > 0 && (
              <Card className="shrink-0 bg-secondary/10 border-dashed border-orange-200">
                <CardHeader className="py-2 px-3"><CardTitle className="text-xs font-bold text-orange-600 uppercase tracking-wider">Join Requests ({currentRoom.pendingRequests.length})</CardTitle></CardHeader>
                <CardContent className="p-2 space-y-2">
                  {currentRoom.pendingRequests.map(req => (
                    <div key={req.userId} className="flex flex-col gap-1.5 p-2 border rounded-md bg-background">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" /> <span className="text-xs font-medium truncate">{req.name}</span>
                      </div>
                      <Button size="sm" className="h-6 text-[10px] w-full" onClick={() => approveMember(req.userId)}>Approve</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tasks List */}
            <div className="space-y-3">
              <div className="space-y-2">
                {(() => {
                  const displayedTasks = [
                    ...(currentRoom.tasks || []).map(t => ({ ...t, source: 'room', label: 'Shared' })),
                    ...personalTasks.map(t => ({ ...t, source: 'personal', label: 'Personal', createdBy: 'You' }))
                  ];
                  if (displayedTasks.length === 0) return <div className="text-center py-8 text-muted-foreground/40 text-sm">No tasks yet</div>;

                  return displayedTasks.map((task, i) => (
                    <div key={task.id || i} className={`flex items-start gap-2 p-2 text-sm border rounded-lg group hover:bg-secondary/30 transition-colors ${task.source === 'personal' ? 'bg-blue-500/5 border-blue-200/20' : 'bg-card'}`}>
                      <button onClick={() => toggleTaskStatus(task)} className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground hover:border-primary'}`}>
                        {task.status === 'completed' && <CheckSquare className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <p className={`truncate font-medium text-xs leading-5 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                          {task.source === 'personal' && <Badge variant="outline" className="text-[8px] h-3 px-0.5 text-blue-400 border-blue-400/30">ME</Badge>}
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>

              {/* Add Task Form */}
              <form onSubmit={addTask} className="pt-2 flex flex-col gap-2 border-t mt-2">
                <div className="flex gap-4 text-xs px-1">
                  <label className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                    <input type="radio" name="taskType" value="shared" checked={newTaskType === 'shared'} onChange={() => setNewTaskType('shared')} className="accent-primary" />
                    Shared
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                    <input type="radio" name="taskType" value="personal" checked={newTaskType === 'personal'} onChange={() => setNewTaskType('personal')} className="accent-primary" />
                    Personal
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input placeholder={newTaskType === 'shared' ? "New room task..." : "New personal task..."} value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="h-8 text-xs bg-background" />
                  <Button type="submit" size="sm" className="h-8 w-8 p-0 shrink-0"><Plus className="w-4 h-4" /></Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* CENTER STAGE */}
        <div className="flex-1 flex flex-col relative min-w-0 bg-secondary/5">
          {/* Top Overlay Bar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <div className="pointer-events-auto">
              {!isLeftOpen && (
                <Button variant="outline" size="icon" className="shadow-sm bg-background/80 backdrop-blur" onClick={() => setIsLeftOpen(true)}>
                  <Sidebar className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Room Info Bubble */}
            <div className="bg-background/80 backdrop-blur border shadow-sm rounded-full px-4 py-1.5 flex flex-col items-center pointer-events-auto">
              <h2 className="font-bold text-sm flex items-center gap-2">
                {currentRoom.name}
                {currentRoom.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
              </h2>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Closes in {hoursLeft}h
              </span>
            </div>

            <div className="pointer-events-auto flex gap-2">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8" onClick={() => setCurrentRoom(null)}>Leave</Button>
              {!isRightOpen && (
                <Button variant="outline" size="icon" className="shadow-sm bg-background/80 backdrop-blur" onClick={() => setIsRightOpen(true)}>
                  <Sidebar className="w-4 h-4 scale-x-[-1]" />
                </Button>
              )}
            </div>
          </div>

          {/* Focus Timer Area */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center scale-110 md:scale-125 transition-transform duration-500">
              <div className={`text-[10rem] leading-none font-black font-mono tracking-tighter tabular-nums select-none drop-shadow-2xl transition-all duration-300 ${timerStatus === 'running' ? 'text-primary' : 'text-muted-foreground/30'}`}>
                {formatTime(timeLeft)}
              </div>

              <div className="h-24 mt-8 flex items-center justify-center">
                {isOwner ? (
                  <div className="flex flex-col gap-4 items-center w-64">
                    <div className="grid grid-cols-2 gap-3 w-full">
                      {timerStatus === 'running' ? (
                        <Button size="lg" onClick={() => controlTimer('pause')} className="w-full col-span-2 shadow-lg bg-orange-500 hover:bg-orange-600 border-none h-12 rounded-full text-lg transition-all hover:scale-105">
                          <Pause className="w-5 h-5 mr-2 fill-current" /> Pause
                        </Button>
                      ) : (
                        <Button size="lg" onClick={() => controlTimer('start', 25)} className="w-full col-span-2 shadow-xl shadow-primary/20 h-12 rounded-full text-lg transition-all hover:scale-105">
                          <Play className="w-5 h-5 mr-2 fill-current" /> Start Focus
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 w-full justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" className="rounded-full w-8 h-8" onClick={() => controlTimer('reset')} title="Reset"><RotateCcw className="w-3 h-3" /></Button>
                      {[15, 25, 45, 60].map(m => (
                        <Button key={m} variant="ghost" size="sm" onClick={() => controlTimer('start', m)} className={`text-xs rounded-full h-8 w-8 p-0 ${timeLeft === m * 60 ? "bg-primary/20 text-primary font-bold" : ""}`}>
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Badge variant="outline" className="px-3 py-1 text-sm rounded-full border-primary/20 text-primary mb-2">
                      {timerStatus === 'running' ? 'FOCUS SESSION ACTIVE' : 'SESSION PAUSED'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Syncing with workspace...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Participants & Chat */}
        <div className={`flex flex-col border-l bg-card transition-all duration-300 ease-in-out relative ${isRightOpen ? 'w-80' : 'w-0 opacity-0'} shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b h-14 shrink-0 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsRightOpen(false)}><ChevronRight className="w-4 h-4" /></Button>
            <h3 className="font-semibold flex items-center gap-2">Community <Users className="w-4 h-4" /></h3>
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-[20rem]">
            {/* Top Half: Participants */}
            <div className="h-1/3 border-b flex flex-col">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">Active Members ({currentRoom.members?.length})</div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {currentRoom.members?.map(m => (
                    <div key={m.userId} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 text-sm group">
                      <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center text-primary font-bold text-xs relative">
                        {m.name.charAt(0)}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{m.name}</span>
                          {currentRoom.ownerId === m.userId && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Bottom Half: Chat */}
            <div className="flex-1 flex flex-col min-h-0 bg-secondary/5">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Room Chat</div>

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {[...(currentRoom.chatHistory || []), ...messages.filter(m => m.type === 'chat_message').filter(m => !currentRoom.chatHistory?.find(c => c.id === m.id))].map(msg => {
                  const isMe = msg.userId === (user.id || user._id);
                  return (
                    <div key={msg.id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-white border shadow-sm rounded-bl-none'}`}>
                        {!isMe && <p className="text-[9px] font-bold opacity-70 mb-0.5 text-primary">{msg.userName}</p>}
                        <p className="leading-snug">{msg.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 bg-card border-t">
                <form onSubmit={sendMessageHandler} className="flex gap-2 relative">
                  <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="h-9 text-sm pr-8" />
                  <Button type="submit" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0 rounded-full"><Send className="w-3 h-3" /></Button>
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ROOM LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Focus Rooms</h1>
          <p className="text-muted-foreground">Join sessions. Rooms expire after 24 hours.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary-hover">
          <Plus className="w-4 h-4 mr-2" /> Create Room
        </Button>
      </div>

      <div className="relative">
        <Input className="pl-4" placeholder="Search rooms..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map(room => {
          const myStatus = getMyStatus(room);
          const expiry = new Date(room.expiresAt);
          const isExpired = new Date() > expiry;
          if (isExpired) return null; // Don't show expired rooms

          return (
            <Card key={room.roomId} className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate">{room.name}</span>
                  {room.isPrivate && <Lock className="w-4 h-4 text-muted-foreground" />}
                </CardTitle>
                <CardDescription className="line-clamp-2 h-10">{room.description || "No description."}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                      {room.members?.length || 0}
                    </div>
                  </div>
                  {myStatus === 'admin' || myStatus === 'member' ? (
                    <Button onClick={() => {
                      setCurrentRoom({ ...room, status: myStatus });
                      fetchRoomDetails(room.roomId);
                    }}>Enter Room</Button>
                  ) : myStatus === 'pending' ? (
                    <Button variant="secondary" onClick={() => {
                      setCurrentRoom({ ...room, status: 'pending' });
                    }}>View Lobby</Button>
                  ) : (
                    <Button variant="outline" onClick={() => {
                      setSelectedRoomToJoin(room);
                      setJoinDialogOpen(true);
                    }}>Join</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DIALOGS - CREATE & JOIN (Same as before but simplified) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Room</DialogTitle></DialogHeader>
          <form onSubmit={createRoom} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={roomName} onChange={e => setRoomName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={roomDescription} onChange={e => setRoomDescription(e.target.value)} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Create (24h Limit)</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join Room</DialogTitle></DialogHeader>
          <form onSubmit={handleJoinRequest} className="space-y-4">
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Request Access</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper for formatting mm:ss
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
