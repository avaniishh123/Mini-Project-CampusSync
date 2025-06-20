import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArticleIcon, 
  EventIcon, 
  WorkIcon,
  EditIcon, 
  DeleteIcon, 
  AddIcon, 
  CloseIcon,
  ArrowForwardIcon,
  NotificationsIcon,
  FilterIcon,
  SmileyIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import Card from './Card';
import Button from './Button';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  author?: string; // Make author optional
}

const CampusNews: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, getToken, user } = useAuth();
  // Admin controls are shown only to admin users
  const showAdminControls = isAdmin;
  
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentNewsItem, setCurrentNewsItem] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'announcement'
  });
  
  // Debug admin status
  useEffect(() => {
    console.log('CampusNews - Current user:', user?.name);
    console.log('CampusNews - Admin status from context:', isAdmin);
  }, [user, isAdmin]);

  // Fetch news items on component mount
  useEffect(() => {
    fetchNewsItems();
  }, []);

  // Fetch news items from API
  const fetchNewsItems = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setNewsItems([]);
        setError(null); // Clear any previous errors
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching news items with token:', token);
        const response = await apiService.campusNews.getNews(token);
        console.log('News API response:', response);
        
        if (response.status === 'success') {
          if (response.data && response.data.news) {
            console.log('Setting news items:', response.data.news);
            setNewsItems(response.data.news);
            setError(null); // Clear any previous errors
          } else {
            console.warn('API response missing news data:', response);
            setNewsItems([]);
            setError('No news data available');
          }
        } else {
          console.warn('API returned error:', response.message);
          setNewsItems([]);
          setError(response.message || 'Failed to load news');
        }
      } catch (apiErr: any) {
        console.error('API error fetching news:', apiErr);
        setNewsItems([]);
        setError(apiErr.message || 'Error loading news');
      }
    } catch (err: any) {
      console.error('Error in fetchNewsItems:', err);
      setNewsItems([]);
      setError(err.message || 'Unknown error loading news');
    } finally {
      setLoading(false);
    }
  };
  
  // No additional effects needed

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Parse the date string - the server sends dates in IST
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      // Get current time
      const now = new Date();
      
      // Calculate the difference in milliseconds
      const diffMs = now.getTime() - date.getTime();
      
      // If the difference is negative (future date) or very small, show "Just now"
      if (diffMs < 0 || diffMs < 30000) { // less than 30 seconds
        return 'Just now';
      }
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      // Simple time formatting
      if (diffSeconds < 60) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        // For older dates, show the full date and time
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Just now';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'announcement':
        return <NotificationsIcon size={16} color="#4f46e5" />;
      case 'event':
        return <EventIcon size={16} color="#4f46e5" />;
      case 'job':
        return <WorkIcon size={16} color="#4f46e5" />;
      default:
        return <ArticleIcon size={16} color="#4f46e5" />;
    }
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission for adding news
  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      // Show loading state
      setLoading(true);
      
      // Prepare the news data with proper fields
      const newsData = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        author: user?.name || 'Admin'
      };
      
      console.log('Adding news with data:', newsData);
      
      // Call the API to add the news
      const response = await apiService.campusNews.addNews(token, newsData);
      console.log('Add news API response:', response);
      
      if (response.status === 'success') {
        // Show success message
        alert('News added successfully!');
        
        // Reset form and close it
        setFormData({ title: '', content: '', category: 'announcement' });
        setShowAddForm(false);
        
        // If we have the news item in the response, add it to the state directly
        if (response.data && response.data.news) {
          console.log('Adding new news item to state:', response.data.news);
          setNewsItems(prevItems => [response.data.news, ...prevItems]);
        } else {
          // If not, refresh the news items from the server
          console.log('Refreshing news items from server');
          await fetchNewsItems();
        }
      } else {
        // Show error message
        alert(response.message || 'Failed to add news');
      }
    } catch (err: any) {
      console.error('Error adding news:', err);
      alert(err.message || 'An error occurred while adding news');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit news form submission
  const handleEditNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNewsItem) return;

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await apiService.campusNews.updateNews(token, currentNewsItem.id, formData);
      if (response.status === 'success') {
        // Update news item in the list
        setNewsItems(newsItems.map(item => 
          item.id === currentNewsItem.id ? response.data.news : item
        ));
        // Reset form and hide it
        setFormData({
          title: '',
          content: '',
          category: 'announcement'
        });
        setCurrentNewsItem(null);
        setShowEditForm(false);
      } else {
        setError(response.message || 'Failed to update news');
      }
    } catch (err: any) {
      console.error('Error updating news:', err);
      setError(err.message || 'An error occurred while updating news');
    }
  };

  // Handle delete news
  const handleDeleteNews = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this news item?')) return;

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await apiService.campusNews.deleteNews(token, id);
      if (response.status === 'success') {
        // Remove news item from the list
        setNewsItems(newsItems.filter(item => item.id !== id));
      } else {
        setError(response.message || 'Failed to delete news');
      }
    } catch (err: any) {
      console.error('Error deleting news:', err);
      setError(err.message || 'An error occurred while deleting news');
    }
  };

  // Open edit form with current news item data
  const openEditForm = (newsItem: NewsItem) => {
    setCurrentNewsItem(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      category: newsItem.category
    });
    setShowEditForm(true);
  };

  return (
    <Card variant="elevated" elevation={2} className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-elevation-3">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">Campus News</h3>
          <div className="flex items-center">
            {showAdminControls && (
              <Button 
                variant="outlined" 
                className="mr-2 bg-white text-primary-700 hover:bg-primary-50 border-white"
                onClick={() => setShowAddForm(true)}
              >
                <AddIcon size={16} className="mr-1" />
                Add
              </Button>
            )}
            <NotificationsIcon size={20} />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border-b border-red-100">
          {error}
          <button 
            className="ml-2 text-red-500 hover:text-red-700"
            onClick={() => setError(null)}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {/* Admin controls moved to header */}

      {/* Add News Form */}
      {showAdminControls && showAddForm && (
        <div className="p-4 bg-primary-50 border-b border-primary-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-primary-900">Add News</h4>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setShowAddForm(false)}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleAddNews}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                required
              ></textarea>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="announcement">Announcement</option>
                <option value="workshop">Workshop</option>
                <option value="placement">Placement</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="text"
                type="button"
                className="mr-2"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Add News
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit News Form */}
      {showAdminControls && showEditForm && currentNewsItem && (
        <div className="p-4 bg-primary-50 border-b border-primary-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-primary-900">Edit News</h4>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowEditForm(false);
                setCurrentNewsItem(null);
              }}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleEditNews}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                required
              ></textarea>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="announcement">Announcement</option>
                <option value="workshop">Workshop</option>
                <option value="placement">Placement</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="text"
                type="button"
                className="mr-2"
                onClick={() => {
                  setShowEditForm(false);
                  setCurrentNewsItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Update News
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading news...</p>
        </div>
      ) : newsItems.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No news items available
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {newsItems.map(item => (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
              {/* Admin controls for each news item */}
              {showAdminControls && (
                <div className="flex justify-end mb-2 space-x-2">
                  <Button 
                    variant="outlined" 
                    size="small"
                    className="text-xs"
                    onClick={() => openEditForm(item)}
                  >
                    <EditIcon size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleDeleteNews(item.id)}
                  >
                    <DeleteIcon size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              )}
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3 shadow-sm">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-primary-900">{item.title}</h4>
                  </div>
                  {isAdmin && (
                    <p className="text-sm text-gray-600 mt-1 mb-2">{item.content}</p>
                  )}
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
                {/* Edit/Delete buttons moved to the top of the item */}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-gray-50 border-t border-gray-100">
        <button 
          onClick={() => navigate('/campus-news')} 
          className="w-full text-center text-primary-600 font-medium py-1.5 hover:bg-primary-50 rounded-full transition-colors text-sm flex items-center justify-center"
        >
          <span>Show more</span>
          <ArrowForwardIcon size={16} className="ml-1" />
        </button>
      </div>
    </Card>
  );
};

export default CampusNews;
