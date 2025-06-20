import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { 
  HomeIcon, 
  SchoolIcon, 
  WorkIcon, 
  PersonIcon,
  MenuIcon,
  CloseIcon
} from '../utils/materialIcons';
import ProfileDropdown from '../components/ProfileDropdown';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Home', href: '/feed', icon: HomeIcon, color: 'var(--md-sys-color-primary)' },
  { name: 'Resources', href: '/resources', icon: SchoolIcon, color: 'var(--md-sys-color-secondary)' },
  { name: 'Opportunities', href: '/opportunities', icon: WorkIcon, color: 'var(--md-sys-color-tertiary)' },
  { name: 'Profile', href: '/profile', icon: PersonIcon, color: 'var(--md-sys-color-primary-container)' },
];

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileProfileDropdownOpen, setMobileProfileDropdownOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Close mobile dropdown on outside click
  useEffect(() => {
    if (!mobileProfileDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      const dropdown = document.getElementById('mobile-profile-dropdown');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setMobileProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileProfileDropdownOpen]);

  // For debugging
  console.log('MainLayout - User:', user);
  console.log('MainLayout - isAuthenticated:', isAuthenticated);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#f3f4f6' }}
    >
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-2xl font-bold text-primary-600">CampusSync</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
              <CloseIcon size={24} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium ${location.pathname === item.href ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
              >
                <item.icon size={24} className="mr-3" color={location.pathname === item.href ? 'var(--md-sys-color-primary)' : item.color} />
                <span>{item.name}</span>
              </Link>
            ))}
            {/* Mobile-only extra buttons */}
            <div className="block lg:hidden mt-4 space-y-2">
              <Link to="/campus-news" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 bg-gray-100 rounded">
                <span className="mr-3">📰</span> Campus News
              </Link>
              <Link to="/events" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 bg-gray-100 rounded">
                <span className="mr-3">📅</span> Upcoming Events
              </Link>
              <button
                type="button"
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded"
                onClick={() => {
                  setSidebarOpen(false);
                  setShowCreatePostModal(true);
                }}
              >
                <span className="mr-3">➕</span> Create a Post
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:fixed lg:top-0 lg:left-0 lg:right-0 lg:z-40 lg:flex lg:h-16 lg:bg-white lg:shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 w-full flex items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold text-primary-600">CampusSync</span>
          </div>
          
          {/* Right side - Navigation icons and profile */}
          <div className="flex items-center space-x-8">
            {navigation.slice(0, 3).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center"
              >
                <item.icon 
                  className={`h-6 w-6 ${location.pathname === item.href ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`} 
                  color={location.pathname === item.href ? item.color : undefined} 
                />
                <span className="mt-1 text-xs font-medium text-gray-600">{item.name}</span>
              </Link>
            ))}
            <div className="border-l pl-6 border-gray-200">
              {isAuthenticated ? (
                <ProfileDropdown user={user} />
              ) : (
                <Link to="/login" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:pt-16">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-10 bg-white shadow lg:hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 w-full flex h-16 items-center">
            <button onClick={() => setSidebarOpen(true)} className="mr-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
              <span className="sr-only">Open sidebar</span>
              <MenuIcon size={24} />
            </button>
            <div className="flex flex-1 items-center justify-center sm:justify-start">
              <span className="text-xl font-semibold text-primary-600">CampusSync</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 w-full">
              {React.cloneElement(children as React.ReactElement<any>, {
                showCreatePostModal,
                setShowCreatePostModal
              })}
            </div>
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2">
          <div className="flex justify-around">
            {navigation.filter(item => item.name !== 'Profile').map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center px-2"
              >
                <item.icon 
                  size={24}
                  color={location.pathname === item.href ? item.color : 'var(--md-sys-color-outline)'}
                />
                <span className="mt-1 text-xs font-medium text-gray-600">{item.name}</span>
              </Link>
            ))}
            {/* Only one Profile icon, with dropdown for authenticated users */}
            {isAuthenticated ? (
              <div className="relative flex flex-col items-center px-2">
                <button
                  className="flex flex-col items-center focus:outline-none"
                  onClick={() => setMobileProfileDropdownOpen((open) => !open)}
                  aria-label="Profile menu"
                >
                  <PersonIcon size={24} color="var(--md-sys-color-primary-container)" />
                  <span className="mt-1 text-xs font-medium text-gray-600">Profile</span>
                </button>
                {mobileProfileDropdownOpen && (
                  <div
                    id="mobile-profile-dropdown"
                    className="absolute bottom-12 mb-2 left-1/2 -translate-x-1/2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fade-in flex flex-col"
                    style={{ minWidth: '10rem' }}
                  >
                    <button
                      onClick={() => {
                        setMobileProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg className="mr-3" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.94-2.06a8 8 0 0 0 0-3.88l2.12-1.65a1 1 0 0 0 .21-1.32l-2-3.46a1 1 0 0 0-1.25-.45l-2.49 1a7.96 7.96 0 0 0-2.11-1.22l-.38-2.65A1 1 0 0 0 13 2h-4a1 1 0 0 0-1 .84l-.38 2.65a7.96 7.96 0 0 0-2.11 1.22l-2.49-1a1 1 0 0 0-1.25.45l-2 3.46a1 1 0 0 0 .21 1.32l2.12 1.65a8 8 0 0 0 0 3.88l-2.12 1.65a1 1 0 0 0-.21 1.32l2 3.46a1 1 0 0 0 1.25.45l2.49-1c.66.5 1.37.92 2.11 1.22l.38 2.65A1 1 0 0 0 9 22h4a1 1 0 0 0 1-.84l.38-2.65a7.96 7.96 0 0 0 2.11-1.22l2.49 1a1 1 0 0 0 1.25-.45l2-3.46a1 1 0 0 0-.21-1.32l-2.12-1.65z"/></svg>
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setMobileProfileDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg className="mr-3" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/></svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex flex-col items-center px-2">
                <PersonIcon size={24} color="var(--md-sys-color-outline)" />
                <span className="mt-1 text-xs font-medium text-gray-600">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
