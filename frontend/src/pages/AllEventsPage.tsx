import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  EventIcon, 
  LocationIcon, 
  PersonIcon,
  ArrowBackIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import Button from '../components/Button';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  category: string;
  day: number;
  month: string;
  time: string;
  status: string;
}

const AllEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  
  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setEvents([]);
        setError('Authentication required to view events');
        setLoading(false);
        return;
      }

      const response = await eventsAPI.getEvents(token);
      
      if (response.status === 'success') {
        if (response.data && response.data.events) {
          setEvents(response.data.events);
          setError(null);
        } else {
          setEvents([]);
          setError('No events data available');
        }
      } else {
        setEvents([]);
        setError(response.message || 'Failed to load events');
      }
    } catch (err: any) {
      console.error('Error in fetchEvents:', err);
      setEvents([]);
      setError(err.message || 'Unknown error loading events');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'workshop':
        return 'bg-blue-100 text-blue-800';
      case 'career':
        return 'bg-green-100 text-green-800';
      case 'research':
        return 'bg-purple-100 text-purple-800';
      case 'cultural':
        return 'bg-pink-100 text-pink-800';
      case 'sports':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Toggle expanded event
  const toggleExpandEvent = (id: string) => {
    if (expandedEvent === id) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(id);
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
        <h1 className="text-2xl font-bold text-gray-800">Upcoming Events</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary-500"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <CalendarIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No upcoming events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <div 
              key={event.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex border-b border-gray-100">
                <div className="w-24 bg-secondary-50 flex flex-col items-center justify-center p-4 border-r border-gray-100">
                  <span className="text-secondary-700 text-sm font-medium">{event.month}</span>
                  <span className="text-gray-900 text-3xl font-bold">{event.day}</span>
                </div>
                <div className="flex-1 p-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(event.category)}`}>
                    {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                  </span>
                  <h3 className="font-semibold text-lg text-gray-800 mt-1">{event.title}</h3>
                </div>
              </div>
              
              <div className="p-4">
                <div className={`text-gray-600 text-sm mb-4 ${expandedEvent === event.id ? '' : 'line-clamp-2'}`}>
                  {event.description}
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <EventIcon size={16} className="mr-2 text-secondary-600" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <EventIcon size={16} className="mr-2 text-secondary-600" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center">
                    <LocationIcon size={16} className="mr-2 text-secondary-600" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center">
                    <PersonIcon size={16} className="mr-2 text-secondary-600" />
                    <span>{event.organizer}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => toggleExpandEvent(event.id)}
                  >
                    {expandedEvent === event.id ? 'Show Less' : 'Read More'}
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

export default AllEventsPage;
