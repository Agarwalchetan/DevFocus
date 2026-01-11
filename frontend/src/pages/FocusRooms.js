import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useCustomHooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Users, Plus, Radio, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

export const FocusRooms = () => {
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [focusTask, setFocusTask] = useState('');
  const [timerDuration, setTimerDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(0);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  const { isConnected, messages, sendMessage } = useWebSocket(
    currentRoom?.roomId,
    token
  );

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'user_joined' || lastMessage.type === 'user_left') {
        fetchRooms();
      }
    }
  }, [messages]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

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
          isPrivate: false,
        }),
      });

      if (response.ok) {
        const newRoom = await response.json();
        await fetchRooms();
        joinRoom(newRoom);
        setDialogOpen(false);
        setRoomName('');
      }
    } catch (error) {
      toast.error('Failed to create room');
    }
  };

  const joinRoom = (room) => {
    setCurrentRoom(room);
    setTimeLeft(timerDuration * 60);

    sendMessage({
      type: 'user_joined',
      userId: user.id,
      userName: user.name,
      task: focusTask || 'Silent focus',
      timestamp: new Date().toISOString(),
    });

    toast.success(`Joined ${room.name}`);
  };

  const leaveRoom = () => {
    if (currentRoom) {
      sendMessage({
        type: 'user_left',
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      });
    }
    setCurrentRoom(null);
    setTimeLeft(0);
    toast('Left the room');
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.success('Focus session complete!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <CardTitle className="text-2xl">{currentRoom.name}</CardTitle>
                <Badge variant="outline" className="bg-success-subtle text-success">
                  <Users className="w-3 h-3 mr-1" />
                  {messages.filter((m) => m.type === 'user_joined').length} focusing
                </Badge>
              </div>
              <Button variant="outline" onClick={leaveRoom} className="border-destructive text-destructive">
                Leave Room
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center p-8 bg-secondary/30 rounded-lg">
              <Radio className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Silent Focus Mode</h3>
              <p className="text-muted-foreground mb-4">
                Everyone is working quietly. No chat during focus time.
              </p>
              {focusTask && (
                <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">You're working on:</p>
                  <p className="font-semibold text-foreground">{focusTask}</p>
                </div>
              )}
            </div>

            {timeLeft > 0 && (
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {formatTime(timeLeft)}
                </div>
                <Progress
                  value={((timerDuration * 60 - timeLeft) / (timerDuration * 60)) * 100}
                  className="h-2"
                />
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Participants
              </h4>
              <div className="grid gap-2">
                {messages
                  .filter((m) => m.type === 'user_joined')
                  .map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{msg.userName}</p>
                        <p className="text-sm text-muted-foreground">{msg.task}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-success" />
                    </div>
                  ))}
              </div>
            </div>

            {timeLeft === 0 && (
              <div className="space-y-2">
                <Label>Set Timer Duration</Label>
                <div className="flex gap-2">
                  {[25, 45, 60, 90].map((min) => (
                    <Button
                      key={min}
                      variant={timerDuration === min ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimerDuration(min)}
                      className={
                        timerDuration === min
                          ? 'bg-primary hover:bg-primary-hover'
                          : 'border-border'
                      }
                    >
                      {min}m
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={startTimer}
                  className="w-full bg-primary hover:bg-primary-hover mt-4"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Start Focus Timer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Build Together</h1>
          <p className="text-muted-foreground">
            Join silent focus rooms and stay accountable
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Focus Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={createRoom} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="Morning Focus Session"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  className="bg-secondary/50 border-border"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">
                Create Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What are you working on? (Optional)</Label>
              <Input
                placeholder="Building a new feature..."
                value={focusTask}
                onChange={(e) => setFocusTask(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Focus Duration</Label>
              <div className="flex gap-2">
                {[25, 45, 60, 90].map((min) => (
                  <Button
                    key={min}
                    variant={timerDuration === min ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimerDuration(min)}
                    className={
                      timerDuration === min
                        ? 'bg-primary hover:bg-primary-hover'
                        : 'border-border'
                    }
                  >
                    {min}m
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.length === 0 ? (
          <Card className="col-span-full border-border">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No active rooms</h3>
              <p className="text-muted-foreground mb-4">
                Create the first room and start focusing together
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary-hover">
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => (
            <Card
              key={room.roomId}
              className="border-border bg-card hover:border-primary/30 transition-all"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="w-5 h-5 text-accent" />
                  {room.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{room.activeUsers?.length || 0} focusing</span>
                </div>
                <Button
                  onClick={() => joinRoom(room)}
                  className="w-full bg-primary hover:bg-primary-hover"
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const Progress = ({ value, className }) => {
  return (
    <div className={`w-full bg-secondary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};
