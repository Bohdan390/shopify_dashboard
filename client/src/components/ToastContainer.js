import React, { useState, useCallback } from 'react';
import Toast from './Toast';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title, message, duration = 5000) => {
    return addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const showError = useCallback((title, message, duration = 7000) => {
    return addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  const showWarning = useCallback((title, message, duration = 5000) => {
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  const showInfo = useCallback((title, message, duration = 4000) => {
    return addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  // Expose methods globally for easy access
  React.useEffect(() => {
    window.showToast = {
      success: showSuccess,
      error: showError,
      warning: showWarning,
      info: showInfo
    };
  }, [showSuccess, showError, showWarning, showInfo]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="mb-1"
          style={{ 
            transform: `translateY(${index * 30}px)`,
            transition: 'transform 0.3s ease-out',
            animation: 'slideInFromRight 0.5s ease-out',
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'both'
          }}
        >
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
