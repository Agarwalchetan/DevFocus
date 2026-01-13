import React from 'react';
import { LayoutDashboard, ListTodo, Clock, Activity, Users, LogOut, Flame, Lightbulb, History } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'focus', label: 'Focus', icon: Clock },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'history', label: 'History', icon: History },
    { id: 'heatmap', label: 'Heatmap', icon: Activity },
    { id: 'rooms', label: 'Rooms', icon: Users },
  ];

  return (
    <nav className="border-b border-border bg-card backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="relative">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">DevFocus</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'heatmap') { // Now 'profile'
                        const uname = user.username || user.email.split('@')[0];
                        window.location.href = `/u/${uname}`;
                      } else {
                        onNavigate(item.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.id === 'heatmap' ? 'Profile' : item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
              <Flame className="w-5 h-5 text-primary" />
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Streak</div>
                <div className="text-sm font-bold text-foreground">{user?.streakCount || 0} days</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
