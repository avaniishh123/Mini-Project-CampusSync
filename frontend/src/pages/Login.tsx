import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  EmailIcon, 
  LockIcon,
  VisibilityIcon,
  VisibilityOffIcon
} from '../utils/materialIcons';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the API service to login
      const data = await authAPI.login(email, password);
      
      console.log('Login successful:', data); // Debug log

      if (!data || !data.data || !data.data.token) {
        throw new Error('Invalid response from server: No token received');
      }

      // Store the token in multiple places for redundancy
      localStorage.setItem('auth_token', data.data.token);
      sessionStorage.setItem('auth_token', data.data.token); // Also store in session storage

      // Fetch the full user profile from backend for persistence
      let userProfile = null;
      try {
        userProfile = await (await import('../services/api')).userAPI.getProfile(data.data.token);
      } catch (profileErr) {
        console.error('Error fetching full profile after login:', profileErr);
      }

      // Build user object from profile (fallback to login data if needed)
      const userData = userProfile && userProfile.id ? {
        id: userProfile.id,
        name: userProfile.name,
        username: userProfile.username,
        email: userProfile.email,
        profile_picture: userProfile.profile_picture || null,
        token: data.data.token,
        college: userProfile.college || '',
        department: userProfile.department || ''
      } : {
        id: data.data.user.id,
        name: data.data.user.name,
        username: data.data.user.username,
        email: data.data.user.email,
        profile_picture: data.data.user.profile_picture || null,
        token: data.data.token,
        college: data.data.user.college || '',
        department: data.data.user.department || ''
      };

      // Force a cache-busting parameter for the profile picture if it exists
      if (userData.profile_picture) {
        userData.profile_picture = `${userData.profile_picture}?t=${new Date().getTime()}`;
      }

      // Store the full user data
      localStorage.setItem('user', JSON.stringify(userData));

      // Update auth context
      login(userData);

      // Wait a moment to ensure everything is saved before redirecting
      setTimeout(() => {
        setLoading(false);
        navigate('/feed');
      }, 500);
    } catch (err: any) {
      console.error('Login error:', err);
      setLoading(false);
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">CampusSync</h1>
          <h2 className="text-2xl font-semibold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <Card variant="elevated" elevation={2} className="px-6 py-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EmailIcon size={20} color="var(--md-sys-color-outline)" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon size={20} color="var(--md-sys-color-outline)" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2.5"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <VisibilityOffIcon size={20} />
                    ) : (
                      <VisibilityIcon size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-800 font-medium text-left">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                variant="primary"
                type="submit"
                fullWidth
                loading={loading}
              >
                Sign in
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
