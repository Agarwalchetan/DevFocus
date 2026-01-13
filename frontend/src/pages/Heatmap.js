import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const Heatmap = () => {
  const { token } = useAuth();
  const [heatmapData, setHeatmapData] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const fetchHeatmapData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/heatmap`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setHeatmapData(data);
    } catch (error) {
      toast.error('Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  const getLast365Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  };

  const getIntensity = (date) => {
    const entry = heatmapData.find((d) => d.date === date);
    if (!entry) return 0;

    let minutes = entry.totalMinutes;

    if (filter !== 'all' && entry.categoryBreakdown) {
      minutes = entry.categoryBreakdown[filter] || 0;
    }

    if (minutes === 0) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 120) return 3;
    return 4;
  };

  const getIntensityColor = (intensity) => {
    const colors = [
      'bg-secondary',
      'bg-primary/20',
      'bg-primary/40',
      'bg-primary/70',
      'bg-primary',
    ];
    return colors[intensity];
  };

  const days365 = getLast365Days();
  const weeks = [];
  for (let i = 0; i < days365.length; i += 7) {
    weeks.push(days365.slice(i, i + 7));
  }

  const handleCellClick = (date) => {
    const entry = heatmapData.find((d) => d.date === date);
    setSelectedDate(entry || { date, totalMinutes: 0, categoryBreakdown: {} });
  };

  const stats = {
    totalDays: heatmapData.length,
    totalMinutes: heatmapData.reduce((sum, d) => sum + d.totalMinutes, 0),
    bestDay: heatmapData.reduce(
      (max, d) => (d.totalMinutes > (max?.totalMinutes || 0) ? d : max),
      null
    ),
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
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Focus Heatmap</h1>
        <p className="text-muted-foreground">Visualize your daily focus intensity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Days
            </CardTitle>
            <Calendar className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalDays}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Focus Time
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {Math.floor(stats.totalMinutes / 60)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalMinutes} minutes</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Day
            </CardTitle>
            <Flame className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats.bestDay ? `${stats.bestDay.totalMinutes}m` : 'N/A'}
            </div>
            {stats.bestDay && (
              <p className="text-xs text-muted-foreground mt-1">{stats.bestDay.date}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Last 12 Months</CardTitle>
            <div className="flex gap-2">
              {['all', 'Study', 'Coding', 'Debugging', 'Planning'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={
                    filter === f
                      ? 'bg-primary hover:bg-primary-hover'
                      : 'border-border'
                  }
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-1 min-w-max">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-8">{day}</span>
                  {weeks.map((week, weekIdx) => {
                    const date = week[dayIdx];
                    if (!date) return <div key={`empty-${weekIdx}`} className="w-3 h-3" />;

                    const intensity = getIntensity(date);
                    return (
                      <button
                        key={date}
                        onClick={() => handleCellClick(date)}
                        className={`w-3 h-3 rounded-sm ${getIntensityColor(
                          intensity
                        )} hover:ring-2 hover:ring-primary transition-all`}
                        title={date}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${getIntensityColor(i)}`} />
              ))}
              <span>More</span>
            </div>
          </div>

          {selectedDate && (
            <Card className="mt-6 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{selectedDate.date}</h3>
                <p className="text-muted-foreground mb-3">
                  Total Focus Time: <span className="text-foreground font-semibold">{selectedDate.totalMinutes} minutes</span>
                </p>
                {selectedDate.categoryBreakdown &&
                  Object.keys(selectedDate.categoryBreakdown).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Breakdown:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedDate.categoryBreakdown).map(([type, mins]) => (
                          <Badge key={type} variant="outline" className="bg-secondary">
                            {type}: {mins}m
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
