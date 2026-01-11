import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { FocusTimer } from './pages/FocusTimer';
import { Heatmap } from './pages/Heatmap';
import { FocusRooms } from './pages/FocusRooms';
import { Navbar } from './components/Navbar';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [focusTask, setFocusTask] = useState(null);

  const handleStartFocus = (task) => {
    setFocusTask(task);
    setCurrentPage('focus');
  };

  const handleFocusComplete = () => {
    setFocusTask(null);
    setCurrentPage('dashboard');
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
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <Dashboard onNavigate={setCurrentPage} onStartFocus={handleStartFocus} />
        )}
        {currentPage === 'tasks' && <Tasks onStartFocus={handleStartFocus} />}
        {currentPage === 'focus' && (
          <FocusTimer initialTask={focusTask} onComplete={handleFocusComplete} />
        )}
        {currentPage === 'heatmap' && <Heatmap />}
        {currentPage === 'rooms' && <FocusRooms />}
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
