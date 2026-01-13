import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Play, Check, Trash2, Clock, Code2, Filter, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Tasks = ({ onStartFocus }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('all'); // 'daily', 'future', 'all'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTypeDialogOpen, setAddTypeDialogOpen] = useState(false);
  const [taskTypes, setTaskTypes] = useState(['Study', 'Coding', 'Debugging', 'Planning']); // Dynamic
  const [newTypeName, setNewTypeName] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const [newTask, setNewTask] = useState({
    title: '',
    type: 'Coding',
    techTags: '',
    estimatedTime: 60,
    scheduledDate: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchTaskTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filter, activeSection]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/task-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTaskTypes(data);
    } catch (error) {
      console.error('Failed to load task types');
    }
  };

  const createTaskType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/task-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: newTypeName.trim() }),
      });

      if (response.ok) {
        await fetchTaskTypes();
        setAddTypeDialogOpen(false);
        setNewTypeName('');
        toast.success('Task type added!');
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to add task type');
      }
    } catch (error) {
      toast.error('Failed to add task type');
    }
  };

  const applyFilter = () => {
    let filtered = tasks;

    // Apply status/type filter
    if (filter === 'active') {
      filtered = tasks.filter((t) => t.status !== 'completed');
    } else if (filter === 'completed') {
      filtered = tasks.filter((t) => t.status === 'completed');
    } else if (filter !== 'all') {
      filtered = tasks.filter((t) => t.type === filter);
    }

    // Apply section filter
    // Use local date string comparison to avoid timezone issues
    const d = new Date();
    const todayStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    if (activeSection === 'daily') {
      // Daily: today + overdue tasks (dates <= today)
      filtered = filtered.filter(task => {
        if (!task.scheduledDate) return false;
        return task.scheduledDate <= todayStr;
      });
    } else if (activeSection === 'future') {
      // Future: tasks scheduled for future dates (dates > today)
      filtered = filtered.filter(task => {
        if (!task.scheduledDate) return false;
        return task.scheduledDate > todayStr;
      });
    }

    setFilteredTasks(filtered);
  };

  // Helper functions for task categorization
  const getTaskCounts = () => {
    const d = new Date();
    const todayStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    const dailyCount = tasks.filter(task => {
      if (!task.scheduledDate) return false;
      return task.scheduledDate <= todayStr;
    }).length;

    const futureCount = tasks.filter(task => {
      if (!task.scheduledDate) return false;
      return task.scheduledDate > todayStr;
    }).length;

    return { daily: dailyCount, future: futureCount, all: tasks.length };
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return null;

    const d = new Date();
    const todayStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    if (dateString < todayStr) return 'Overdue';
    if (dateString === todayStr) return 'Today';

    // Calculate days diff for future
    const date = new Date(dateString);
    const today = new Date(todayStr);
    const diffTime = Math.abs(date - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return new Date(dateString).toLocaleDateString();
  };

  const getDateBadgeColor = (dateString) => {
    if (!dateString) return '';
    const d = new Date();
    const todayStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    if (dateString < todayStr) return 'border-destructive text-destructive bg-destructive-subtle'; // Overdue
    if (dateString === todayStr) return 'border-primary text-primary bg-primary-subtle'; // Today
    return 'border-secondary text-secondary-foreground bg-secondary'; // Future
  };

  const taskCounts = getTaskCounts();

  const createTask = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTask,
          techTags: newTask.techTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (response.ok) {
        await fetchTasks();
        setDialogOpen(false);
        setNewTask({ title: '', type: 'Coding', techTags: '', estimatedTime: 60, scheduledDate: '' });
        toast.success('Task created successfully');
      }
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchTasks();
        toast.success('Task updated');
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchTasks();
        toast.success('Task deleted');
      }
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const typeColors = {
    Study: 'bg-accent-subtle text-accent border-accent/30',
    Coding: 'bg-primary-subtle text-primary border-primary/30',
    Debugging: 'bg-destructive-subtle text-destructive border-destructive/30',
    Planning: 'bg-violet-subtle text-violet border-violet/30',
  };

  const getTypeColor = (type) => typeColors[type] || 'bg-secondary text-foreground border-border';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage your developer tasks</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveSection('daily')}
          variant={activeSection === 'daily' ? 'default' : 'outline'}
          size="sm"
        >
          Daily ({taskCounts.daily})
        </Button>
        <Button
          onClick={() => setActiveSection('future')}
          variant={activeSection === 'future' ? 'default' : 'outline'}
          size="sm"
        >
          Future ({taskCounts.future})
        </Button>
        <Button
          onClick={() => setActiveSection('all')}
          variant={activeSection === 'all' ? 'default' : 'outline'}
          size="sm"
        >
          All ({taskCounts.all})
        </Button>
      </div>

      <div className="flex justify-end mb-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={createTask} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="Build authentication system"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Task Type</Label>
                <Select
                  value={newTask.type}
                  onValueChange={(value) => setNewTask({ ...newTask, type: value })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setAddTypeDialogOpen(true)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-secondary rounded-sm transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Custom Type
                      </button>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Type Dialog */}
              <Dialog open={addTypeDialogOpen} onOpenChange={setAddTypeDialogOpen}>
                <DialogContent className="bg-card border-border max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Custom Task Type</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createTaskType} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="typeName">Type Name</Label>
                      <Input
                        id="typeName"
                        placeholder="e.g., Testing, Design, Research"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        required
                        className="bg-secondary/50 border-border"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">Add Type</Button>
                      <Button type="button" variant="outline" onClick={() => setAddTypeDialogOpen(false)}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-2">
                <Label htmlFor="tags">Tech Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="React, Node.js, MongoDB"
                  value={newTask.techTags}
                  onChange={(e) => setNewTask({ ...newTask, techTags: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Estimated Time (minutes)</Label>
                <Input
                  id="time"
                  type="number"
                  min="15"
                  step="15"
                  value={newTask.estimatedTime}
                  onChange={(e) =>
                    setNewTask({ ...newTask, estimatedTime: parseInt(e.target.value) })
                  }
                  className="bg-secondary/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={newTask.scheduledDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, scheduledDate: e.target.value })
                  }
                  className="bg-secondary/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unscheduled tasks
                </p>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'completed', ...taskTypes].map(
            (f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? 'bg-primary hover:bg-primary-hover'
                    : 'border-border hover:border-primary'
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card className="border-border">
            <CardContent className="text-center py-12">
              <Code2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                Create a task to start tracking your focus time
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary-hover">
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              className="border-border bg-card hover:border-primary/30 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-foreground">{task.title}</h3>
                      <Badge
                        variant="outline"
                        className={typeColors[task.type] || typeColors.Coding}
                      >
                        {task.type}
                      </Badge>
                      {task.scheduledDate && (
                        <Badge
                          variant="outline"
                          className={getDateBadgeColor(task.scheduledDate)}
                        >
                          {formatRelativeDate(task.scheduledDate)}
                        </Badge>
                      )}
                      {task.status === 'completed' && (
                        <Badge variant="outline" className="bg-success-subtle text-success border-success/30">
                          <Check className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>

                    {task.techTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {task.techTags.map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs bg-secondary text-muted-foreground"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {task.totalFocusedTime}m / {task.estimatedTime}m
                        </span>
                      </div>
                      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min((task.totalFocusedTime / task.estimatedTime) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status !== 'completed' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onStartFocus(task)}
                          className="bg-primary hover:bg-primary-hover"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Focus
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="border-success text-success hover:bg-success/10"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTask(task.id)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div >
  );
};
