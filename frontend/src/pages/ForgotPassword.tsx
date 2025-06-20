import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  EmailIcon, 
  LockIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  ArrowBackIcon
} from '../utils/materialIcons';
import Button from '../components/Button';
import Card from '../components/Card';
import { authAPI } from '../services/api';

type Step = 'email' | 'security' | 'reset';

const ForgotPassword: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.initiateForgotPassword(email);
      
      if (response.status === 'success' && response.data?.security_question) {
        setSecurityQuestion(response.data.security_question);
        setCurrentStep('security');
      } else {
        setError('Email not found or security question not set up');
      }
    } catch (err: any) {
      console.error('Initiate forgot password error:', err);
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifySecurityAnswer(email, securityAnswer);
      
      if (response.status === 'success' && response.data?.reset_token) {
        setResetToken(response.data.reset_token);
        setCurrentStep('reset');
      } else {
        setError('Invalid security answer');
      }
    } catch (err: any) {
      console.error('Verify security answer error:', err);
      setError(err.message || 'Invalid security answer');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetPassword(resetToken, newPassword);
      
      if (response.status === 'success') {
        setSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep === 'security') {
      setCurrentStep('email');
      setSecurityAnswer('');
      setError('');
    } else if (currentStep === 'reset') {
      setCurrentStep('security');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  };

  const renderEmailStep = () => (
    <form className="space-y-6" onSubmit={handleEmailSubmit}>
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
        <Button
          variant="primary"
          type="submit"
          fullWidth
          loading={loading}
        >
          Continue
        </Button>
      </div>
    </form>
  );

  const renderSecurityStep = () => (
    <form className="space-y-6" onSubmit={handleSecurityAnswerSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Security Question
        </label>
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <p className="text-sm text-gray-700">{securityQuestion}</p>
        </div>
      </div>

      <div>
        <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
          Your Answer
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            id="securityAnswer"
            name="securityAnswer"
            type="text"
            required
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md py-2.5 px-3"
            placeholder="Enter your answer"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="secondary"
          type="button"
          onClick={goBack}
          className="flex-1"
        >
          <ArrowBackIcon size={16} className="mr-2" />
          Back
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          className="flex-1"
        >
          Verify Answer
        </Button>
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form className="space-y-6" onSubmit={handlePasswordReset}>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockIcon size={20} color="var(--md-sys-color-outline)" />
          </div>
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2.5"
            placeholder="••••••••"
            minLength={8}
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
        <p className="mt-1 text-xs text-gray-500">
          Password must be at least 8 characters long
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm New Password
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockIcon size={20} color="var(--md-sys-color-outline)" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="secondary"
          type="button"
          onClick={goBack}
          className="flex-1"
        >
          <ArrowBackIcon size={16} className="mr-2" />
          Back
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          className="flex-1"
        >
          Reset Password
        </Button>
      </div>
    </form>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email':
        return 'Enter your email address';
      case 'security':
        return 'Answer your security question';
      case 'reset':
        return 'Create new password';
      default:
        return 'Forgot Password';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'email':
        return 'We\'ll send you a security question to verify your identity';
      case 'security':
        return 'Please answer your security question to continue';
      case 'reset':
        return 'Create a new password for your account';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">CampusSync</h1>
          <h2 className="text-2xl font-semibold text-gray-900">Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            {getStepDescription()}
          </p>
        </div>
        
        <Card variant="elevated" elevation={2} className="px-6 py-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">{getStepTitle()}</h3>
          </div>
          
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'security' && renderSecurityStep()}
          {currentStep === 'reset' && renderResetStep()}
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500">
              Back to Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword; 