import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from './StoreContext';

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

  useEffect(() => {
    // Create socket connection ONLY ONCE when app loads
    const getSocketUrl = () => {
      if (process.env.NODE_ENV === 'production') {
        return window.location.origin;
      }
      return 'http://localhost:5000';
    };

    const socketUrl = getSocketUrl();
    console.log('🔌 Creating SINGLE socket connection to:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false, // Don't force new connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      autoConnect: true
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setSocketId(newSocket.id);
      
      console.log('🔌 Socket health check:', {
        id: newSocket.id,
        connected: newSocket.connected,
        readyState: newSocket.readyState,
        transport: newSocket.io?.engine?.transport?.name
      });
      
      // Test if socket is actually working
      console.log('🧪 Testing socket functionality...');
      newSocket.emit('test', { message: 'Client socket test', timestamp: Date.now() });
      
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('welcome', (data) => {
      console.log('🔌 Welcome message:', data);
    });

    // Test response listener
    newSocket.on('testResponse', (data) => {
      console.log('✅ Server responded to test:', data);
    });

    newSocket.on('autoSyncProgress', (data) => {
      if (data.stage == 'ads_completed') {
        if (window.showPrimeToast) {
          window.showPrimeToast('Auto sync completed! The page will be refreshed in a few seconds.', 'success');
        }
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    });

    newSocket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  // Function to select store for this socket connection
  const selectStore = (storeId) => {
    if (socket && socket.connected) {
      console.log(`🏪 Emitting selectStore event for store: ${storeId}`);
      socket.emit('selectStore', storeId);
      console.log(`🏪 Socket selected store: ${storeId}`);
    }
  };

  const value = {
    socket,
    isConnected,
    socketId,
    selectStore,
    // Socket health check function
    checkSocketHealth: () => {
      if (socket) {
        return {
          exists: !!socket,
          connected: socket.connected,
          id: socket.id,
          readyState: socket.readyState,
          transport: socket.io?.engine?.transport?.name,
          hasListeners: socket.hasListeners && socket.hasListeners('connect')
        };
      }
      return null;
    },
    // Manual test functions
    testSocket: () => {
      if (socket && socket.connected) {
        console.log('🧪 Manual socket test...');
        socket.emit('test', { 
          message: 'Manual test from client', 
          timestamp: Date.now()
        });
        return 'Test event emitted';
      }
      return 'Socket not ready';
    },
    emitEvent: (eventName, data) => {
      if (socket && socket.connected) {
        console.log(`📡 Emitting ${eventName}:`, data);
        socket.emit(eventName, data);
        return `Event ${eventName} emitted`;
      }
      return 'Socket not ready';
    }
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
