import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const Toast = ({ 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Animate in when component mounts
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleExit();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleClose = () => {
    handleExit();
  };

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          titleColor: 'text-green-900'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          titleColor: 'text-red-900'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-900'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-900'
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div className={`
      max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-96 opacity-0'}
      ${styles.bgColor} border rounded-lg shadow-lg p-4
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-sm font-semibold ${styles.titleColor} mb-1`}>
              {title}
            </h4>
          )}
          {message && (
            <p className={`text-sm ${styles.textColor}`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`${styles.textColor} hover:opacity-70 transition-opacity p-1 rounded-full hover:bg-white hover:bg-opacity-50`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
