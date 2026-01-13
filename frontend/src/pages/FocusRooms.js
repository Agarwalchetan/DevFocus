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
import { User, Lock, Plus, MessageSquare, CheckSquare, Clock, Users, Send, Play, Pause, RotateCcw, Crown, AlertOctagon, ChevronLeft, ChevronRight, Sidebar, Check, MoreVertical, Ban, Trash2, ShieldMinus } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);

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
      // Use specific GET endpoint for fresh details
      const res = await fetch(`${API_URL}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("Failed to fetch room");

      const found = await res.json();
      const myStatus = getMyStatus(found);

      // Log for debugging
      console.log("Fetched Room Details:", found);

      setCurrentRoom({ ...found, status: myStatus });

      // Initial Timer Sync - UTC SAFE
      if (found.timerStatus === 'running' && found.timerStartTime) {
        // Add Z if missing to force UTC parsing in new Date()
        const timeStr = found.timerStartTime.endsWith('Z') ? found.timerStartTime : found.timerStartTime + 'Z';
        const start = new Date(timeStr).getTime();
        // Force UTC now
        const now = new Date().getTime();
        const elapsedSecs = (now - start) / 1000;
        const durationSecs = (found.timerDuration || 25) * 60;
        const remaining = Math.max(0, durationSecs - elapsedSecs);
        setTimeLeft(remaining);
        setTimerStatus('running');
      } else {
        setTimeLeft((found.timerDuration || 25) * 60);
        setTimerStatus(found.timerStatus || 'stopped');
      }
    } catch (e) { console.error("Fetch Room Error", e); }
  }, [API_URL, token, getMyStatus]);

  // Fetch User & Rooms on Mount
  // Fetch User & Rooms on Mount
  // Fetch User & Rooms on Mount (Run ONCE)
  // Fetch User & Rooms on Mount
  useEffect(() => {
    fetchUser();
    fetchRooms();
    fetchPersonalTasks();
  }, [fetchUser, fetchRooms, fetchPersonalTasks]);

  // Auto-Join from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');
    if (rid) fetchRoomDetails(rid);
  }, [fetchRoomDetails]);

  // Sync Status when User loads
  useEffect(() => {
    if (currentRoom && (user.id || user._id)) {
      const newStatus = getMyStatus(currentRoom);
      if (newStatus !== currentRoom.status) {
        console.log("Updating Status:", newStatus);
        setCurrentRoom(prev => ({ ...prev, status: newStatus }));
      }
    }
  }, [user, currentRoom, getMyStatus]); // Added currentRoom as dependency

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
          // Check for Kick/Block affecting ME
          if ((msg.trigger === 'kick' && msg.kickedUserId === (user.id || user._id)) ||
            (msg.trigger === 'block' && msg.blockedUserId === (user.id || user._id))) {
            setCurrentRoom(null);
            toast.error("You have been removed from the room.");
            return;
          }

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

  // Timer Tick - Delta Logic
  useEffect(() => {
    let interval;
    if (timerStatus === 'running' && currentRoom?.timerStartTime) {
      // Calculate specific end time based on server start time + duration
      // Handle Z for UTC safety
      const startTimeStr = currentRoom.timerStartTime.endsWith('Z')
        ? currentRoom.timerStartTime
        : currentRoom.timerStartTime + 'Z';

      const startTime = new Date(startTimeStr).getTime();
      const durationMs = (currentRoom.timerDuration || 25) * 60 * 1000;
      const endTime = startTime + durationMs;

      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(diff / 1000));

        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          // Timer Finished
          if (currentRoom.status === 'admin') {
            const duration = currentRoom.timerDuration || 25;
            logSession(duration);
            controlTimer('reset');
          }
          setTimerStatus('stopped');
        }
      };

      // Run immediately then interval
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus, currentRoom?.timerStartTime, currentRoom?.timerDuration, currentRoom?.status, logSession, controlTimer]);




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
        window.history.pushState({}, '', '?room=' + newRoom.roomId);
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
          window.history.pushState({}, '', '?room=' + selectedRoomToJoin.roomId);
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

  const kickMember = async (userId) => {
    if (!currentRoom) return;
    try {
      await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/kick?member_id=${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Member kicked");
      fetchRoomDetails(currentRoom.roomId);
    } catch (e) { toast.error("Failed to kick member"); }
  };

  const blockMember = async (userId) => {
    if (!currentRoom) return;
    try {
      await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/block?member_id=${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Member blocked");
      fetchRoomDetails(currentRoom.roomId);
    } catch (e) { toast.error("Failed to block member"); }
  };

  const unblockMember = async (userId) => {
    if (!currentRoom) return;
    try {
      await fetch(`${API_URL}/api/rooms/${currentRoom.roomId}/unblock?member_id=${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Member unblocked");
      // Optimistically update or re-fetch
      fetchRoomDetails(currentRoom.roomId);
    } catch (e) { toast.error("Failed to unblock member"); }
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
      <div className="h-[calc(100vh-6rem)] flex overflow-hidden border rounded-xl bg-background shadow-2xl relative font-sans">

        {/* LEFT SIDEBAR: Requests & Tasks */}
        <AnimatePresence mode='wait'>
          {isLeftOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col border-r bg-card/95 backdrop-blur-sm z-20 shrink-0 h-full shadow-lg"
            >
              <div className="flex items-center justify-between p-4 border-b h-16 shrink-0 bg-muted/20">
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" /> TASKS</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background" onClick={() => setIsLeftOpen(false)}><ChevronLeft className="w-4 h-4" /></Button>
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

                {/* Tasks List */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {(() => {
                        const displayedTasks = [
                          ...(currentRoom.tasks || []).map(t => ({ ...t, source: 'room', label: 'Shared' })),
                          ...personalTasks.map(t => ({ ...t, source: 'personal', label: 'Personal', createdBy: 'You' }))
                        ];
                        if (displayedTasks.length === 0) return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-muted-foreground/40 text-sm italic">No active tasks</motion.div>;

                        return displayedTasks.map((task, i) => (
                          <motion.div
                            key={task.id || i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`flex items-start gap-3 p-3 text-sm border rounded-xl group hover:shadow-md transition-all duration-200 bg-card border-border hover:border-primary/30`}
                          >
                            <button onClick={() => toggleTaskStatus(task)} className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${task.status === 'completed' ? 'bg-primary border-primary text-primary-foreground scale-105' : 'border-muted-foreground/30 hover:border-primary'}`}>
                              {task.status === 'completed' && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className={`truncate font-medium text-sm leading-tight transition-all ${task.status === 'completed' ? 'line-through text-muted-foreground decoration-border' : 'text-foreground'}`}>{task.title}</p>
                                {task.source === 'personal' && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary/10 text-primary border-primary/20">ME</Badge>}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      })()}
                    </AnimatePresence>
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
            </motion.div>

          )}
        </AnimatePresence>

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
              <Button variant="destructive" size="sm" className="h-8 shadow-sm opacity-90 hover:opacity-100" onClick={() => { setCurrentRoom(null); window.history.pushState({}, '', '/'); }}>Leave Room</Button>
              {!isRightOpen && (
                <Button variant="outline" size="icon" className="shadow-sm bg-background/80 backdrop-blur" onClick={() => setIsRightOpen(true)}>
                  <Sidebar className="w-4 h-4 scale-x-[-1]" />
                </Button>
              )}
            </div>
          </div>

          {/* Focus Timer Area */}
          {/* Focus Timer Area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {timerStatus === 'running' && (
              <motion.div
                animate={{ scale: [1, 1.02, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute inset-0 bg-primary/5 rounded-full blur-3xl pointer-events-none"
              />
            )}

            <motion.div
              layout
              className="flex flex-col items-center z-10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className={`text-[12rem] md:text-[14rem] leading-none font-bold tracking-tighter tabular-nums select-none drop-shadow-xl transition-all duration-500 font-mono ${timerStatus === 'running' ? 'text-foreground' : 'text-muted-foreground/20'}`}>
                {formatTime(timeLeft)}
              </div>

              <div className="h-32 mt-8 flex items-center justify-center w-full">
                {isOwner ? (
                  <div className="flex flex-col gap-6 items-center w-72">
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {timerStatus === 'running' ? (
                        <Button size="lg" onClick={() => controlTimer('pause')} className="w-full col-span-2 shadow-2xl bg-orange-500 hover:bg-orange-600 border-none h-14 rounded-2xl text-xl font-medium transition-all hover:scale-[1.02] active:scale-95">
                          <Pause className="w-6 h-6 mr-2 fill-current" /> Pause
                        </Button>
                      ) : (
                        <Button size="lg" onClick={() => controlTimer('start', 25)} className="w-full col-span-2 shadow-2xl shadow-primary/20 h-14 rounded-2xl text-xl font-medium transition-all hover:scale-[1.02] active:scale-95">
                          <Play className="w-6 h-6 mr-2 fill-current" /> Start Focus
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-3 w-full justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300">
                      <Button variant="outline" size="icon" className="rounded-full w-10 h-10 hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => controlTimer('reset')} title="Reset"><RotateCcw className="w-4 h-4" /></Button>
                      {[15, 25, 45, 60].map(m => (
                        <Button key={m} variant="ghost" size="sm" onClick={() => controlTimer('start', m)} className={`text-xs rounded-full h-10 w-10 p-0 font-medium ${timeLeft === m * 60 ? "bg-primary text-primary-foreground shadow-lg scale-110" : "hover:bg-secondary"}`}>
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <Badge variant="outline" className={`px-4 py-1.5 text-sm rounded-full backdrop-blur-md border shadow-sm ${timerStatus === 'running' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/50 text-muted-foreground'}`}>
                      {timerStatus === 'running' ? 'FOCUS IN PROGRESS' : 'SESSION PAUSED'}
                    </Badge>
                    <p className="text-xs text-muted-foreground animate-pulse">Syncing with room state...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Participants & Chat */}
        <AnimatePresence mode='wait'>
          {isRightOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col border-l bg-card/95 backdrop-blur-sm z-20 shrink-0 h-full shadow-lg"
            >
              <div className="flex items-center justify-between p-4 border-b h-16 shrink-0 bg-muted/20">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background" onClick={() => setIsRightOpen(false)}><ChevronRight className="w-4 h-4" /></Button>
                <div className="flex items-center gap-2">
                  {/* DEBUG LOG: */}
                  {console.log("Room Owner:", currentRoom.ownerId, "Me:", (user.id || user._id), "BlockList:", currentRoom.blockedUsers)}

                  {currentRoom.ownerId === (user.id || user._id) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={() => setBlockedDialogOpen(true)} title="Manage Blocked Users">
                      <ShieldMinus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">COMMUNITY <Users className="w-4 h-4 text-primary" /></h3>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 min-w-[20rem]">
                {/* Top Half: Participants */}
                <div className="h-1/3 border-b flex flex-col">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">Active Members ({currentRoom.members?.length})</div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {currentRoom.members?.map(m => {
                        const isMe = m.userId === (user.id || user._id);
                        const isRoomOwner = currentRoom.ownerId === m.userId;
                        return (
                          <div key={m.userId} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 text-sm group">
                            <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center text-primary font-bold text-xs relative shrink-0">
                              {m.name.charAt(0)}
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background bg-green-500 rounded-full"></div>
                            </div>
                            <div className="flex-1 overflow-hidden min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{m.name} {isMe && "(You)"}</span>
                                {isRoomOwner ? (
                                  <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                                ) : isOwner && !isMe ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-3 h-3" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => kickMember(m.userId)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Kick</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => blockMember(m.userId)} className="text-destructive focus:text-destructive"><Ban className="w-4 h-4 mr-2" /> Block</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
                          <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${isMe ? 'bg-primary text-primary-foreground rounded-br-none shadow-md' : 'bg-muted/80 backdrop-blur-sm border shadow-sm rounded-bl-none text-foreground'}`}>
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
            </motion.div>
          )}
        </AnimatePresence>

      </div >
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
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs border-2 border-background">
                        {room.members?.length || 0}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">/ 5</span>
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
                    <Button
                      variant={(room.members?.length || 0) >= 5 ? "secondary" : "outline"}
                      disabled={(room.members?.length || 0) >= 5}
                      onClick={() => {
                        setSelectedRoomToJoin(room);
                        setJoinDialogOpen(true);
                      }}
                    >
                      {(room.members?.length || 0) >= 5 ? "Full" : "Join"}
                    </Button>
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


      {/* Blocked Users Dialog */}
      <Dialog open={blockedDialogOpen} onOpenChange={setBlockedDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Blocked Users</DialogTitle>
            <DialogDescription>Users blocked from <strong>{currentRoom?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentRoom?.blockedUsers?.length > 0 ? (
              <div className="space-y-2">
                {currentRoom.blockedUsers.map(uid => (
                  <div key={uid} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-mono">{uid.substring(0, 8)}...</span>
                    <Button size="sm" variant="outline" onClick={() => unblockMember(uid)}>Unblock</Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center">No blocked users.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

// Helper for formatting mm:ss
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
