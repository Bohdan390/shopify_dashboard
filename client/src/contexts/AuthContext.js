import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from "../config/axios"

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  
  // Activity-based session management
  const [lastActivity, setLastActivity] = useState(Date.now());
  const activityTimeoutRef = useRef(null);
  const sessionCheckRef = useRef(null);
  
  // Session settings
  const BASE_SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 hours base session
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity
  const MAX_SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 hours maximum

  useEffect(() => {
    // Check if user is already authenticated on app load
    const savedAuth = localStorage.getItem('shopify_auth');
    if (savedAuth) {
      const { token, expiry } = JSON.parse(savedAuth);
      if (token && expiry && new Date().getTime() < expiry) {
        // Verify session with backend
        verifySession(token);
      } else {
        // Session expired, clear storage
        localStorage.removeItem('shopify_auth');
      }
    }
  }, []);

  // Activity detection
  useEffect(() => {
    if (isAuthenticated) {
      const handleActivity = () => {
        setLastActivity(Date.now());
        extendSession();
      };

      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      // Start activity monitoring
      startActivityMonitoring();

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
        stopActivityMonitoring();
      };
    }
  }, [isAuthenticated]);

  const startActivityMonitoring = () => {
    // Check for inactivity every minute
    activityTimeoutRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // User inactive, reduce session time
        reduceSessionOnInactivity();
      }
    }, 60000); // Check every minute
  };

  const stopActivityMonitoring = () => {
    if (activityTimeoutRef.current) {
      clearInterval(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  };

  const extendSession = () => {
    if (sessionExpiry) {
      const now = Date.now();
      const newExpiry = Math.min(now + BASE_SESSION_DURATION, now + MAX_SESSION_DURATION);
      setSessionExpiry(newExpiry);
      
      // Update localStorage
      const savedAuth = localStorage.getItem('shopify_auth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        authData.expiry = newExpiry;
        localStorage.setItem('shopify_auth', JSON.stringify(authData));
      }
    }
  };

  const reduceSessionOnInactivity = () => {
    if (sessionExpiry) {
      const now = Date.now();
      const remainingTime = sessionExpiry - now;
      
      // Reduce session to 15 minutes if inactive
      if (remainingTime > 15 * 60 * 1000) {
        const newExpiry = now + (15 * 60 * 1000);
        setSessionExpiry(newExpiry);
        
        // Update localStorage
        const savedAuth = localStorage.getItem('shopify_auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          authData.expiry = newExpiry;
          localStorage.setItem('shopify_auth', JSON.stringify(authData));
        }
      }
    }
  };

  const verifySession = async (token) => {
    try {
      const response = await api.post('/api/auth/verify', {
        sessionToken: token
      });

      const data = await response.data;
      
      if (data.success) {
        setIsAuthenticated(true);
        setSessionExpiry(data.expiryTime);
        setSessionToken(token);
        setLastActivity(Date.now());
      } else {
        // Session invalid, clear storage
        localStorage.removeItem('shopify_auth');
        setIsAuthenticated(false);
        setSessionExpiry(null);
        setSessionToken(null);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      localStorage.removeItem('shopify_auth');
      setIsAuthenticated(false);
      setSessionExpiry(null);
      setSessionToken(null);
    }
  };

  const login = async (password) => {
    try {
      const response = await api.post('/api/auth/login', {
        password: password
      });

      const data = await response.data;
      
      if (data.success) {
        setIsAuthenticated(true);
        setSessionExpiry(data.expiryTime);
        setSessionToken(data.sessionToken);
        setLastActivity(Date.now());
        // Save to localStorage
        localStorage.setItem('shopify_auth', JSON.stringify({
          token: data.sessionToken,
          expiry: data.expiryTime
        }));
        window.location.href = '/dashboard';
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setSessionExpiry(null);
    setSessionToken(null);
    setLastActivity(0);
    localStorage.removeItem('shopify_auth');
    stopActivityMonitoring();
  };

  const checkSessionExpiry = () => {
    if (sessionExpiry && new Date().getTime() >= sessionExpiry) {
      logout();
      return true; // Session expired
    }
    return false; // Session still valid
  };

  // Check session expiry every minute
  useEffect(() => {
    if (isAuthenticated) {
      sessionCheckRef.current = setInterval(() => {
        checkSessionExpiry();
      }, 60000); // Check every minute
      
      return () => {
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
        }
      };
    }
  }, [isAuthenticated, sessionExpiry]);

  const value = {
    isAuthenticated,
    login,
    logout,
    checkSessionExpiry,
    sessionExpiry,
    lastActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
