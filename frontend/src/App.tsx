import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Landing from './pages/Landing';
import Resources from './pages/Resources';
import Opportunities from './pages/Opportunities';
import SocialFeed from './pages/SocialFeed';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Settings';
import AllNewsPage from './pages/AllNewsPage';
import AllEventsPage from './pages/AllEventsPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [isAuthenticated, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

// Auth layout for login and register pages
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If already authenticated, redirect to feed
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);
  
  return <div className="min-h-screen bg-gray-100">{children}</div>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        
        {/* Main routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/feed" element={
  <MainLayout>
    {/* @ts-expect-error MainLayout injects required props */}
    <SocialFeed />
  </MainLayout>
} />
        <Route path="/resources" element={<MainLayout><Resources /></MainLayout>} />
        <Route path="/opportunities" element={<MainLayout><Opportunities /></MainLayout>} />
        <Route path="/settings" element={<MainLayout><ProtectedRoute><Settings /></ProtectedRoute></MainLayout>} />
        <Route path="/campus-news" element={<MainLayout><ProtectedRoute><AllNewsPage /></ProtectedRoute></MainLayout>} />
        <Route path="/campus-events" element={<MainLayout><ProtectedRoute><AllEventsPage /></ProtectedRoute></MainLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
