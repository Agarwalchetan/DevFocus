import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (roomId, token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  const WS_URL = API_URL.replace('http', 'ws');

  useEffect(() => {
    if (!roomId || !token) return;

    const ws = new WebSocket(`${WS_URL}/api/ws/room/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [roomId, token]);

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, messages, sendMessage };
};

export const useNotification = () => {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        setPermission(perm);
      });
    }
  }, []);

  const showNotification = (title, options = {}) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options,
      });
    }
  };

  return { showNotification, permission };
};

export const useTimer = (initialMinutes, onComplete) => {
  const STORAGE_KEY = 'focusTimer';

  // Initialize state from localStorage or defaults
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { timeLeft, isRunning, startTime, duration } = JSON.parse(saved);

        // If timer was running, calculate actual time left based on elapsed time
        if (isRunning && startTime) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const actualTimeLeft = Math.max(0, timeLeft - elapsed);
          return {
            timeLeft: actualTimeLeft,
            isRunning: actualTimeLeft > 0,
            duration: duration || initialMinutes
          };
        }

        return {
          timeLeft: timeLeft || initialMinutes * 60,
          isRunning: false,
          duration: duration || initialMinutes
        };
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }

    return {
      timeLeft: initialMinutes * 60,
      isRunning: false,
      duration: initialMinutes
    };
  };

  const initialState = getInitialState();
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isRunning, setIsRunning] = useState(initialState.isRunning);
  const [duration, setDuration] = useState(initialState.duration);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      timeLeft,
      isRunning,
      startTime: startTimeRef.current,
      duration
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [timeLeft, isRunning, duration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      // Set start time when timer starts
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            startTimeRef.current = null;
            localStorage.removeItem(STORAGE_KEY);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clear start time when paused
      if (!isRunning) {
        startTimeRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const start = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const pause = () => {
    setIsRunning(false);
    startTimeRef.current = null;
  };

  const reset = (minutes) => {
    setTimeLeft(minutes * 60);
    setDuration(minutes);
    setIsRunning(false);
    startTimeRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    progress: ((duration * 60 - timeLeft) / (duration * 60)) * 100,
    duration,
  };
};
