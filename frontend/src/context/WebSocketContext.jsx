import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/api';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user, organization, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('Offline');
  const [latestEvent, setLatestEvent] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !organization?.id) {
      setConnectionStatus('Offline');
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const token = getAccessToken();
    let wsBaseUrl = (import.meta.env.VITE_WS_URL || '').trim();
    if (!wsBaseUrl) {
      if (import.meta.env.VITE_API_BASE_URL) {
        try {
          const parsed = new URL(import.meta.env.VITE_API_BASE_URL.trim());
          const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          wsBaseUrl = `${proto}//${parsed.host}`;
        } catch {
          wsBaseUrl = 'ws://localhost:8000';
        }
      } else {
        wsBaseUrl = 'ws://localhost:8000';
      }
    }
    const wsUrl = `${wsBaseUrl}/ws/org/${organization.id}/?token=${token}`;

    setConnectionStatus('Reconnecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('Connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLatestEvent(payload);
        } catch (err) {}
      };

      ws.onerror = () => {
        setConnectionStatus('Online');
      };

      ws.onclose = () => {
        setConnectionStatus('Online');
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      setConnectionStatus('Online');
    }
  }, [isAuthenticated, organization?.id]);

  return (
    <WebSocketContext.Provider value={{ connectionStatus, latestEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  return context || { connectionStatus: 'Offline', latestEvent: null };
}
