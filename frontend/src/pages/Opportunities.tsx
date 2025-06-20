import React, { useState, useEffect } from 'react';
import { SearchIcon, BriefcaseIcon, FilterIcon, LocationMarkerIcon, CurrencyRupeeIcon } from '@heroicons/react/outline';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Chip from '../components/Chip';
import { useAuth } from '../context/AuthContext';
import { opportunitiesAPI } from '../services/api';

interface Opportunity {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: 'internship' | 'freelance' | 'job';
  duration: string;
  stipend: string;
  description: string;
  skills: string[];
  created_at: string;
  deadline: string;
  application_form_url?: string;
  application_instructions?: string;
  poster?: {
    id: string;
    name: string;
    username: string;
    profile_picture: string;
  };
  is_verified: boolean;
  is_active: boolean;
}

const Opportunities: React.FC = () => {
  const { getToken, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'internship' | 'freelance'>('all');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  
  // Form state for new opportunity
  const [opportunityForm, setOpportunityForm] = useState({
    title: '',
    company: '',
    email: '', // Contact email for the opportunity
    location: '',
    type: 'internship' as 'internship' | 'freelance' | 'part_time' | 'full_time' | 'project',
    domain: '', // Required field for the opportunity domain/category
    is_paid: true, // Whether the opportunity is paid or not
    duration: '',
    stipend: '',
    description: '',
    skills: [] as string[],
    deadline: '',
    application_form_url: '' // Google Form URL for applications
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [currentSkill, setCurrentSkill] = useState('');

  // Fetch opportunities from the backend
  const fetchOpportunities = async () => {
    // Check if we're already loading to prevent duplicate requests
    if (loading) {
      console.log('Already loading opportunities, skipping fetch');
      return;
    }
    
    // Add a console log to track API calls
    console.log('Fetching opportunities with filter:', selectedType);
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      if (!token) {
        setError('You must be logged in to view opportunities');
        setLoading(false);
        return;
      }
      
      const type = selectedType !== 'all' ? selectedType : undefined;
      const response = await opportunitiesAPI.getOpportunities(token, type);
      
      if (response.status === 'success') {
        console.log(`Fetched ${response.data.opportunities.length} opportunities successfully`);
        // Map compensation to stipend for display
        const apiOpportunities = response.data.opportunities.map((opp: any) => ({
          ...opp,
          stipend: opp.stipend || opp.compensation || '',
        }));
        setOpportunities(apiOpportunities);
      } else {
        setError('Failed to fetch opportunities');
      }
    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
      setError(err.message || 'An error occurred while fetching opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Delete an opportunity
  const deleteOpportunity = async (opportunityId: string) => {
    // Use window.confirm to avoid ESLint error
    if (!window.confirm('Are you sure you want to delete this opportunity?')) {
      return;
    }
    
    try {
      const token = getToken();
      if (!token) {
        setError('You must be logged in to delete opportunities');
        return;
      }
      
      // Call the API to delete the opportunity
      const response = await fetch(`http://localhost:5000/api/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Remove the deleted opportunity from the state
        setOpportunities(opportunities.filter(opp => opp._id !== opportunityId));
        alert('Opportunity deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete opportunity');
      }
    } catch (err: any) {
      console.error('Error deleting opportunity:', err);
      alert('An error occurred while deleting the opportunity');
    }
  };

  // Email verification functionality has been removed for simplicity
  
  // Function to add a skill to the skills array
  const addSkill = () => {
    if (!currentSkill.trim()) return;
    
    if (!opportunityForm.skills.includes(currentSkill.trim())) {
      setOpportunityForm({
        ...opportunityForm,
        skills: [...opportunityForm.skills, currentSkill.trim()]
      });
    }
    
    setCurrentSkill('');
  };
  
  // Function to remove a skill from the skills array
  const removeSkill = (skillToRemove: string) => {
    setOpportunityForm({
      ...opportunityForm,
      skills: opportunityForm.skills.filter(skill => skill !== skillToRemove)
    });
  };
  
  // Function to handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOpportunityForm({
      ...opportunityForm,
      [name]: value
    });
  };
  
  // Function to submit the opportunity
  const submitOpportunity = async () => {
    setFormError(null);
    setFormSuccess(null);
    
    // Validate required fields
    const requiredFields = [
      { field: 'title', label: 'Title' },
      { field: 'company', label: 'Company' },
      { field: 'location', label: 'Location' },
      { field: 'description', label: 'Description' },
      { field: 'deadline', label: 'Deadline' },
      { field: 'domain', label: 'Domain' }
    ];
    
    const missingFields = requiredFields.filter(({ field }) => !opportunityForm[field as keyof typeof opportunityForm]);
    
    if (missingFields.length > 0) {
      setFormError(`Please fill in the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    // Validate email format if provided
    if (opportunityForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(opportunityForm.email)) {
        setFormError('Please enter a valid email address');
        return;
      }
    }
    
    // Validate application form URL if provided
    if (opportunityForm.application_form_url) {
      try {
        new URL(opportunityForm.application_form_url);
      } catch (e) {
        setFormError('Please enter a valid URL for the application form');
        return;
      }
    }
    
    try {
      const token = getToken();
      if (!token) {
        setFormError('You must be logged in to post an opportunity');
        return;
      }
      
      // Validate and clean the application form URL
      let cleanedUrl = opportunityForm.application_form_url || '';
      
      // Ensure URL starts with http:// or https://
      if (cleanedUrl && !cleanedUrl.match(/^https?:\/\//)) {
        cleanedUrl = 'https://' + cleanedUrl;
      }
      
      // Prepare the opportunity data
      const opportunityData = {
        title: opportunityForm.title,
        company: opportunityForm.company,
        location: opportunityForm.location,
        type: opportunityForm.type,
        domain: opportunityForm.domain || 'Other', // Provide default value
        is_paid: opportunityForm.is_paid,
        compensation: opportunityForm.stipend, // Map stipend to compensation
        description: opportunityForm.description,
        skills_required: opportunityForm.skills, // Map skills to skills_required
        deadline: opportunityForm.deadline,
        remote: opportunityForm.location.toLowerCase().includes('remote'),
        application_form_url: cleanedUrl, // Store the cleaned URL directly
        application_instructions: cleanedUrl ? 
          `Apply using this form: ${cleanedUrl}` : undefined
      };
      
      console.log('Cleaned application URL:', cleanedUrl);
      
      console.log('Submitting opportunity data:', opportunityData);
      
      // Call the API to post the opportunity
      const response = await fetch('http://localhost:5000/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(opportunityData),
      });
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (response.ok) {
        // Reset the form and close the modal
        setOpportunityForm({
          title: '',
          company: '',
          email: '',
          location: '',
          type: 'internship' as 'internship' | 'freelance' | 'part_time' | 'full_time' | 'project',
          domain: '',
          is_paid: true,
          duration: '',
          stipend: '',
          description: '',
          skills: [] as string[],
          deadline: '',
          application_form_url: ''
        });
        
        setShowPostModal(false);
        setFormSuccess('Opportunity posted successfully!');
        
        // Refresh the opportunities list
        fetchOpportunities();
        
        // Show success message
        alert('Opportunity posted successfully!');
      } else {
        setFormError(data.message || 'Failed to post opportunity');
      }
    } catch (err: any) {
      console.error('Error posting opportunity:', err);
      setFormError('An error occurred while posting the opportunity: ' + (err.message || ''));
    }
  };

  // Use a ref to track if we've already fetched data
  const hasFetchedRef = React.useRef(false);

  // Fetch opportunities only once when component mounts
  useEffect(() => {
    // Only fetch if we haven't already
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchOpportunities();
    }
    
    // Cleanup function
    return () => {
      // Reset the ref when component unmounts
      hasFetchedRef.current = false;
    };
  }, []); // Empty dependency array means this only runs once on mount
  
  // Separate effect to handle filter changes
  useEffect(() => {
    // Skip the initial mount since we already fetched data
    if (hasFetchedRef.current) {
      fetchOpportunities();
    }
  }, [selectedType]); // Only refetch when selectedType changes

  // Filter opportunities based on search query
  const filteredOpportunities = opportunities.filter(opportunity => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (opportunity.title?.toLowerCase() || '').includes(query) ||
      (opportunity.company?.toLowerCase() || '').includes(query) ||
      (opportunity.description?.toLowerCase() || '').includes(query) ||
      (opportunity.skills || []).some(skill => (skill?.toLowerCase() || '').includes(query))
    );
  });

  // Fallback dummy opportunities for development
  const dummyOpportunities: Opportunity[] = [
    {
      _id: '1',
      title: 'Frontend Developer Intern',
      company: 'TechCorp Solutions',
      location: 'Remote',
      type: 'internship',
      duration: '6 months',
      stipend: '15000/month',
      description: 'Looking for a passionate frontend developer intern with knowledge of React and modern web technologies.',
      skills: ['React', 'JavaScript', 'HTML', 'CSS'],
      created_at: new Date().toISOString(),
      deadline: '2023-06-15',
      is_verified: true,
      is_active: true,
      poster: {
        id: '1',
        name: 'Recruiter Name',
        username: 'recruiter1',
        profile_picture: ''
      }
    },
    {
      _id: '2',
      title: 'UI/UX Design Project',
      company: 'DesignHub',
      location: 'Hybrid',
      type: 'freelance',
      duration: '2 months',
      stipend: '30000 total',
      description: 'Need a UI/UX designer for redesigning our mobile application interface.',
      skills: ['Figma', 'UI Design', 'Mobile Design'],
      created_at: new Date().toISOString(),
      deadline: '2023-06-10',
      is_verified: false,
      is_active: true,
      poster: {
        id: '2',
        name: 'Design Manager',
        username: 'designer1',
        profile_picture: ''
      }
    }
  ];

  return (
    <div className="space-y-8">
      {/* Search and Filter Section */}
      <Card className="p-8 w-full" variant="elevated" elevation={1} noHover={true}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="flex-1">
              <div className="relative rounded-md">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5"
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <button 
                className="btn-secondary flex items-center"
                onClick={() => fetchOpportunities()}
              >
                <FilterIcon className="h-5 w-5 mr-2" />
                Refresh
              </button>
              <button 
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 transition-colors flex items-center"
                onClick={() => setShowPostModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Post Opportunity
              </button>
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            <Button
              onClick={() => setSelectedType('all')}
              variant={selectedType === 'all' ? 'tonal' : 'text'}
              size="small"
            >
              All Opportunities
            </Button>
            <Button
              onClick={() => setSelectedType('internship')}
              variant={selectedType === 'internship' ? 'tonal' : 'text'}
              size="small"
            >
              Internships
            </Button>
            <Button
              onClick={() => setSelectedType('freelance')}
              variant={selectedType === 'freelance' ? 'tonal' : 'text'}
              size="small"
            >
              Freelance Projects
            </Button>
          </div>
        </div>
      </Card>

      {/* Opportunities List */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-500">Loading opportunities...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              <p>{error}</p>
            </div>
            <button 
              className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
              onClick={() => fetchOpportunities()}
            >
              Try Again
            </button>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-gray-500 mb-4">No opportunities found.</p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mb-4">Try a different search term or category.</p>
            )}
            <button 
              className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
              }}
            >
              View All Opportunities
            </button>
          </div>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <Card key={opportunity._id} variant="elevated" elevation={1} className="overflow-hidden">
              <div className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <BriefcaseIcon className="h-12 w-12 text-primary-500" />
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{opportunity.title}</h3>
                      <p className="text-base text-gray-600">{opportunity.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      opportunity.type === 'internship'
                        ? 'bg-green-100 text-green-800'
                        : opportunity.type === 'freelance'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {opportunity.type === 'internship' ? 'Internship' : 
                       opportunity.type === 'freelance' ? 'Freelance' : 'Job'}
                    </span>
                    {opportunity.is_verified && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600">{opportunity.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {opportunity.skills && opportunity.skills.map((skill) => (
                      <span key={skill} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <LocationMarkerIcon className="h-5 w-5 mr-2" />
                    {opportunity.location}
                  </div>
                  <div className="flex items-center">
                    <CurrencyRupeeIcon className="h-5 w-5 mr-2" />
                    {opportunity.stipend && opportunity.stipend.trim() !== '' ? opportunity.stipend : 'Not specified'}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">Posted {opportunity.created_at ? new Date(opportunity.created_at).toLocaleDateString() : 'Unknown'}</span>
                    <span className="mx-2">•</span>
                    <span className="text-xs text-gray-500">Deadline: {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Not specified'}</span>
                  </div>
                  <div className="flex space-x-2">
                    {/* Delete button for poster */}
                    {user && opportunity.poster && (user.id === opportunity.poster.id) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
                          try {
                            const token = getToken();
                            if (!token) {
                              alert('You must be logged in to delete this opportunity.');
                              return;
                            }
                            const response = await opportunitiesAPI.deleteOpportunity(token, opportunity._id);
                            if (response.status === 'success') {
                              setOpportunities(prev => prev.filter(o => o._id !== opportunity._id));
                            } else {
                              alert(response.message || 'Failed to delete opportunity');
                            }
                          } catch (err) {
                            alert('An error occurred while deleting the opportunity');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                    <Button 
                      variant="primary" 
                      size="medium"
                      onClick={(e) => {
                        // Prevent event bubbling
                        e.stopPropagation();
                        e.preventDefault();
                        
                        console.log('Apply Now clicked for opportunity:', opportunity);
                        
                        // Force URL to be treated as a string
                        const applicationUrl = String(opportunity.application_form_url || '');
                        
                        console.log('Application URL found:', applicationUrl);
                        
                        if (applicationUrl && applicationUrl.trim() !== '') {
                          // Open in a new tab with noopener for security
                          const newWindow = window.open(applicationUrl, '_blank', 'noopener,noreferrer');
                          
                          // Fallback if window.open is blocked
                          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            alert('Pop-up blocked! Please allow pop-ups for this site to open the application form.');
                            // Provide direct link as fallback
                            console.log('Direct application link:', applicationUrl);
                          }
                        } else {
                          alert('Application form is not available for this opportunity. Please contact the poster directly.');
                        }
                      }}
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Post Opportunity Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Post a New Opportunity</h2>
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {formSuccess}
                </div>
              )}

              <div className="space-y-4">
                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    name="email"
                    value={opportunityForm.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This email will be used for applicants to contact you about this opportunity.
                  </p>
                </div>

                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={opportunityForm.title}
                    onChange={handleInputChange}
                    placeholder="Frontend Developer Intern"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    name="company"
                    value={opportunityForm.company}
                    onChange={handleInputChange}
                    placeholder="TechCorp Solutions"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={opportunityForm.location}
                      onChange={handleInputChange}
                      placeholder="Remote, Hybrid, or Office Location"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      name="type"
                      value={opportunityForm.type}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                      <option value="part_time">Part-time</option>
                      <option value="full_time">Full-time</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Domain/Category *</label>
                    <select
                      name="domain"
                      value={opportunityForm.domain}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select a domain</option>
                      <option value="software">Software Development</option>
                      <option value="design">Design</option>
                      <option value="marketing">Marketing</option>
                      <option value="business">Business</option>
                      <option value="engineering">Engineering</option>
                      <option value="data">Data Science</option>
                      <option value="research">Research</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Is Paid? *</label>
                    <div className="mt-2 space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="is_paid"
                          checked={opportunityForm.is_paid === true}
                          onChange={() => setOpportunityForm({...opportunityForm, is_paid: true})}
                          className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-gray-700">Yes</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="is_paid"
                          checked={opportunityForm.is_paid === false}
                          onChange={() => setOpportunityForm({...opportunityForm, is_paid: false})}
                          className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-gray-700">No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <input
                      type="text"
                      name="duration"
                      value={opportunityForm.duration}
                      onChange={handleInputChange}
                      placeholder="3 months, 6 months, etc."
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stipend/Salary</label>
                    <input
                      type="text"
                      name="stipend"
                      value={opportunityForm.stipend}
                      onChange={handleInputChange}
                      placeholder="₹15,000/month, ₹30,000 total, etc."
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={opportunityForm.description}
                    onChange={handleInputChange}
                    placeholder="Describe the opportunity, responsibilities, and requirements..."
                    rows={4}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      placeholder="React, JavaScript, etc."
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {opportunityForm.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {opportunityForm.skills.map((skill) => (
                        <div key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline *</label>
                  <input
                    type="date"
                    name="deadline"
                    value={opportunityForm.deadline}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Form URL *</label>
                  <input
                    type="url"
                    name="application_form_url"
                    value={opportunityForm.application_form_url}
                    onChange={handleInputChange}
                    placeholder="https://forms.google.com/..."
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide a Google Form URL where applicants can submit their applications.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitOpportunity}
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                >
                  Post Opportunity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opportunities;
