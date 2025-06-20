import React, { createContext, useState, useEffect, useContext } from 'react';
import { userAPI } from '../services/api';

// API URL for direct fetch calls
const API_URL = 'http://localhost:5000/api';

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  profile_picture: string | null;

  college?: string; // changed from university to college for backend compatibility
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  getToken: () => string | null;
  updateUserData: (newUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
  getToken: () => null,
  updateUserData: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to get authentication token
  const getToken = (): string | null => {
    // First try to get token from current user state
    if (user && user.token) {
      console.log('Token found in user state');
      return user.token;
    }
    
    // If not available, try to get from separate token storage first (most reliable)
    const separateToken = localStorage.getItem('auth_token');
    if (separateToken) {
      console.log('Token found in auth_token storage');
      return separateToken;
    }
    
    // As a last resort, try to get from user object in localStorage
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData && userData.token) {
          console.log('Token found in stored user object');
          return userData.token;
        }
      }
    } catch (error) {
      console.error('Error retrieving token from localStorage:', error);
    }
    
    console.warn('No token found in any storage location');
    return null;
  };

  // Function to check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  };

  // Function to clear dummy tokens
  const clearDummyTokens = () => {
    // Check for dummy tokens
    const authToken = localStorage.getItem('auth_token');
    if (authToken === 'dummy-jwt-token') {
      console.log('Removing dummy token from storage');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Also check user object
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.token === 'dummy-jwt-token') {
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
  };

  useEffect(() => {
    console.log('AuthContext initializing...');
    
    try {
      // Clear any dummy tokens first
      clearDummyTokens();
      
      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem('user');
      const authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      console.log('Stored user data:', storedUser ? 'Found' : 'Not found');
      console.log('Auth token:', authToken ? 'Found' : 'Not found');
      
      if (storedUser) {
        try {
          // Parse the stored user data
          const userData = JSON.parse(storedUser);
          
          // If we have a token, check if it's expired
          if (userData.token && !isTokenExpired(userData.token)) {
            console.log('Setting user from localStorage');
            
            // Ensure background_image is preserved
            const userDataToStore = {
              ...userData,
              background_image: userData.background_image || null
            };
            
            setUser(userDataToStore);
            
            // Update localStorage with normalized data
            localStorage.setItem('user', JSON.stringify(userDataToStore));
            
            // Ensure token is also stored separately for API calls
            if (userData.token) {
              localStorage.setItem('auth_token', userData.token);
              sessionStorage.setItem('auth_token', userData.token);
            }
          } else {
            // Token is expired or invalid, clear storage
            console.log('Token expired or invalid, clearing storage');
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('user');
        }
      } else if (authToken) {
        // We have a token but no user data
        console.log('Using token without user data');
        const basicUser = {
          id: 'temp-user',
          name: 'User',
          username: 'user',
          profile_picture: null,
          token: authToken
        } as User; // Cast to User type to fix type error
        setUser(basicUser);
        
        // Store user data in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(basicUser));
      }
    } catch (error) {
      console.error('Error in auth initialization:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Check if user is admin (Vaddi Harsha vardhan)
  useEffect(() => {
    if (user) {
      // Check if the user is Vaddi Harsha vardhan (admin)
      // Use a more flexible check that looks for the name containing 'Vaddi Harsha vardhan'
      const isUserAdmin = (
        user.name === 'Vaddi Harsha vardhan' || 
        (typeof user.name === 'string' && user.name.includes('Vaddi') && user.name.includes('Harsha')) ||
        user.username === 'vaddiharsha'
      );
      
      // Force admin status to true for testing if the name contains 'Vaddi'
      if (typeof user.name === 'string' && user.name.includes('Vaddi')) {
        console.log('Admin user detected:', user.name);
        setIsAdmin(true);
      } else {
        setIsAdmin(isUserAdmin);
      }
      
      console.log(`User ${user.name} admin status:`, isUserAdmin);
      // Add this to localStorage for debugging
      localStorage.setItem('isAdmin', isUserAdmin ? 'true' : 'false');
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Login function
  const login = (userData: User) => {
    console.log('Logging in user:', userData.username);
    
    setUser(userData);
    
    // Store user data in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Also store token separately for easier access
    if (userData.token) {
      localStorage.setItem('auth_token', userData.token);
      sessionStorage.setItem('auth_token', userData.token);
    }
  };

  const logout = () => {
    // Clear user state
    setUser(null);
    
    // Clear all storage
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    console.log('User logged out, all auth data cleared');
  };
  
  // Function to update user data
  const updateUserData = (newUserData: Partial<User>) => {
    if (!user) return;
    
    // Create updated user data
    const updatedUser = { 
      ...user, 
      ...newUserData
    };
    
    // Update state
    setUser(updatedUser);
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('User data updated:', updatedUser);
    console.log('Profile picture updated to:', updatedUser.profile_picture);
  };

  // Log authentication state for debugging
  console.log('AuthContext state:', { 
    user: user ? 'User exists' : 'No user', 
    token: getToken() ? 'Token exists' : 'No token',
    isAuthenticated
  });
  
  // Debug output for admin status
  useEffect(() => {
    console.log('AuthContext - Current admin status:', isAdmin);
    console.log('AuthContext - Current user:', user?.name);
  }, [isAdmin, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        getToken,
        updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
