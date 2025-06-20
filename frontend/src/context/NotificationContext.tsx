// This file is a minimal implementation with no functionality
// The notification feature has been removed from the application

import React from 'react';

// Define the shape of our context
interface NotificationContextType {
  newInternshipsCount: number;
  newResourcesCount: number;
  resetInternshipsCount: () => void;
  resetResourcesCount: () => void;
}

// Create empty context with default values
const NotificationContext = React.createContext<NotificationContextType>({
  newInternshipsCount: 0,
  newResourcesCount: 0,
  resetInternshipsCount: () => {},
  resetResourcesCount: () => {}
});

// Empty provider component with no functionality
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // No hooks, no state, just return children
  return (
    <NotificationContext.Provider value={{
      newInternshipsCount: 0,
      newResourcesCount: 0,
      resetInternshipsCount: () => {},
      resetResourcesCount: () => {}
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Simple hook that returns default values
export const useNotifications = () => {
  return {
    newInternshipsCount: 0,
    newResourcesCount: 0,
    resetInternshipsCount: () => {},
    resetResourcesCount: () => {}
  };
};

export default NotificationContext;
