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
  const { selectedStore } = useStore();

  useEffect(() => {
    // Determine the socket URL based on environment
    const getSocketUrl = () => {
      if (process.env.NODE_ENV === 'production') {
        // In production, use the same domain as the current page
        return window.location.origin;
      }
      // In development, use localhost
      return 'http://localhost:5000';
    };

    const socketUrl = getSocketUrl();
    console.log('🔌 Creating socket connection to:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      autoConnect: true
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id, selectedStore);
      selectStore(newSocket, selectedStore);
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

    newSocket.on('autoSyncProgress', (data) => {
      if (data.stage == 'ads_completed') {
        if (window.showPrimeToast) {
          window.showPrimeToast('Auto sync completed! The data will be refreshed in a few seconds.', 'success');
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
  const selectStore = (_socket, storeId) => {
    if (_socket) {
      _socket.emit('selectStore', storeId);
      console.log(`🏪 Socket selected store: ${storeId}`);
    }
  };

  const value = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
