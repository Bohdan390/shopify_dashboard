import { io } from 'socket.io-client';

// Centralized socket configuration
const getSocketUrl = () => {
  // Use production URL when deployed, localhost for development
  return window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : window.location.origin;
};

// Create socket instance with configuration
const createSocket = () => {
  const socketUrl = getSocketUrl();

  return io(socketUrl, {
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
};

// Socket event handlers
const setupSocketHandlers = (socket) => {
  socket.on('connect', () => {
  });

  socket.on('disconnect', (reason) => {
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
  });

  socket.on('welcome', (data) => {
  });

  socket.on('error', (error) => {
    console.error('🔌 Socket error:', error);
  });
};

export { createSocket, setupSocketHandlers, getSocketUrl };
