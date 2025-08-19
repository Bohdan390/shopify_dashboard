import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <Login />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
