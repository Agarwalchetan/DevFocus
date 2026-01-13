import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
    Clock,
    CheckCircle2,
    TrendingUp,
    BarChart3,
    Filter,
    Search,
    Calendar,
    Target,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export const History = () => {
    const { token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    const fetchHistoryData = useCallback(async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [tasksRes, sessionsRes, analyticsRes] = await Promise.all([
                fetch(`${API_URL}/api/history/tasks`, { headers }),
                fetch(`${API_URL}/api/history/sessions`, { headers }),
                fetch(`${API_URL}/api/history/analytics`, { headers })
            ]);

            const tasksData = await tasksRes.json();
            const sessionsData = await sessionsRes.json();
            const analyticsData = await analyticsRes.json();

            setTasks(tasksData.tasks || []);
            setSessions(sessionsData.sessions || []);
            setAnalytics(analyticsData);
        } catch (error) {
            toast.error('Failed to load history data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [API_URL, token]);

    useEffect(() => {
        fetchHistoryData();
    }, [fetchHistoryData]);

    const filteredTasks = tasks.filter((task) => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'completed' && task.status === 'completed') ||
            (filter === 'active' && task.status !== 'completed');

        const matchesSearch =
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.techTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesFilter && matchesSearch;
    });

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const typeColors = {
        Study: 'bg-accent-subtle text-accent border-accent/30',
        Coding: 'bg-primary-subtle text-primary border-primary/30',
        Debugging: 'bg-destructive-subtle text-destructive border-destructive/30',
        Planning: 'bg-violet-subtle text-violet border-violet/30',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">History & Analytics</h1>
                <p className="text-muted-foreground">View your complete task history and productivity insights</p>
            </div>

            {/* Analytics Dashboard */}
            {analytics?.productivityMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-border bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {analytics.productivityMetrics.totalTasks}
                                    </p>
                                </div>
                                <Target className="w-10 h-10 text-primary opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Completed</p>
                                    <p className="text-3xl font-bold text-success">
                                        {analytics.productivityMetrics.completedTasks}
                                    </p>
                                </div>
                                <CheckCircle2 className="w-10 h-10 text-success opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total Focus Time</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {Math.floor(analytics.productivityMetrics.totalFocusTime / 60)}h
                                    </p>
                                </div>
                                <Clock className="w-10 h-10 text-primary opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                                    <p className="text-3xl font-bold text-foreground">
                                        {analytics.productivityMetrics.completionRate}%
                                    </p>
                                </div>
                                <TrendingUp className="w-10 h-10 text-success opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Most Used Tech Tags */}
            {analytics && analytics.mostUsedTags.length > 0 && (
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Most Used Technologies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.mostUsedTags.map((tag, idx) => {
                                const maxMinutes = analytics.mostUsedTags[0].minutes;
                                const percentage = (tag.minutes / maxMinutes) * 100;

                                return (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-foreground">{tag.name}</span>
                                            <span className="text-muted-foreground">{tag.minutes} min</span>
                                        </div>
                                        <div className="w-full bg-secondary rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task Type Distribution */}
            {analytics && analytics.taskTypeDistribution.length > 0 && (
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            Task Type Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {analytics.taskTypeDistribution.map((item, idx) => (
                                <div key={idx} className="text-center">
                                    <div className={`px-4 py-3 rounded-lg ${typeColors[item.type] || typeColors.Coding}`}>
                                        <p className="text-sm font-medium mb-1">{item.type}</p>
                                        <p className="text-2xl font-bold">{item.minutes} min</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task History */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Task History</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-64 bg-secondary/50 border-border"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <div className="flex gap-2">
                            {['all', 'completed', 'active'].map((f) => (
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
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No tasks found</p>
                        ) : (
                            filteredTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-foreground">{task.title}</h3>
                                                <Badge
                                                    variant="outline"
                                                    className={typeColors[task.type] || typeColors.Coding}
                                                >
                                                    {task.type}
                                                </Badge>
                                                {task.status === 'completed' && (
                                                    <Badge variant="outline" className="bg-success-subtle text-success border-success/30">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Completed
                                                    </Badge>
                                                )}
                                            </div>

                                            {task.techTags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
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
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {task.totalFocusedTime} / {task.estimatedTime} min
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-4 h-4" />
                                                    {task.sessionCount} sessions
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(task.updatedAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">Progress</div>
                                            <div className="text-2xl font-bold text-primary">
                                                {Math.round((task.totalFocusedTime / task.estimatedTime) * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Recent Focus Sessions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {sessions.slice(0, 10).map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${typeColors[session.taskType]?.split(' ')[0]}`}></div>
                                    <div>
                                        <p className="font-medium text-foreground">{session.taskTitle}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(session.startTime)} at {formatTime(session.startTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-primary">{session.duration} min</p>
                                    <Badge variant="outline" className={typeColors[session.taskType]}>
                                        {session.taskType}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
