import React from 'react';
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'spinner', 
  message = '', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1">
            <div className="w-1 h-4 bg-current rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-4 bg-current rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-4 bg-current rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'success':
        return <CheckCircle className={`${sizeClasses[size]} text-green-500`} />;
      
      case 'error':
        return <AlertCircle className={`${sizeClasses[size]} text-red-500`} />;
      
      case 'refresh':
        return <RefreshCw className={`${sizeClasses[size]} animate-spin`} />;
      
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin`} />;
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        {renderSpinner()}
        {message && (
          <span className="text-sm text-gray-600 font-medium text-center">
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
