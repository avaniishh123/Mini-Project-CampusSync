import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PersonIcon, 
  SettingsIcon, 
  LogoutIcon,
  CameraIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  profile_picture: string | null;
  background_image?: string | null;
  university?: string;
}

interface ProfileDropdownProps {
  user: User | null;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { logout, updateUserData, getToken } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // Use the logout function from AuthContext
    logout();
    // Redirect to login page
    navigate('/login');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    console.log('Selected file:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    // Check if the file is an image
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a simple form with the file
      const formData = new FormData();
      formData.append('profile_image', file);
      
      // Get the authentication token
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      
      // Use XMLHttpRequest for more control over the upload process
      const xhr = new XMLHttpRequest();
      
      // Set up a promise to handle the async operation
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              reject(new Error(`Server returned status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error occurred'));
        };
      });
      
      // Open and send the request
      xhr.open('POST', `http://localhost:5000/api/users/${user.id}/profile-image`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
      // Wait for the upload to complete
      const result = await uploadPromise as any;
      
      console.log('Upload response:', result);
      
      if (result.status === 'success' && result.data && result.data.profile_picture) {
        console.log('Profile image uploaded successfully:', result.data.profile_picture);
        
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = `?t=${new Date().getTime()}`;
        const profilePictureUrl = `${result.data.profile_picture}${cacheBuster}`;
        
        // Update the user data with the new profile picture URL
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
        
        // Force a hard reload to ensure all images are updated
        window.location.href = window.location.href;
      } else {
        throw new Error(result.message || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Close dropdown after successful upload
      setIsOpen(false);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!user) {
    return (
      <button 
        onClick={() => navigate('/login')}
        className="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600"
      >
        <PersonIcon size={24} className="mr-1" />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none"
      >
        <div className="flex items-center">
          {user && user.profile_picture ? (
            <img
              src={`${user.profile_picture}?t=${new Date().getTime()}`}
              alt={user?.name || "Profile"}
              className="h-8 w-8 rounded-full object-cover border-2 border-white shadow-sm"
              style={{ minWidth: '2rem' }}
              onError={(e) => {
                console.log('Profile image failed to load:', user?.profile_picture);
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "U")}&background=random&color=fff&size=150`;
              }}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm" style={{ minWidth: '2rem' }}>
              {(user?.name && user.name.charAt(0).toUpperCase()) || "U"}
            </div>
          )}
          <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
            {(user?.name ? user.name.split(' ')[0] : "User")}
          </span>
        </div>
      </button>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fade-in">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center min-w-0">
              <div className="relative mr-3">
                <img 
                  src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=150`} 
                  alt={user.name} 
                  className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                  style={{ minWidth: '3rem' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=150`;
                  }}
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  className="absolute bottom-0 right-0 bg-primary-500 text-white p-1 rounded-full hover:bg-primary-600 transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CameraIcon size={12} />
                  )}
                </button>
              </div>
              <div className="min-w-0">
  <p className="text-sm font-medium text-gray-900 truncate" title={user.name}>{user.name}</p>
</div>
            </div>
            
            {/* Profile option removed as requested */}
            
            {/* Profile picture upload option removed as it's available in Settings */}
            
            <Link
              to="/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <SettingsIcon size={16} className="mr-3 text-gray-500" />
              Settings
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogoutIcon size={16} className="mr-3 text-red-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
