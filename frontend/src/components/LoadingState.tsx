import React from 'react';
import { LoadingState } from '../types/api';

interface LoadingStateProps extends LoadingState {
  fullScreen?: boolean;
  className?: string;
}

const LoadingStateComponent: React.FC<LoadingStateProps> = ({
  isLoading,
  loadingMessage = 'Loading...',
  fullScreen = false,
  className = ''
}) => {
  if (!isLoading) return null;

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      {loadingMessage && (
        <p className="mt-4 text-sm text-gray-600">{loadingMessage}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingStateComponent; 