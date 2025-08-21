import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const eventListeners = useRef(new Map());
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 10; // Maximum number of retries before giving up

  const connectWebSocket = () => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const getWebSocketUrl = () => {
      if (process.env.NODE_ENV === 'production') {
        // Convert HTTP/HTTPS to WS/WSS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
      }
      return 'ws://localhost:5000';
    };

    const wsUrl = getWebSocketUrl();
    console.log(`🔌 Creating WebSocket connection to: ${wsUrl} (Attempt ${retryCountRef.current + 1}/${maxRetries})`);

    const newSocket = new WebSocket(wsUrl);

    // WebSocket event handlers
    newSocket.onopen = () => {
      console.log('🔌 WebSocket connected');
      setSocketId(`ws_${Date.now()}`);
      setIsConnected(true);
      retryCountRef.current = 0; // Reset retry count on successful connection
      
      // Test if WebSocket is working - use newSocket directly since state isn't set yet
      console.log('🧪 Testing WebSocket functionality...');
      const testMessage = { type: 'getSocketId', data: { message: 'Get Client Socket ID', timestamp: Date.now() } };
      newSocket.send(JSON.stringify(testMessage));
    };

    newSocket.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setSocketId(null);
      
      // Attempt to reconnect if not a manual close and under max retries
      if (event.code !== 1000 && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Attempting to reconnect in 5 seconds... (${retryCountRef.current}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      } else if (retryCountRef.current >= maxRetries) {
        console.error('❌ Maximum retry attempts reached. WebSocket connection failed.');
      }
    };

    newSocket.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
      setIsConnected(false);
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'testResponse') {
          console.log('✅ Server responded to test:', data);
        } else if (data.type === 'autoSyncProgress') {
          if (data.stage === 'ads_completed') {
            if (window.showPrimeToast) {
              window.showPrimeToast('Auto sync completed! The page will be refreshed in a few seconds.', 'success');
            }
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          }
        } else if (data.type === 'welcome') {
          console.log('🔌 Welcome message:', data);
        }
        else if (data.type === 'getSocketId') {
          console.log(data)
          newSocket.id = data.data;
          setSocket(newSocket);
          setSocketId(data.data);
        }
        // Trigger event listeners
        if (data.type && eventListeners.current.has(data.type)) {
          eventListeners.current.get(data.type).forEach(callback => callback(data.data));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    setSocket(newSocket);
  };

  useEffect(() => {
    // Create initial WebSocket connection
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Close socket if open
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Component unmounting'); // Normal closure
      }
    };
  }, []);

  // Function to send messages
  const sendMessage = (type, data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = { type, data, timestamp: Date.now() };
      socket.send(JSON.stringify(message));
      console.log(`📤 WebSocket message sent:`, message);
      return true;
    }
    console.warn('⚠️ WebSocket not ready, message not sent');
    return false;
  };

  // Function to select store
  const selectStore = (storeId) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log(`🏪 Selecting store: ${storeId}`);
      sendMessage('selectStore', { storeId });
      return true;
    }
    return false;
  };

  // Function to add event listeners
  const addEventListener = (eventType, callback) => {
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    eventListeners.current.get(eventType).add(callback);
    
    return () => {
      const listeners = eventListeners.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  };

  // Socket health check function
  const checkSocketHealth = () => {
    if (socket) {
      return {
        exists: !!socket,
        connected: socket.readyState === WebSocket.OPEN,
        readyState: socket.readyState,
        url: socket.url,
        bufferedAmount: socket.bufferedAmount
      };
    }
    return null;
  };

  // Manual test function
  const testSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('🧪 Manual WebSocket test...');
      return sendMessage('test', { 
        message: 'Manual test from client', 
        timestamp: Date.now()
      });
    }
    return false;
  };

  // Manual reconnect function
  const reconnect = () => {
    console.log('🔄 Manual reconnect requested');
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'Manual reconnect');
    } else {
      retryCountRef.current = 0; // Reset retry count for manual reconnect
      connectWebSocket();
    }
  };

  // Get connection status with retry info
  const getConnectionStatus = () => {
    return {
      isConnected,
      socketId,
      retryCount: retryCountRef.current,
      maxRetries,
      isRetrying: !!retryTimeoutRef.current,
      readyState: socket ? socket.readyState : null
    };
  };

  // Emit event function
  const emitEvent = (eventName, data) => {
    return sendMessage(eventName, data);
  };

  const value = {
    socket,
    isConnected,
    socketId,
    selectStore,
    sendMessage,
    addEventListener,
    checkSocketHealth,
    testSocket,
    reconnect,
    getConnectionStatus,
    emitEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
