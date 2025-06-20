import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PersonIcon, 
  EmailIcon, 
  SchoolIcon,
  LockIcon,
  CameraIcon,
  EditIcon,
  DeleteIcon,
  ImageIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

const Settings: React.FC = () => {
  const { user, updateUserData, getToken, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    college: user?.college || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  

  
  // Fetch latest user profile from backend on mount, and update AuthContext and form data
useEffect(() => {
  const fetchProfile = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const token = getToken();
      if (!token) return;
      const response = await userAPI.getProfile(token, user.id);
      if (response && response.id) {
        // Update AuthContext with latest user data
        updateUserData(response);
        // Update form data
        setFormData(prev => ({
          ...prev,
          name: response.name || prev.name,
          email: response.email || prev.email,
          college: response.college || prev.college
        }));
      }
    } catch (err) {
      // fallback: keep local user
    }
  };
  fetchProfile();
  // eslint-disable-next-line
}, []);

// Update form data when user data changes
useEffect(() => {
  if (user) {
    setFormData(prev => ({
      ...prev,
      name: user.name || prev.name,
      email: user.email || prev.email,
      college: user.college || prev.college
    }));
  }
}, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Validate password if changing
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to set a new password');
        return;
      }
      
      if (formData.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }
    
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      
      // Prepare update data
      const updateData: any = {
        name: formData.name,
        college: formData.college
      };
      
      // Only include password fields if changing password
      if (formData.newPassword) {
        updateData.current_password = formData.currentPassword;
        updateData.new_password = formData.newPassword;
      }
      
      // Call API to update user profile
      const response = await userAPI.updateProfile(token, updateData);
      
      if (response.status === 'success') {
        // Update local user data with the response data
        const updatedUserData = {
          ...user!,
          name: response.data?.name || formData.name,
          college: response.data?.college || formData.college
        };
        
        // Update the user data in AuthContext
        updateUserData(updatedUserData);
        
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An error occurred while updating your profile');
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check if the file is an image
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Create a form with the file
      const formData = new FormData();
      formData.append('profile_image', file);
      
      // Get the authentication token
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      
      // Call API to upload profile image
      const response = await userAPI.uploadProfileImage(token, formData, user.id);
      
      if (response.status === 'success' && response.data && response.data.profile_picture) {
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = `?t=${new Date().getTime()}`;
        const profilePictureUrl = `${response.data.profile_picture}${cacheBuster}`;
        
        // Update local user data with new profile picture URL
        updateUserData({
          ...user,
          profile_picture: profilePictureUrl
        });
        
        // Update localStorage directly to ensure consistency
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.profile_picture = profilePictureUrl;
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('Updated profile picture in localStorage');
          }
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        
        setSuccess('Profile picture updated successfully');
      } else {
        setError(response.message || 'Failed to upload profile picture');
      }
    } catch (err: any) {
      console.error('Error uploading profile picture:', err);
      setError(err.message || 'An error occurred while uploading your profile picture');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      
      // Call API to delete account
      const response = await userAPI.deleteAccount(token);
      
      if (response.status === 'success') {
        // Log out the user
        logout();
        // Redirect to login page
        navigate('/login');
      } else {
        setError(response.message || 'Failed to delete account');
        setIsDeleting(false);
      }
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'An error occurred while deleting your account');
      setIsDeleting(false);
    }
  };
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Picture Card */}
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
            {/* Profile Picture */}
            <div className="relative w-40 h-40">
              <img
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`}
                alt="Profile"
                className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
                }}
              />
              <button
                type="button"
                className="absolute bottom-3 right-3 bg-white border border-gray-300 rounded-full p-2.5 shadow-lg hover:bg-gray-50 focus:outline-none transition-colors duration-200"
                onClick={triggerFileInput}
                title="Change Profile Picture"
                style={{ zIndex: 2 }}
                disabled={isUploading}
              >
                <CameraIcon size={24} className="text-gray-500" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </Card>

        {/* Profile Information Card */}
        <Card className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            {!isEditing && (
              <Button
                variant="text"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PersonIcon size={20} color="var(--md-sys-color-outline)" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md bg-gray-50 disabled:opacity-75"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EmailIcon size={20} color="var(--md-sys-color-outline)" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md bg-gray-50 disabled:opacity-75"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">
                  College
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SchoolIcon size={20} color="var(--md-sys-color-outline)" />
                  </div>
                  {!isEditing ? (
                    <div className="pl-10 py-2.5 text-gray-700 bg-gray-50 rounded-md border border-gray-300">
                      {user.college ? user.college : <span className="text-gray-400">Not specified</span>}
                    </div>
                  ) : (
                    <input
                      id="college"
                      name="college"
                      type="text"
                      value={formData.college}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md bg-gray-50 disabled:opacity-75"
                    />
                  )}
                </div>
              </div>
              
              {isEditing && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-2">Change Password</h3>
                    <p className="text-sm text-gray-500 mb-4">Leave blank if you don't want to change your password</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockIcon size={20} color="var(--md-sys-color-outline)" />
                          </div>
                          <input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockIcon size={20} color="var(--md-sys-color-outline)" />
                          </div>
                          <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockIcon size={20} color="var(--md-sys-color-outline)" />
                          </div>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-2.5 sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="text"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form to original values
                        setFormData({
                          name: user.name || '',
                          email: user.email || '',
                          college: user.college || '',
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      variant="primary"
                      type="submit"
                    >
                      <EditIcon size={18} className="mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          </form>
        </Card>
        
        {/* Danger Zone Card */}
        <Card className="p-6 md:col-span-3 border border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          <Button
            variant="text"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="text-red-600 hover:bg-red-50"
          >
            <DeleteIcon size={18} className="mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
