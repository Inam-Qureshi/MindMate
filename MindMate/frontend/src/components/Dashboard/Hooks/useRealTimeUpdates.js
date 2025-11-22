/**
 * useRealTimeUpdates - Custom Hook for Real-time Dashboard Updates
 * ==============================================================
 * Handles WebSocket connections and real-time data updates.
 * 
 * Features:
 * - WebSocket connection management
 * - Automatic reconnection
 * - Message handling
 * - Connection status tracking
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export const useRealTimeUpdates = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const subscribersRef = useRef(new Map());
  
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second
  const heartbeatInterval = 30000; // 30 seconds

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found, skipping WebSocket connection');
        return;
      }

      const wsUrl = `${WS_URL}?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Start heartbeat
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Stop heartbeat
        stopHeartbeat();
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000) {
          attemptReconnection();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setConnectionStatus('error');
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Attempt reconnection with exponential backoff
  const attemptReconnection = useCallback((attempt = 1) => {
    if (attempt > maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      setConnectionStatus('failed');
      return;
    }

    setConnectionStatus('reconnecting');
    
    const delay = reconnectDelay * Math.pow(2, attempt - 1);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${attempt}/${maxReconnectAttempts}`);
      connect();
    }, delay);
  }, [connect]);

  // Handle incoming messages
  const handleMessage = useCallback((message) => {
    setLastMessage(message);
    
    switch (message.type) {
      case 'pong':
        // Heartbeat response
        break;
        
      case 'dashboard_update':
        // Handle dashboard updates
        setUpdates(prev => [...prev, {
          id: message.id || Date.now(),
          type: message.update_type,
          data: message.data,
          timestamp: new Date().toISOString()
        }]);
        
        // Notify subscribers
        subscribersRef.current.forEach((callback) => {
          try {
            callback(message);
          } catch (err) {
            console.error('Error in subscriber callback:', err);
          }
        });
        break;
        
      case 'notification':
        // Handle notifications
        console.log('Received notification:', message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Subscribe to updates
  const subscribe = useCallback((userId, callback) => {
    const subscriptionId = `user_${userId}`;
    subscribersRef.current.set(subscriptionId, callback);
    
    return () => {
      subscribersRef.current.delete(subscriptionId);
    };
  }, []);

  // Unsubscribe from updates
  const unsubscribe = useCallback((userId) => {
    const subscriptionId = `user_${userId}`;
    subscribersRef.current.delete(subscriptionId);
  }, []);

  // Send message
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Clear updates
  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  // Auto-connect on mount (disabled for now)
  useEffect(() => {
    // connect(); // Disabled WebSocket for now
    console.log('WebSocket connection disabled for debugging');
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    updates,
    connectionStatus,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    clearUpdates
  };
};

export default useRealTimeUpdates;
