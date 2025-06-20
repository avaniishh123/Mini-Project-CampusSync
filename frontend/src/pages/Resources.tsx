import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, AttachmentIcon, UploadIcon, ThumbUpIcon, DownloadIcon } from '../utils/materialIcons';
import { resourcesAPI } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Chip from '../components/Chip';

interface Resource {
  _id: string;
  title: string;
  description: string;
  subject: string;
  semester: string;
  type: string;
  tags: string[];
  filename: string;
  original_filename: string;
  file_extension: string;
  file_size: number;
  file_id?: string; // GridFS file ID
  uploader_id: string;
  uploader?: {
    id: string;
    name: string;
    username: string;
    profile_picture: string;
  };
  created_at: string;
  upvotes: number;
  downvotes: number;
  download_count: number;
  is_verified: boolean;
  is_upvoted?: boolean;
}

const Resources: React.FC = () => {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'notes' | 'papers'>('all');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state for resource upload
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    subject: '',
    semester: '',
    type: 'notes',
    file: null as File | null
  });

  const [sortOption, setSortOption] = useState<'recent' | 'likes' | 'downloads'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetch resources from API
  useEffect(() => {
    const fetchResources = async () => {
      if (!token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Build query parameters based on filters
        let queryParams = {};
        if (selectedType !== 'all') {
          // Map UI types to backend types
          const typeMap: Record<string, string> = {
            'notes': 'notes',
            'papers': 'paper',
            'labs': 'lab'
          };
          queryParams = { ...queryParams, type: typeMap[selectedType] };
        }
        
        if (searchQuery) {
          queryParams = { ...queryParams, search: searchQuery };
        }
        
        const response = await resourcesAPI.getResources(token, queryParams as Record<string, string>);
        
        if (response.status === 'success') {
          setResources(response.data.resources);
        } else {
          setError('Failed to fetch resources');
        }
      } catch (err: any) {
        console.error('Error fetching resources:', err);
        setError(err.message || 'An error occurred while fetching resources');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResources();
  }, [token, selectedType, searchQuery]);

  // Handle resource upload
  const handleUpload = async () => {
    if (!token) {
      setError('You must be logged in to upload resources');
      return;
    }
    
    if (!resourceForm.file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!resourceForm.title || !resourceForm.subject || !resourceForm.semester || !resourceForm.type) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', resourceForm.file);
      formData.append('title', resourceForm.title);
      formData.append('description', resourceForm.description);
      formData.append('subject', resourceForm.subject);
      formData.append('semester', resourceForm.semester);
      formData.append('type', resourceForm.type);
      
      const response = await resourcesAPI.uploadResource(token, formData);
      
      if (response.status === 'success') {
        // Reset form and close modal
        setResourceForm({
          title: '',
          description: '',
          subject: '',
          semester: '',
          type: 'notes',
          file: null
        });
        setShowUploadModal(false);
        
        // Refresh resources list
        const updatedResponse = await resourcesAPI.getResources(token, {});
        if (updatedResponse.status === 'success') {
          setResources(updatedResponse.data.resources);
        }
      } else {
        setError('Failed to upload resource');
      }
    } catch (err: any) {
      console.error('Error uploading resource:', err);
      setError(err.message || 'An error occurred while uploading resource');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter out resources with missing uploader or 'Unknown' uploader
  const filteredResources = resources.filter(
    r => r.uploader && r.uploader.name && r.uploader.name !== 'Unknown'
  );

  // Sort filtered resources based on sortOption
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortOption === 'likes') {
      return b.upvotes - a.upvotes;
    } else if (sortOption === 'downloads') {
      return b.download_count - a.download_count;
    } else {
      // Most recent
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-8">
      {/* Search and Filter Section */}
      <Card className="p-8 w-full" variant="elevated" elevation={1} noHover={true}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="flex-1">
              <div className="relative rounded-md">
                <Input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startIcon={<SearchIcon size={20} />}
                  variant="filled"
                  fullWidth
                />
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              {/* Filter Button Dropdown */}
              <div className="relative">
                <Button
                  variant="outlined"
                  onClick={() => setShowSortDropdown((prev) => !prev)}
                  className="min-w-[120px]"
                >
                  Filter: {sortOption === 'recent' ? 'Most Recent' : sortOption === 'likes' ? 'Most Liked' : 'Most Downloaded'}
                  <svg className="ml-2 w-4 h-4 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </Button>
                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'recent' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { setSortOption('recent'); setShowSortDropdown(false); }}
                    >
                      Most Recent
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'likes' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { setSortOption('likes'); setShowSortDropdown(false); }}
                    >
                      Most Liked
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm ${sortOption === 'downloads' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => { setSortOption('downloads'); setShowSortDropdown(false); }}
                    >
                      Most Downloaded
                    </button>
                  </div>
                )}
              </div>
              <Button 
                variant="primary" 
                icon={<UploadIcon size={20} />} 
                iconPosition="left"
                onClick={() => setShowUploadModal(true)}
              >
                Upload Resource
              </Button>
            </div>
            
            {/* Hidden file input for resource upload */}
            <input 
              type="file" 
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setResourceForm(prev => ({
                    ...prev,
                    file: e.target.files![0]
                  }));
                }
              }}
            />
          </div>

          <div className="mt-4 flex space-x-4">
            <Button
              onClick={() => setSelectedType('all')}
              variant={selectedType === 'all' ? 'tonal' : 'text'}
              size="small"
            >
              All
            </Button>
            <Button
              onClick={() => setSelectedType('notes')}
              variant={selectedType === 'notes' ? 'tonal' : 'text'}
              size="small"
            >
              Notes
            </Button>
            <Button
              onClick={() => setSelectedType('papers')}
              variant={selectedType === 'papers' ? 'tonal' : 'text'}
              size="small"
            >
              Papers
            </Button>
          </div>
        </div>
      </Card>

      {/* Resources Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-10">
            <p>Loading resources...</p>
          </div>
        ) : error ? (
          <div className="col-span-3 text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : sortedResources.length === 0 ? (
          <div className="col-span-3 text-center py-10">
            <p>No resources found. Try changing your search criteria or upload a new resource.</p>
          </div>
        ) : (
          sortedResources.map((resource: Resource) => (
            <Card key={resource._id} variant="elevated" elevation={1} className="overflow-hidden">
              <div className="p-8">
                <div className="flex items-center">
                  <AttachmentIcon size={32} color="var(--md-sys-color-primary)" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{resource.title}</h3>
                    <p className="text-sm text-gray-500">{resource.subject} • {resource.semester} Semester</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">{resource.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <p>Uploaded by {resource.uploader?.name || 'Unknown'}</p>
                    <span className="mx-2">•</span>
                    <p>{new Date(resource.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
                <div className="mt-4">
                  {/* Stats and Like Button */}
                  <div className="flex space-x-4">
                    <Button 
                      variant="text" 
                      size="small" 
                      icon={<ThumbUpIcon size={20} color={resource.is_upvoted ? "var(--md-sys-color-primary)" : undefined} />} 
                      iconPosition="left"
                      onClick={async () => {
                        if (!token) return;
                        try {
                          const response = await resourcesAPI.likeResource(token, resource._id);
                          if (response.status === 'success') {
                            setResources(prevResources => 
                              prevResources.map(r => 
                                r._id === resource._id 
                                  ? { ...r, upvotes: response.data.upvotes, is_upvoted: response.data.is_upvoted }
                                  : r
                              )
                            );
                          }
                        } catch (err) {
                          console.error('Error liking resource:', err);
                        }
                      }}
                    >
                      {resource.upvotes}
                    </Button>
                    <Button 
                      variant="text" 
                      size="small" 
                      icon={<DownloadIcon size={20} />} 
                      iconPosition="left"
                    >
                      {resource.download_count}
                    </Button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between">
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={() => {
                        if (!token) {
                          alert('You must be logged in to download this resource.');
                          return;
                        }
                        
                        // Get API base URL
                        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                        
                        // Create the direct download URL and open it in a new tab
                        const baseUrl = apiUrl.replace('/v1', '');  // Remove v1 if present
                        
                        // If resource has file_id, use the GridFS endpoint directly (like post attachments)
                        let downloadUrl;
                        if (resource.file_id) {
                          downloadUrl = `${baseUrl}/files/gridfs/${resource.file_id}?download=true`;
                        } else {
                          // Fall back to the legacy endpoint
                          downloadUrl = `${baseUrl}/resources/${resource._id}/download?download=true`;
                        }
                        
                        console.log("Download URL:", downloadUrl); // Debug log
                        window.open(downloadUrl, '_blank');
                        
                        // Log download attempt
                        console.log(`Downloading resource: ${resource.title}`);
                        
                        // Update the UI to reflect increased download count
                        setResources(prevResources => 
                          prevResources.map(r => 
                            r._id === resource._id 
                              ? { ...r, download_count: r.download_count + 1 }
                              : r
                          )
                        );
                      }}
                    >
                      Download
                    </Button>
                    
                    {/* Delete button for uploader */}
                    {user && (user.id === resource.uploader_id || user.id === resource.uploader?.id) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (!token) {
                            alert('You must be logged in to delete this resource.');
                            return;
                          }
                          if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
                          try {
                            // Show loading state
                            const targetElement = document.activeElement as HTMLElement;
                            if (targetElement) {
                              targetElement.classList.add('opacity-50', 'pointer-events-none');
                              if (targetElement.textContent) {
                                targetElement.dataset.originalText = targetElement.textContent;
                                targetElement.textContent = 'Deleting...';
                              }
                            }
                            
                            const response = await resourcesAPI.deleteResource(token, resource._id);
                            
                            // Reset button state
                            if (targetElement) {
                              targetElement.classList.remove('opacity-50', 'pointer-events-none');
                              if (targetElement.dataset.originalText) {
                                targetElement.textContent = targetElement.dataset.originalText;
                              }
                            }
                            
                            if (response.status === 'success') {
                              setResources(prevResources => prevResources.filter(r => r._id !== resource._id));
                            } else {
                              console.error('Delete error:', response);
                              alert(response.message || 'Failed to delete resource');
                            }
                          } catch (err) {
                            console.error('Delete exception:', err);
                            alert('An error occurred while deleting the resource. Please try again.');
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Upload Resource Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6" variant="elevated" elevation={2}>
            <h2 className="text-xl font-semibold mb-4">Upload Resource</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <Input
                  type="text"
                  placeholder="Resource title"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, title: e.target.value }))}
                  fullWidth
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  type="text"
                  placeholder="Brief description"
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={resourceForm.subject}
                    onChange={(e) => setResourceForm(prev => ({ ...prev, subject: e.target.value }))}
                    fullWidth
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Semester *</label>
                  <Input
                    type="text"
                    placeholder="e.g. 3rd"
                    value={resourceForm.semester}
                    onChange={(e) => setResourceForm(prev => ({ ...prev, semester: e.target.value }))}
                    fullWidth
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Resource Type *</label>
                <div className="flex space-x-4">
                  <Button
                    onClick={() => setResourceForm(prev => ({ ...prev, type: 'notes' }))}
                    variant={resourceForm.type === 'notes' ? 'tonal' : 'text'}
                    size="small"
                  >
                    Notes
                  </Button>
                  <Button
                    onClick={() => setResourceForm(prev => ({ ...prev, type: 'paper' }))}
                    variant={resourceForm.type === 'paper' ? 'tonal' : 'text'}
                    size="small"
                  >
                    Papers
                  </Button>
                  <Button
                    onClick={() => setResourceForm(prev => ({ ...prev, type: 'lab' }))}
                    variant={resourceForm.type === 'lab' ? 'tonal' : 'text'}
                    size="small"
                  >
                    Lab Manuals
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">File *</label>
                <div className="flex items-center">
                  <Button 
                    variant="outlined" 
                    onClick={() => fileInputRef.current?.click()}
                    className="mr-3"
                  >
                    Select File
                  </Button>
                  <span className="text-sm text-gray-600">
                    {resourceForm.file ? resourceForm.file.name : 'No file selected'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button 
                  variant="text" 
                  onClick={() => {
                    setShowUploadModal(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleUpload}
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Resources;
