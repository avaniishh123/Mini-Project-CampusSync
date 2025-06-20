import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArticleIcon, 
  EventIcon, 
  WorkIcon,
  ArrowBackIcon,
  CalendarIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import { campusNewsAPI } from '../services/api';
import Button from '../components/Button';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  author?: string;
}

const AllNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  
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
        setError('Authentication required to view news');
        setLoading(false);
        return;
      }

      const response = await campusNewsAPI.getNews(token);
      
      if (response.status === 'success') {
        if (response.data && response.data.news) {
          setNewsItems(response.data.news);
          setError(null);
        } else {
          setNewsItems([]);
          setError('No news data available');
        }
      } else {
        setNewsItems([]);
        setError(response.message || 'Failed to load news');
      }
    } catch (err: any) {
      console.error('Error in fetchNewsItems:', err);
      setNewsItems([]);
      setError(err.message || 'Unknown error loading news');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'announcement':
        return <ArticleIcon size={24} color="var(--md-sys-color-primary)" />;
      case 'workshop':
        return <EventIcon size={24} color="var(--md-sys-color-primary)" />;
      case 'placement':
        return <WorkIcon size={24} color="var(--md-sys-color-primary)" />;
      default:
        return <ArticleIcon size={24} color="var(--md-sys-color-primary)" />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'announcement':
        return 'Announcement';
      case 'workshop':
        return 'Workshop';
      case 'placement':
        return 'Placement';
      default:
        return 'News';
    }
  };

  // Toggle expanded news
  const toggleExpandNews = (id: string) => {
    if (expandedNews === id) {
      setExpandedNews(null);
    } else {
      setExpandedNews(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowBackIcon size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Campus News</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-600">Loading news...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
        </div>
      ) : newsItems.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <ArticleIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No news items available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-1 rounded-full">
                      {getCategoryLabel(item.category)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</p>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg text-gray-800 mb-2">{item.title}</h3>
                
                <div className={`text-gray-600 text-sm ${expandedNews === item.id ? '' : 'line-clamp-3'}`}>
                  {item.content}
                </div>
                
                <div className="mt-4 flex items-center justify-end">
                  <Button
                    variant="text"
                    size="small"
                    className="text-primary-600"
                    onClick={() => toggleExpandNews(item.id)}
                  >
                    {expandedNews === item.id ? 'Show Less' : 'Read More'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllNewsPage;
