import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon, 
  EventIcon, 
  EditIcon, 
  DeleteIcon, 
  AddIcon, 
  CloseIcon,
  LocationIcon,
  PersonIcon
} from '../utils/materialIcons';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import Card from './Card';
import Button from './Button';

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

const UpcomingEvents: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, getToken, user } = useAuth();
  // Admin controls are shown only to admin users
  const showAdminControls = isAdmin;
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    organizer: '',
    category: 'workshop'
  });
  
  // Debug admin status
  useEffect(() => {
    console.log('UpcomingEvents - Current user:', user?.name);
    console.log('UpcomingEvents - Admin status from context:', isAdmin);
  }, [user, isAdmin]);

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Helper function to get events from local storage
  const getEventsFromLocalStorage = () => {
    try {
      const eventsJson = localStorage.getItem('campus_events');
      if (eventsJson) {
        const events = JSON.parse(eventsJson);
        console.log('Retrieved events from local storage:', events);
        return events;
      }
    } catch (err) {
      console.error('Error reading events from local storage:', err);
    }
    return [];
  };

  // Helper function to save events to local storage
  const saveEventsToLocalStorage = (events: Event[]) => {
    try {
      localStorage.setItem('campus_events', JSON.stringify(events));
      return true;
    } catch (err) {
      console.error('Error saving events to local storage:', err);
      return false;
    }
  };

  // Fetch events from API with local storage fallback
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      // If no token, try to get events from local storage
      if (!token) {
        const localEvents = getEventsFromLocalStorage();
        if (localEvents.length > 0) {
          setEvents(localEvents);
          setError(null);
        } else {
          setEvents([]);
          setError('Please log in to view events');
        }
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching events with token:', token);
        // Try API first
        const response = await eventsAPI.getEvents(token);
        console.log('Events API response:', response);
        
        if (response.status === 'success') {
          if (response.data && response.data.events && response.data.events.length > 0) {
            console.log('Setting events from API:', response.data.events);
            // Save to local storage as a backup
            saveEventsToLocalStorage(response.data.events);
            setEvents(response.data.events);
            setError(null); // Clear any previous errors
          } else {
            // Fallback to local storage if API response has no events
            const localEvents = getEventsFromLocalStorage();
            if (localEvents.length > 0) {
              console.log('Using events from local storage as fallback');
              setEvents(localEvents);
              setError(null);
              
              // Try to sync local events to the server if user is admin
              if (localEvents.length > 0 && isAdmin) {
                console.log('Syncing local events to server...');
                // Process each local event
                for (const event of localEvents) {
                  try {
                    // Skip if the event already has an ID from the server (not a local ID)
                    if (event.id.startsWith('local_')) {
                      const eventData = {
                        title: event.title,
                        description: event.description,
                        date: event.date,
                        time: event.time,
                        location: event.location,
                        organizer: event.organizer || user?.name || 'Admin',
                        category: event.category
                      };
                      
                      await eventsAPI.addEvent(token, eventData);
                    }
                  } catch (syncErr) {
                    console.error('Error syncing local event to server:', syncErr);
                  }
                }
                
                // Refresh events from server after sync attempt
                setTimeout(() => fetchEvents(), 2000);
              }
            } else {
              setEvents([]);
              setError('No events available');
            }
          }
        } else {
          // API returned an error, try local storage
          const localEvents = getEventsFromLocalStorage();
          if (localEvents.length > 0) {
            console.log('Using events from local storage due to API error');
            setEvents(localEvents);
            setError(null);
          } else {
            setEvents([]);
            setError(response.message || 'Failed to load events');
          }
        }
      } catch (apiErr: any) {
        console.error('API error fetching events:', apiErr);
        
        // Fallback to local storage if API fails
        const localEvents = getEventsFromLocalStorage();
        if (localEvents.length > 0) {
          console.log('Using events from local storage due to API exception');
          setEvents(localEvents);
          setError(null);
        } else {
          setEvents([]);
          setError(apiErr.message || 'Error loading events');
        }
      }
    } catch (err: any) {
      console.error('Error in fetchEvents:', err);
      setEvents([]);
      setError(err.message || 'Unknown error loading events');
    } finally {
      setLoading(false);
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'workshop':
        return 'bg-primary-50 border-primary-100 text-primary-900';
      case 'career':
        return 'bg-secondary-50 border-secondary-100 text-secondary-900';
      case 'research':
        return 'bg-tertiary-50 border-tertiary-100 text-tertiary-900';
      default:
        return 'bg-primary-50 border-primary-100 text-primary-900';
    }
  };

  // Get category badge color
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'workshop':
        return 'bg-primary-500';
      case 'career':
        return 'bg-secondary-500';
      case 'research':
        return 'bg-tertiary-500';
      default:
        return 'bg-primary-500';
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

  // Format date for form input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Format time for form input
  const formatTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toTimeString().split(' ')[0].substring(0, 5);
  };

  // Parse form data to event data
  const parseFormData = () => {
    // Create a date object from the date and time inputs
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    // Format day and month
    const day = dateTime.getDate();
    const month = dateTime.toLocaleString('en-US', { month: 'short' });
    
    // Format time
    const time = dateTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    return {
      ...formData,
      date: dateTime.toISOString(),
      day,
      month,
      time
    };
  };

  // Handle add event form submission
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      // Show loading state
      setLoading(true);
      
      // Prepare the event data with proper formatting
      const eventData = parseFormData();
      console.log('Adding event with data:', eventData);
      
      // Call the API to add the event
      const response = await eventsAPI.addEvent(token, eventData);
      console.log('Add event API response:', response);
      
      if (response.status === 'success') {
        // Show success message
        alert('Event added successfully!');
        
        // Reset form and close it
        setFormData({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          organizer: '',
          category: 'workshop'
        });
        setShowAddForm(false);
        
        // If we have the event in the response, add it to the state directly
        if (response.data && response.data.event) {
          console.log('Adding new event to state:', response.data.event);
          setEvents(prevEvents => [response.data.event, ...prevEvents]);
          
          // Also save to local storage as a backup
          const updatedEvents = [response.data.event, ...events];
          saveEventsToLocalStorage(updatedEvents);
        } else {
          // If not, refresh the events from the server
          console.log('Refreshing events from server');
          await fetchEvents();
        }
      } else {
        // Show error message
        alert(response.message || 'Failed to add event');
      }
    } catch (err: any) {
      console.error('Error adding event:', err);
      alert(err.message || 'An error occurred while adding event');
      setError(err.message || 'An error occurred while adding the event');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit event form submission
  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;

    try {
      const token = getToken();
      if (!token) {
        setError('You must be logged in to edit events');
        return;
      }

      const eventData = parseFormData();
      try {
        // Try to use the API first
        const response = await eventsAPI.updateEvent(token, currentEvent.id, eventData);
        console.log('Update event API response:', response);
        
        if (response.status === 'success') {
          // Refresh events list
          fetchEvents();
          // Reset form
          setFormData({
            title: '',
            description: '',
            date: '',
            time: '',
            location: '',
            organizer: '',
            category: 'workshop'
          });
          // Close form
          setShowEditForm(false);
          setCurrentEvent(null);
        } else {
          throw new Error(response.message || 'Failed to update event');
        }
      } catch (apiErr: any) {
        console.warn('API error, using local storage instead:', apiErr);
        
        // Fallback to local storage
        const currentEvents = getEventsFromLocalStorage();
        
        // Find the event to update
        const eventIndex = currentEvents.findIndex((event: Event) => event.id === currentEvent.id);
        if (eventIndex === -1) {
          throw new Error('Event not found in local storage');
        }
        
        // Update the event
        currentEvents[eventIndex] = {
          ...eventData,
          id: currentEvent.id,
          day: new Date(eventData.date).getDate(),
          month: new Date(eventData.date).toLocaleString('en-US', { month: 'short' }),
          status: 'upcoming'
        };
        
        // Save to local storage
        if (saveEventsToLocalStorage(currentEvents)) {
          console.log('Event updated in local storage successfully');
          // Update UI with new events
          setEvents(currentEvents);
          // Reset form
          setFormData({
            title: '',
            description: '',
            date: '',
            time: '',
            location: '',
            organizer: '',
            category: 'workshop'
          });
          // Close form
          setShowEditForm(false);
          setCurrentEvent(null);
        } else {
          throw new Error('Failed to update event in local storage');
        }
      }
    } catch (err: any) {
      console.error('Error updating event:', err);
      setError(err.message || 'An error occurred while updating the event');
    }
  };

