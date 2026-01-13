import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Lightbulb,
  Clock,
  Target,
  TrendingUp,
  Activity,
  Code,
  RefreshCw,
  AlertTriangle,
  Calendar,
  CheckCircle,
  PieChart,
  Zap,
  Plus,
  Send,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

const iconMap = {
  clock: Clock,
  target: Target,
  activity: Activity,
  code: Code,
  'trending-up': TrendingUp,
  'check-circle': CheckCircle,
  'pie-chart': PieChart,
  lightbulb: Lightbulb,
  zap: Zap
};

export const Insights = ({ onNavigate, onStartFocus }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyInsights, setWeeklyInsights] = useState([]);
  const [monthlyInsights, setMonthlyInsights] = useState([]);
  const [burnoutData, setBurnoutData] = useState(null);
  const [smartPlan, setSmartPlan] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Daily recommendations state
  const [dailyRecommendations, setDailyRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';



  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWeeklyInsights(data.weekly_insights || []);
        setMonthlyInsights(data.monthly_insights || []);
        setBurnoutData(data.burnout_detection);
        setSmartPlan(data.smart_plan);
        setGeneratedAt(data.generated_at);
      }
    } catch (error) {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/api/insights/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWeeklyInsights(data.weekly_insights || []);
        setMonthlyInsights(data.monthly_insights || []);
        setBurnoutData(data.burnout_detection);
        setSmartPlan(data.smart_plan);
        setGeneratedAt(data.generated_at);
        toast.success('Insights refreshed!');
      }
    } catch (error) {
      toast.error('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  const createTaskFromSuggestion = async (suggestion) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: suggestion.title,
          type: suggestion.type,
          techTags: suggestion.techTags || [],
          estimatedTime: suggestion.estimatedTime,
        }),
      });

      if (response.ok) {
        toast.success('Task created from suggestion!');
        onNavigate('tasks');
      }
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const fetchDailyRecommendations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/insights/daily-recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load daily recommendations:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchInsights();
    fetchDailyRecommendations();
  }, [fetchInsights, fetchDailyRecommendations]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/insights/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        toast.error('Failed to get AI response');
      }
    } catch (error) {
      toast.error('Error communicating with AI');
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };


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
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Lightbulb className="w-10 h-10 text-primary" />
            Insights
          </h1>
          <p className="text-muted-foreground">
            AI-powered productivity insights and recommendations
          </p>
        </div>

        <Button
          onClick={refreshInsights}
          disabled={refreshing}
          className="bg-primary hover:bg-primary-hover"
          data-testid="refresh-insights-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {generatedAt && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(generatedAt).toLocaleString()}
        </p>
      )}

      {/* AI Chatbox */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            AI Productivity Coach
          </CardTitle>
          <p className="text-sm text-muted-foreground">Chat about your productivity patterns and get personalized advice</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-card/50 rounded-lg border border-border">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Start a conversation! Ask me about your productivity, focus habits, or tips for improvement.
                </p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-secondary text-foreground'
                        }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary text-foreground rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about your productivity..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                disabled={chatLoading}
                className="flex-1 bg-card border-border"
              />
              <Button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading}
                className="bg-primary hover:bg-primary-hover"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Recommendations */}
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Today's Recommendations
          </CardTitle>
          <p className="text-sm text-muted-foreground">AI-generated daily tips, todos, and motivation</p>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyRecommendations.map((rec, idx) => {
                const IconComponent = iconMap[rec.icon] || Target;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border hover:border-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${rec.type === 'todo' ? 'bg-primary/10 text-primary' :
                      rec.type === 'tip' ? 'bg-accent/10 text-accent' :
                        'bg-primary/10 text-primary'
                      }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{rec.text}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {rec.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Burnout Alert */}
      {burnoutData && burnoutData.detected && (
        <Card
          className={`border-2 ${burnoutData.level === 'high'
            ? 'border-destructive bg-destructive/5'
            : burnoutData.level === 'medium'
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-accent bg-accent/5'
            }`}
          data-testid="burnout-alert"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle
                className={`w-8 h-8 ${burnoutData.level === 'high'
                  ? 'text-destructive'
                  : burnoutData.level === 'medium'
                    ? 'text-amber-500'
                    : 'text-accent'
                  }`}
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  Burnout Detection
                  <Badge
                    variant="outline"
                    className={
                      burnoutData.level === 'high'
                        ? 'bg-destructive-subtle text-destructive border-destructive/30'
                        : burnoutData.level === 'medium'
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-accent-subtle text-accent border-accent/30'
                    }
                  >
                    {burnoutData.level.toUpperCase()} RISK
                  </Badge>
                </h3>
                <p className="text-foreground mb-3">{burnoutData.description}</p>
                <div className="flex flex-wrap gap-2">
                  {burnoutData.signals?.map((signal, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {signal.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Daily Plan */}
      {smartPlan && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-violet/5" data-testid="smart-daily-plan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Zap className="w-6 h-6 text-primary" />
              Today's Smart Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{smartPlan.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card/50 backdrop-blur rounded-lg p-4 border border-border">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  Best Time Window
                </h4>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {smartPlan.best_time_window?.formatted || 'N/A'}
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur rounded-lg p-4 border border-border">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  Estimated Duration
                </h4>
                <p className="text-2xl font-bold text-foreground">
                  {smartPlan.estimated_total_duration} min
                </p>
              </div>
            </div>

            {/* Suggested Tasks */}
            {smartPlan.suggested_tasks && smartPlan.suggested_tasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">Suggested Tasks:</h4>
                {smartPlan.suggested_tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                    data-testid={`suggested-task-${idx}`}
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{task.title}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.estimatedTime}m
                        </span>
                      </div>
                    </div>
                    {task.id && (
                      <Button
                        size="sm"
                        onClick={() => onNavigate('tasks')}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Task Suggestion */}
            {smartPlan.new_task_suggestion && (
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-lg mb-2">Suggested New Task:</h4>
                <div className="p-4 rounded-lg bg-violet/10 border border-violet/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground mb-1">
                        {smartPlan.new_task_suggestion.title}
                      </h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        {smartPlan.new_task_suggestion.reason}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {smartPlan.new_task_suggestion.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {smartPlan.new_task_suggestion.estimatedTime}m
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => createTaskFromSuggestion(smartPlan.new_task_suggestion)}
                      className="bg-violet hover:bg-violet/80"
                      data-testid="create-suggested-task-btn"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Insights */}
      {weeklyInsights.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-accent" />
            This Week's Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeklyInsights.map((insight, idx) => {
              const IconComponent = iconMap[insight.icon] || Target;
              return (
                <Card
                  key={idx}
                  className="border-border bg-card hover:border-accent/50 transition-all"
                  data-testid={`weekly-insight-${idx}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <IconComponent className="w-5 h-5 text-accent" />
                      {insight.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {insight.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Insights */}
      {monthlyInsights.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            This Month's Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyInsights.map((insight, idx) => {
              const IconComponent = iconMap[insight.icon] || Target;
              return (
                <Card
                  key={idx}
                  className="border-border bg-card hover:border-primary/50 transition-all"
                  data-testid={`monthly-insight-${idx}`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <IconComponent className="w-5 h-5 text-primary" />
                      {insight.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {insight.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {weeklyInsights.length === 0 && monthlyInsights.length === 0 && !burnoutData && !smartPlan && (
        <Card className="border-border">
          <CardContent className="text-center py-12">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Insights Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your focus sessions to unlock personalized insights and recommendations.
            </p>
            <Button
              onClick={() => onNavigate('tasks')}
              className="bg-primary hover:bg-primary-hover"
            >
              Start Tracking
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
