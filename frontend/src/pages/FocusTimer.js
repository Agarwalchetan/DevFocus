import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimer, useNotification } from '../hooks/useCustomHooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Play, Pause, RotateCcw, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const FocusTimer = ({ initialTask, onComplete }) => {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const [selectedTask, setSelectedTask] = useState(initialTask);
  const [tasks, setTasks] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [audioPlayed, setAudioPlayed] = useState(false);

  const SESSION_STORAGE_KEY = 'focusSession';

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const handleComplete = async () => {
    if (!audioPlayed) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSubz/LLdSgFI3DC8NyOPwkSXLPn6qNUEwlBnemyt2EaBS2ezPLMezApBS6C0fPblywHG2U=');
      audio.play().catch(() => { });
      setAudioPlayed(true);
    }

    showNotification('Focus Session Complete! 🎉', {
      body: `Great job! You've completed ${duration} minutes of focused work.`,
    });

    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/focus-sessions/${sessionId}/complete`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Session completed! Time has been added to your task.');
        onComplete?.();
      } catch (error) {
        toast.error('Failed to save session');
      }
    }
  };

  const timer = useTimer(duration, handleComplete);

  useEffect(() => {
    fetchTasks();
    restoreSessionState();
  }, []);

  useEffect(() => {
    if (initialTask) {
      setSelectedTask(initialTask);
    }
  }, [initialTask]);

  useEffect(() => {
    if (sessionId || selectedTask || duration !== 25) {
      saveSessionState();
    }
  }, [sessionId, selectedTask, duration]);

  const restoreSessionState = () => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const { sessionId: savedSessionId, selectedTask: savedTask, duration: savedDuration } = JSON.parse(saved);
        if (savedSessionId) setSessionId(savedSessionId);
        if (savedTask) setSelectedTask(savedTask);
        if (savedDuration) setDuration(savedDuration);
      }
    } catch (error) {
      console.error('Failed to restore session state:', error);
    }
  };

  const saveSessionState = () => {
    const state = {
      sessionId,
      selectedTask,
      duration
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTasks(data.filter((t) => t.status !== 'completed'));
    } catch (error) {
      console.error('Failed to load tasks');
    }
  };

  const startSession = async () => {
    if (!selectedTask) {
      toast.error('Please select a task first');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/focus-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          duration: duration,
        }),
      });

      const session = await response.json();
      setSessionId(session.id);
      setAudioPlayed(false);
      saveSessionState();
      timer.start();
      toast.success('Focus session started!');
    } catch (error) {
      toast.error('Failed to start session');
    }
  };

  const handlePause = () => {
    timer.pause();
    toast('Session paused');
  };

  const handleReset = () => {
    timer.reset(duration);
    setSessionId(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    toast('Timer reset');
  };

  const handleCustomDurationChange = (value) => {
    const num = parseInt(value);
    if (value === '' || (num >= 1 && num <= 180)) {
      setCustomDuration(value);
      if (num >= 1 && num <= 180) {
        setDuration(num);
        timer.reset(num);
      }
    }
  };

  const typeColors = {
    Study: 'bg-accent-subtle text-accent border-accent/30',
    Coding: 'bg-primary-subtle text-primary border-primary/30',
    Debugging: 'bg-destructive-subtle text-destructive border-destructive/30',
    Planning: 'bg-violet-subtle text-violet border-violet/30',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-border bg-card">
          <CardContent className="p-8 md:p-12">
            <div className="text-center space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Focus Session</h1>
                <p className="text-muted-foreground">Stay focused, minimize distractions</p>
              </div>

              {!timer.isRunning && sessionId === null && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Select Task</label>
                    <Select
                      value={selectedTask?.id}
                      onValueChange={(id) => {
                        const task = tasks.find((t) => t.id === id);
                        setSelectedTask(task);
                      }}
                    >
                      <SelectTrigger className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Choose a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Duration</label>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {[25, 45, 60, 90].map((min) => (
                        <Button
                          key={min}
                          variant={duration === min && !customDuration ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setDuration(min);
                            setCustomDuration('');
                            timer.reset(min);
                          }}
                          className={
                            duration === min && !customDuration
                              ? 'bg-primary hover:bg-primary-hover'
                              : 'border-border'
                          }
                        >
                          {min}m
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Input
                        type="number"
                        min="1"
                        max="180"
                        placeholder="Custom (1-180)"
                        value={customDuration}
                        onChange={(e) => handleCustomDurationChange(e.target.value)}
                        className="w-32 text-center bg-secondary/50 border-border"
                      />
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedTask && (
                <div className="flex items-center justify-center gap-3">
                  <Badge
                    variant="outline"
                    className={typeColors[selectedTask.type] || typeColors.Coding}
                  >
                    {selectedTask.type}
                  </Badge>
                  <h2 className="text-xl font-semibold">{selectedTask.title}</h2>
                </div>
              )}

              <div className="relative">
                <div className="w-64 h-64 mx-auto relative">
                  <svg className="transform -rotate-90 w-64 h-64">
                    <circle
                      cx="128"
                      cy="128"
                      r="120"
                      stroke="hsl(var(--secondary))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="128"
                      cy="128"
                      r="120"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 120}`}
                      strokeDashoffset={`${2 * Math.PI * 120 * (1 - timer.progress / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-foreground mb-2">
                        {timer.formatTime()}
                      </div>
                      {timer.isRunning && (
                        <div className="text-sm text-muted-foreground">Stay focused</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                {!timer.isRunning && sessionId === null ? (
                  <Button
                    size="lg"
                    onClick={startSession}
                    disabled={!selectedTask}
                    className="bg-primary hover:bg-primary-hover px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Focus
                  </Button>
                ) : (
                  <>
                    {timer.isRunning ? (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handlePause}
                        className="border-border"
                      >
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={timer.start}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button size="lg" variant="outline" onClick={handleReset} className="border-border">
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Reset
                    </Button>
                  </>
                )}
              </div>

              {timer.timeLeft === 0 && sessionId && (
                <div className="p-6 bg-success/10 border border-success/30 rounded-lg">
                  <Check className="w-12 h-12 text-success mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-success mb-2">Session Complete!</h3>
                  <p className="text-muted-foreground">
                    Great work! You've completed {duration} minutes of focused time.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
