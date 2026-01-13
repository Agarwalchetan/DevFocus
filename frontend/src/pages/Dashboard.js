import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Flame, Clock, Target, TrendingUp, Play, ListTodo } from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard = ({ onNavigate, onStartFocus }) => {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [burnoutChecked, setBurnoutChecked] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const checkBurnout = useCallback(async () => {
    if (burnoutChecked) return;

    try {
      const response = await fetch(`${API_URL}/api/insights/burnout`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.burnout && data.burnout.detected) {
          const severity = data.burnout.level;
          const message = data.burnout.description;

          if (severity === 'high') {
            toast.error(message, { duration: 10000 });
          } else if (severity === 'medium') {
            toast.warning(message, { duration: 8000 });
          } else {
            toast.info(message, { duration: 6000 });
          }
        }
        setBurnoutChecked(true);
      }
    } catch (error) {
      console.error('Failed to check burnout:', error);
    }
  }, [API_URL, token, burnoutChecked]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tasksRes, heatmapRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/heatmap`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const tasksData = await tasksRes.json();
      const heatmapData = await heatmapRes.json();

      const activeTasks = tasksData.filter((t) => t.status !== 'completed');
      setTasks(activeTasks.slice(0, 5));

      const today = new Date().toISOString().split('T')[0];
      const todayData = heatmapData.find((h) => h.date === today);
      const todayMinutes = todayData?.totalMinutes || 0;

      const last7Days = heatmapData.slice(0, 7);
      const weekTotal = last7Days.reduce((sum, day) => sum + day.totalMinutes, 0);

      const techTags = tasksData.flatMap((t) => t.techTags);
      const techCount = techTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});
      const mostUsedTech = Object.entries(techCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      setStats({
        todayMinutes,
        weekTotal,
        mostUsedTech,
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchDashboardData();
    checkBurnout();
  }, [fetchDashboardData, checkBurnout]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="dashboard-welcome">
            Welcome back, {user?.name}
          </h1>
          <p className="text-muted-foreground">
            Let's build something amazing today
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50 backdrop-blur" data-testid="streak-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Streak
            </CardTitle>
            <Flame className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {user?.streakCount || 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep the momentum going!
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur" data-testid="today-focus-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Focus
            </CardTitle>
            <Clock className="w-5 h-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.todayMinutes || 0}m
            </div>
            <Progress
              value={Math.min((stats?.todayMinutes / 240) * 100, 100)}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur" data-testid="week-focus-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-violet" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {Math.floor((stats?.weekTotal || 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.weekTotal || 0} minutes total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur" data-testid="top-tech-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Tech
            </CardTitle>
            <Target className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.mostUsedTech || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most worked on this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Active Tasks</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('tasks')}
                className="text-primary hover:text-primary-hover"
              >
                <ListTodo className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active tasks. Create one to get started!</p>
                <Button
                  onClick={() => onNavigate('tasks')}
                  className="mt-4 bg-primary hover:bg-primary-hover"
                >
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{task.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary-subtle text-primary border-primary/30"
                        >
                          {task.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.totalFocusedTime}m / {task.estimatedTime}m
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onStartFocus(task)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary hover:bg-primary-hover"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => onNavigate('focus')}
              className="w-full justify-start h-16 text-left bg-gradient-to-r from-primary to-primary-hover hover:opacity-90"
            >
              <Play className="w-6 h-6 mr-3" />
              <div>
                <div className="font-semibold">Start Focus Session</div>
                <div className="text-xs opacity-90">Begin a new focus timer</div>
              </div>
            </Button>

            <Button
              onClick={() => onNavigate('tasks')}
              variant="outline"
              className="w-full justify-start h-16 text-left border-border hover:border-accent hover:bg-accent/10"
            >
              <ListTodo className="w-6 h-6 mr-3 text-accent" />
              <div>
                <div className="font-semibold">Manage Tasks</div>
                <div className="text-xs text-muted-foreground">Create and organize tasks</div>
              </div>
            </Button>

            <Button
              onClick={() => onNavigate('rooms')}
              variant="outline"
              className="w-full justify-start h-16 text-left border-border hover:border-violet hover:bg-violet/10"
            >
              <Target className="w-6 h-6 mr-3 text-violet" />
              <div>
                <div className="font-semibold">Build Together</div>
                <div className="text-xs text-muted-foreground">Join focus rooms</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
