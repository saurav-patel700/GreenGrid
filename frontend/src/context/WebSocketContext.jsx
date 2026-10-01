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
    const wsUrl = `ws://localhost:8000/ws/org/${organization.id}/?token=${token}`;

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
        setConnectionStatus('Offline');
      };

      ws.onclose = () => {
        setConnectionStatus('Offline');
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      setConnectionStatus('Offline');
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