// Handle delete event
const handleDeleteEvent = async (id: string) => {
  if (!window.confirm('Are you sure you want to delete this event?')) return;

  try {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await eventsAPI.deleteEvent(token, id);
    if (response.status === 'success') {
      // Remove event from the list
      setEvents(events.filter(event => event.id !== id));
    } else {
      setError(response.message || 'Failed to delete event');
    }
  } catch (err: any) {
    console.error('Error deleting event:', err);
    setError(err.message || 'An error occurred while deleting event');
  }
};

  // Open edit form with current event data
  const openEditForm = (event: Event) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: formatDateForInput(event.date),
      time: formatTimeForInput(event.date),
      location: event.location,
      organizer: event.organizer,
      category: event.category
    });
    setShowEditForm(true);
  };

  return (
    <Card variant="elevated" elevation={2} className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-elevation-3">
      <div className="bg-gradient-to-r from-secondary-600 to-secondary-800 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">Upcoming Events</h3>
          <div className="flex items-center">
            {showAdminControls && (
              <Button 
                variant="outlined" 
                className="mr-2 bg-white text-secondary-700 hover:bg-secondary-50 border-white"
                onClick={() => setShowAddForm(true)}
              >
                <AddIcon size={16} className="mr-1" />
                Add
              </Button>
            )}
            <CalendarIcon size={20} />
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

      {/* Add Event Form */}
      {showAdminControls && showAddForm && (
        <div className="p-4 bg-secondary-50 border-b border-secondary-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-secondary-900">Add Event</h4>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setShowAddForm(false)}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleAddEvent}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                rows={3}
                required
              ></textarea>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizer</label>
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              >
                <option value="workshop">Workshop</option>
                <option value="career">Career</option>
                <option value="research">Research</option>
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
                variant="secondary"
                type="submit"
              >
                Add Event
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Event Form */}
      {showAdminControls && showEditForm && currentEvent && (
        <div className="p-4 bg-secondary-50 border-b border-secondary-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-secondary-900">Edit Event</h4>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowEditForm(false);
                setCurrentEvent(null);
              }}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleEditEvent}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                rows={3}
                required
              ></textarea>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizer</label>
              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
              >
                <option value="workshop">Workshop</option>
                <option value="career">Career</option>
                <option value="research">Research</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="text"
                type="button"
                className="mr-2"
                onClick={() => {
                  setShowEditForm(false);
                  setCurrentEvent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                type="submit"
              >
                Update Event
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No upcoming events
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {events.map(event => (
            <div key={event.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
              {/* Admin controls for each event */}
              {showAdminControls && (
                <div className="flex justify-end mb-2 space-x-2">
                  <Button 
                    variant="outlined" 
                    size="small"
                    className="text-xs"
                    onClick={() => openEditForm(event)}
                  >
                    <EditIcon size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <DeleteIcon size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              )}
              <div className="flex">
                <div className="mr-4 flex-shrink-0 text-center">
                  <div className="bg-secondary-100 rounded-t-md px-3 py-1">
                    <span className="text-secondary-700 text-sm font-medium">{event.month}</span>
                  </div>
                  <div className="bg-white border border-secondary-200 rounded-b-md px-3 py-1 shadow-sm">
                    <span className="text-gray-900 text-lg font-bold">{event.day}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-secondary-900">{event.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  <div className="flex flex-wrap items-center mt-2 text-xs text-gray-500">
                    <span className="flex items-center mr-3">
                      <EventIcon size={12} className="mr-1" />
                      {event.time}
                    </span>
                    <span className="flex items-center mr-3">
                      <LocationIcon size={12} className="mr-1" />
                      {event.location}
                    </span>
                    <span className="flex items-center">
                      <PersonIcon size={12} className="mr-1" />
                      {event.organizer}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-gray-50 border-t border-gray-100">
        <button 
          onClick={() => navigate('/campus-events')} 
          className="w-full text-center text-secondary-600 font-medium py-1.5 hover:bg-secondary-50 rounded-full transition-colors text-sm flex items-center justify-center"
        >
          <CalendarIcon size={16} className="mr-1" />
          <span>View all events</span>
        </button>
      </div>
    </Card>
  );
};

export default UpcomingEvents;
