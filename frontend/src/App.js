import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { FocusTimer } from './pages/FocusTimer';
import { Heatmap } from './pages/Heatmap';
import { FocusRooms } from './pages/FocusRooms';
import { Insights } from './pages/Insights';
import { History } from './pages/History';
import { ProfilePage } from './pages/ProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { Navbar } from './components/Navbar';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('lastPage') || 'dashboard');
  const [viewProfileUser, setViewProfileUser] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;

    // 1. Profile Route
    const profileMatch = path.match(/^\/u\/([^/]+)/);
    if (profileMatch) {
      setViewProfileUser(profileMatch[1]);
      setCurrentPage('profile');
      return;
    }

    // 2. Community Route
    if (path === '/community') {
      setCurrentPage('community');
      return;
    }

  }, []);

  useEffect(() => {
    localStorage.setItem('lastPage', currentPage);
  }, [currentPage]);
  const [focusTask, setFocusTask] = useState(null);

  const handleStartFocus = (task) => {
    setFocusTask(task);
    setCurrentPage('focus');
    window.history.pushState({}, '', '/');
  };

  const handleFocusComplete = () => {
    setFocusTask(null);
    setCurrentPage('dashboard');
    window.history.pushState({}, '', '/');
  };

  // Wrapper to update both state and URL
  const handleNavigate = (page) => {
    setCurrentPage(page);
    // Update URL to root for all non-special pages
    if (page !== 'profile' && page !== 'community') {
      window.history.pushState({}, '', '/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <Dashboard onNavigate={handleNavigate} onStartFocus={handleStartFocus} />
        )}
        {currentPage === 'tasks' && <Tasks onStartFocus={handleStartFocus} />}
        {currentPage === 'focus' && (
          <FocusTimer initialTask={focusTask} onComplete={handleFocusComplete} />
        )}
        {currentPage === 'heatmap' && <Heatmap />}
        {currentPage === 'rooms' && <FocusRooms />}
        {currentPage === 'insights' && <Insights onNavigate={handleNavigate} onStartFocus={handleStartFocus} />}
        {currentPage === 'history' && <History />}
        {currentPage === 'profile' && <ProfilePage username={viewProfileUser} onNavigate={handleNavigate} />}
        {currentPage === 'community' && <CommunityPage />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
