import { useEffect, useRef, useState } from 'react';

/**
 * Simple hook for Server-Sent Events (SSE) progress updates
 * Much more reliable than WebSockets for progress updates
 */
export const useSSE = (syncId) => {
  const [progress, setProgress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!syncId) return;

    console.log(`🔌 Connecting to SSE for sync: ${syncId}`);
    
    // Create EventSource connection
    const eventSource = new EventSource(`/api/sync/progress/${syncId}`);
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.onopen = () => {
      console.log(`✅ SSE connected for sync: ${syncId}`);
      setIsConnected(true);
    };

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 SSE message received:`, data);
        
        if (data.type === 'syncProgress') {
          setProgress(data);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error(`❌ SSE error for sync ${syncId}:`, error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        console.log(`🔌 SSE connection closed for sync: ${syncId}`);
      }
    };
  }, [syncId]);

  // Manual disconnect function
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
      setProgress(null);
    }
  };

  return {
    progress,
    isConnected,
    disconnect
  };
};
