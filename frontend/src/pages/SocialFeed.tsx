import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { socialAPI } from '../services/api';
import { 
  AddIcon, 
  ThumbUpIcon, 
  ChatIcon, 
  ShareIcon, 
  ImageIcon, 
  EventIcon, 
  ArticleIcon,
  PersonIcon,
  SchoolIcon,
  WorkIcon,
  CloseIcon,
  MoreVertIcon,
  LocationIcon,
  AttachmentIcon,
  SendIcon,
  DeleteIcon,
  SearchIcon,
  EditIcon,
  FilterIcon,
  SmileyIcon
} from '../utils/materialIcons';
import SentimentAnalysis from '../components/SentimentAnalysis';
import SummarizeButton from '../components/SummarizeButton';
import Card from '../components/Card';
import Button from '../components/Button';
import '../styles/thin-scrollbar.css';
import CampusNews from '../components/CampusNews';
import UpcomingEvents from '../components/UpcomingEvents';

// Types
interface Author {
  id: string;
  username: string;
  name: string;
  profile_picture: string | null;
}

interface Comment {
  _id: string;
  content: string;
  author: Author;
  created_at: string;
  is_anonymous: boolean;
  like_count: number;
  is_liked: boolean;
  media_url?: string;
  link?: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  category: string;
  author: Author;
  created_at: string;
  updated_at: string | null;
  tags: string[];
  is_anonymous: boolean;
  media_urls: string[]; // Kept for backward compatibility
  media_items?: Array<{
    url: string;
    type: 'image' | 'document';
    filename: string;
    content_type: string;
    is_image: boolean;
  }>;
  comment_count: number;
  like_count: number;
  is_liked: boolean;
  image?: string; // Kept for backward compatibility
  share_count?: number;
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
  sentiment_score?: number;
  emotional_intensity?: number;
  detected_emotions?: Array<{name: string, percentage: number}>;
}

// User data will come from AuthContext

// Empty posts array - will be filled from API
const emptyPosts: Post[] = [];

// Dummy comments
const dummyComments: Record<string, Comment[]> = {
  '1': [
    {
      _id: 'c1',
      content: 'I\'m interested in the Web Development position. What are the requirements?',
      author: {
        id: '4',
        username: 'priya',
        name: 'Priya Sharma',
        profile_picture: 'https://via.placeholder.com/50'
      },
      created_at: '2025-05-26T11:30:00Z',
      is_anonymous: false,
      like_count: 2,
      is_liked: false
    },
    {
      _id: 'c2',
      content: 'Is this open for final year students?',
      author: {
        id: '5',
        username: 'rahul',
        name: 'Rahul Kumar',
        profile_picture: 'https://via.placeholder.com/50'
      },
      created_at: '2025-05-26T12:15:00Z',
      is_anonymous: false,
      like_count: 1,
      is_liked: true
    }
  ],
  '2': [
    {
      _id: 'c3',
      content: 'I have experience with TensorFlow and OpenCV. Would love to collaborate!',
      author: {
        id: '6',
        username: 'vikram',
        name: 'Vikram Singh',
        profile_picture: 'https://via.placeholder.com/50'
      },
      created_at: '2025-05-25T16:30:00Z',
      is_anonymous: false,
      like_count: 3,
      is_liked: false
    }
  ]
};

// Format date - fixed version to correctly show timestamps
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown';
  
  try {
    // Parse the date string - the server stores dates in UTC
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    
    // For temporary posts or future dates, always show "Just now"
    if (dateString.includes('temp-')) {
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Just now';
  }
};

// Get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'project_idea':
      return <SchoolIcon size={20} color="var(--md-sys-color-primary)" />;
    case 'question':
      return <ChatIcon size={20} color="var(--md-sys-color-tertiary)" />;
    case 'announcement':
      return <ArticleIcon size={20} color="var(--md-sys-color-error)" />;
    case 'event':
      return <EventIcon size={20} color="var(--md-sys-color-secondary)" />;
    case 'opportunity':
      return <WorkIcon size={20} color="var(--md-sys-color-primary)" />;
    default:
      return <PersonIcon size={20} color="var(--md-sys-color-primary)" />;
  }
};

// Get category color
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'project_idea':
      return 'var(--md-sys-color-primary)';
    case 'question':
      return 'var(--md-sys-color-tertiary)';
    case 'announcement':
      return 'var(--md-sys-color-error)';
    case 'event':
      return 'var(--md-sys-color-secondary)';
    case 'opportunity':
      return 'var(--md-sys-color-primary-container)';
    case 'meme':
      return 'var(--md-sys-color-tertiary-container)';
    default:
      return 'var(--md-sys-color-primary)';
  }
};

// Get sentiment badge color
const getSentimentBadgeColor = (sentiment?: string) => {
  if (!sentiment) return 'bg-gray-100 text-gray-800';
  
  switch(sentiment) {
    case 'Positive':
      return 'bg-green-100 text-green-800';
    case 'Negative':
      return 'bg-red-100 text-red-800';
    case 'Neutral':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface SocialFeedProps {
  showCreatePostModal: boolean;
  setShowCreatePostModal: (show: boolean) => void;
}

// Add type definition for API response
interface CommentResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    comment: Comment;
    comment_id?: string;
    is_moderated?: boolean;
    media_url?: string;
    link?: string;
  };
}

// Add type definition for API response
interface PostResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    post: Post;
    post_id?: string;
    is_moderated?: boolean;
  };
}

const SocialFeed: React.FC<SocialFeedProps> = ({ showCreatePostModal, setShowCreatePostModal }) => {
  const { user, getToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>(emptyPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentMedia, setCommentMedia] = useState<File | null>(null);
  const [commentLink, setCommentLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [clearingPosts, setClearingPosts] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const editPostAttachmentInputRef = useRef<HTMLInputElement>(null);
  
  // For editing posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostMedia, setEditPostMedia] = useState<File | null>(null);
  const [editPostAttachment, setEditPostAttachment] = useState<File | null>(null);
  const [existingPostMediaUrl, setExistingPostMediaUrl] = useState<string | undefined>(undefined);
  const [existingPostAttachmentUrl, setExistingPostAttachmentUrl] = useState<string | undefined>(undefined);

  // For selective post editing
  const [editingPostComponent, setEditingPostComponent] = useState<'text' | 'media' | 'all' | null>(null);
  const [showSelectiveEditModal, setShowSelectiveEditModal] = useState(false);

  // For editing comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentMedia, setEditCommentMedia] = useState<File | null>(null);
  const [editCommentLink, setEditCommentLink] = useState('');
  const [showEditLinkInput, setShowEditLinkInput] = useState(false);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | undefined>(undefined);

  // For selective comment editing
  const [editingCommentComponent, setEditingCommentComponent] = useState<'text' | 'media' | 'link' | null>(null);
  const [showSelectiveCommentEdit, setShowSelectiveCommentEdit] = useState(false);
  const [editingCommentPostId, setEditingCommentPostId] = useState<string>('');

  // For replying to comments
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  // For comments loading state
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});

  // For sentiment filter
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [showSentimentFilter, setShowSentimentFilter] = useState(false);

  // Add state for summary per post
  const [postSummaries, setPostSummaries] = useState<Record<string, string>>({});
  const [showSummaryFor, setShowSummaryFor] = useState<string | null>(null);
  const [summaryLoadingFor, setSummaryLoadingFor] = useState<string | null>(null);

  // Handle comment click
  const handleCommentClick = async (postId: string) => {
    console.log(`Comment click handler triggered for post ${postId}`);
    
    // Toggle comments section
    if (activeComments === postId) {
      console.log('Closing comments section');
      setActiveComments(null);
      return;
    }
    
    console.log('Opening comments section and fetching comments');
    setActiveComments(postId);
    
    // Reset error state
    setCommentsError('');
    
    // Set loading state for comments
    setCommentsLoading(true);
    
    try {
      const token = getToken();
      if (!token) {
        console.error('No authentication token available');
        throw new Error('Authentication required');
      }
      
      console.log('Fetching comments for post:', postId);
      // Fetch comments from the backend
      const response = await socialAPI.getPostComments(token, postId);
      
      console.log('Comments response received:', response);
      
      // Check if the response is valid
      if (response && response.status === 'success' && response.data) {
        // Update the comments in our state
        if (Array.isArray(response.data.comments)) {
          console.log(`Setting ${response.data.comments.length} comments for post ${postId}`);
          setPostComments(prevComments => {
            const updatedComments = {
              ...prevComments,
              [postId]: response.data.comments
            };
            console.log('Updated comments state:', updatedComments);
            return updatedComments;
          });
        } else {
          // If comments is not an array, set an empty array
          console.warn('Comments data is not an array:', response.data.comments);
          setPostComments(prevComments => ({
            ...prevComments,
            [postId]: []
          }));
        }
      } else {
        // Handle unexpected response format
        console.error('Unexpected response format:', response);
        throw new Error('Failed to load comments: Unexpected response format');
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setCommentsError(`Failed to load comments: ${err instanceof Error ? err.message : 'Failed to fetch'}`);
      // Set empty comments array to avoid showing old comments
      setPostComments(prevComments => {
        console.log('Setting empty comments array due to error');
        return {
          ...prevComments,
          [postId]: []
        };
      });
    } finally {
      console.log('Finished loading comments, setting loading state to false');
      setCommentsLoading(false);
    }
  };

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setActiveCategory(category);
    // Posts will be fetched in the useEffect based on the activeCategory
  };
  
  // Handle post like
  const handleLikePost = async (postId: string) => {
    // Get the current post
    const currentPost = posts.find(post => post._id === postId);
    if (!currentPost) return;
    
    // Optimistically update UI
    setPosts(posts.map(post => 
      post._id === postId 
        ? { 
            ...post, 
            is_liked: !post.is_liked, 
            like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1 
          } 
        : post
    ));
    
    try {
      // Get token
      const token = getToken();
      if (!token) {
        console.error('No token available');
        return;
      }
      
      // Call API to persist like
      const response = await socialAPI.likePost(token, postId);
      console.log('Like post response:', response);
      
      if (response.status !== 'success') {
        // If API call fails, revert the optimistic update
        setPosts(posts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                is_liked: currentPost.is_liked, 
                like_count: currentPost.like_count 
              } 
            : post
        ));
        console.error('Failed to like post:', response.message);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert the optimistic update on error
      setPosts(posts.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              is_liked: currentPost.is_liked, 
              like_count: currentPost.like_count 
            } 
          : post
      ));
    }
  };

  // Fetch posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError('');
      
      try {
        const token = getToken();
        console.log('Token for API request:', token); // Debug log
        
        if (token) {
          // If category is 'all', don't send category parameter
          const category = activeCategory !== 'all' ? activeCategory : undefined;
          
          // If search query exists, use it
          const search = searchQuery.trim() !== '' ? searchQuery : undefined;
          
          // Add sentiment filter if selected
          const sentiment = selectedSentiment !== 'all' ? selectedSentiment : undefined;
          
          console.log('Making API request with params:', { category, search, sentiment }); // Debug log
          
          // The backend should now automatically analyze sentiment for all posts
          // We don't need to do any client-side sentiment analysis
          const response = await socialAPI.getPosts(token, 0, 20, category, search, sentiment);
          console.log('API response:', response); // Debug log
          
          if (response.status === 'success' && response.data && response.data.posts) {
            console.log('Posts received:', response.data.posts.length); // Debug log
            
            // Check if posts have sentiment data, if not, they should have been analyzed on the backend
            const postsWithSentiment = response.data.posts;
            console.log('Posts with sentiment data:', postsWithSentiment);
            
            setPosts(postsWithSentiment);
            
            // If no posts are available, set the error message
            if (postsWithSentiment.length === 0) {
              setError('No posts available. Be the first to share something!');
            } else {
              setError('');
            }
          } else {
            console.log('Invalid response format:', response); // Debug log
            setError('Received invalid response format from server');
          }
        }
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        if (err.message && err.message.includes('Failed to fetch')) {
          setError('Cannot connect to the server. Please check if the backend is running.');
        } else {
          setError(`Failed to load posts: ${err.message || 'Unknown error'}. Please try again later.`);
        }
        // Don't use dummy data, just show the error message
        setPosts([]);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    };
    
    // If actively searching, use a debounce
    if (isSearching) {
      const debounceTimer = setTimeout(() => {
        fetchPosts();
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    } else {
      fetchPosts();
    }
  }, [getToken, activeCategory, searchQuery, isSearching, selectedSentiment]); // Re-fetch when category or search changes    // Handle post like
  const handleLike = async (postId: string) => {
    try {
      const token = getToken();
      
      if (token) {
        // Optimistically update UI
        setPosts(posts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                is_liked: !post.is_liked, 
                like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1 
              } 
            : post
        ));
        
        // Call API to update like status
        await socialAPI.likePost(token, postId);
      }
    } catch (err) {
      console.error('Error liking post:', err);
      // Revert the optimistic update if there's an error
      setPosts(posts);
    }
    
    // API call would go here
  };
  
  // Handle comment like
  const handleLikeComment = async (commentId: string, postId: string) => {
    // Find the comment in the postComments
    const currentPostComments = postComments[postId] || [];
    if (currentPostComments.length === 0) return;
    
    const commentIndex = currentPostComments.findIndex(c => c._id === commentId);
    if (commentIndex === -1) return;
    
    // Get the current comment
    const comment = currentPostComments[commentIndex];
    
    // Update the comment optimistically
    const updatedComment = {
      ...comment,
      is_liked: !comment.is_liked,
      like_count: comment.is_liked ? Math.max(0, comment.like_count - 1) : comment.like_count + 1
    };
    
    // Update the comments state
    setPostComments(prevComments => {
      const updatedComments = [...currentPostComments];
      updatedComments[commentIndex] = updatedComment;
      
      return {
        ...prevComments,
        [postId]: updatedComments
      };
    });
    
    try {
      const token = getToken();
      
      if (token) {
        // Call API to like/unlike comment
        await socialAPI.likeComment(token, commentId);
      }
    } catch (err) {
      console.error('Error liking comment:', err);
      
      // If there's an error, revert the optimistic update
      setPostComments(prevComments => {
        const revertedComments = [...currentPostComments];
        revertedComments[commentIndex] = comment;
        
        return {
          ...prevComments,
          [postId]: revertedComments
        };
      });
    }
  };

  // Handle edit comment
  const handleEditComment = (commentId: string, content: string, media_url?: string, link?: string) => {
    setEditingCommentId(commentId);
    setEditCommentContent(content);
    setEditCommentMedia(null);
    setExistingMediaUrl(media_url);
    setEditCommentLink(link || '');
    setShowEditLinkInput(!!link);
  };
  
  // Handle delete comment
  const handleDeleteComment = async (commentId: string, postId: string) => {
    // Ask for confirmation before deleting
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Remove the comment from UI immediately (optimistic update)
      setPostComments(prevComments => {
        const currentPostComments = prevComments[postId] || [];
        return {
          ...prevComments,
          [postId]: currentPostComments.filter(c => c._id !== commentId)
        };
      });
      
      // Update post comment count
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, comment_count: Math.max(0, post.comment_count - 1) } 
          : post
      ));
      
      // Call API to delete comment
      await socialAPI.deleteComment(token, commentId);
      console.log('Comment deleted successfully');
      
    } catch (err) {
      console.error('Error deleting comment:', err);
      
      // If there's an error, fetch the comments again to restore the UI
      handleCommentClick(postId);
    }
  };

  // Handle save edited comment
  const handleSaveEditedComment = async (commentId: string, postId: string) => {
    if (!editCommentContent.trim() && !editCommentMedia && !editCommentLink && !existingMediaUrl) return;
    
    try {
      const token = getToken();
      
      if (token) {
        // Find the comment in the postComments state
        const currentPostComments = postComments[postId] || [];
        const commentIndex = currentPostComments.findIndex(c => c._id === commentId);
        
        if (commentIndex !== -1) {
          const oldComment = currentPostComments[commentIndex];
          
          // Create FormData if we have media, otherwise use JSON
          let response: CommentResponse;
          if (editCommentMedia) {
            const formData = new FormData();
            formData.append('content', editCommentContent);
            formData.append('image', editCommentMedia);
            if (editCommentLink) {
              formData.append('link', editCommentLink);
            }
            response = await socialAPI.updateCommentWithMedia(token, commentId, formData);
          } else {
            // If we're keeping existing media, include it in the JSON
            response = await socialAPI.updateComment(
              token, 
              commentId, 
              editCommentContent, 
              editCommentLink || undefined,
              existingMediaUrl
            );
          }
          
          if (response.status === 'success' && response.data.comment) {
            // Update the comments state with the server response
            setPostComments(prevComments => {
              const updatedComments = [...currentPostComments];
              updatedComments[commentIndex] = response.data.comment;
              return {
                ...prevComments,
                [postId]: updatedComments
              };
            });
          }
          
          // Reset editing state
          setEditingCommentId(null);
          setEditCommentContent('');
          setEditCommentMedia(null);
          setEditCommentLink('');
          setShowEditLinkInput(false);
          setExistingMediaUrl(undefined);
        }
      }
    } catch (err) {
      console.error('Error updating comment:', err);
      // You could add error handling here to revert the optimistic update if needed
    }
  };

  // Handle reply to comment
  const handleReplyToComment = (commentId: string) => {
    setReplyingToCommentId(commentId);
    setNewComment('');
  };

  // Handle save reply
  const handleSaveReply = async (postId: string, parentCommentId: string) => {
    if (!newComment.trim()) return;
    
    // Create new comment object for optimistic UI update
    const newCommentObj: Comment = {
      _id: `temp-${Date.now()}`,
      content: newComment,
      author: {
        id: user?.id || '1',
        username: user?.username || 'user',
        name: user?.name || 'User',
        profile_picture: user?.profile_picture || 'https://via.placeholder.com/150'
      },
      created_at: new Date().toISOString(),
      is_anonymous: false,
      like_count: 0,
      is_liked: false
    };
    
    // Update the UI optimistically
    setPostComments(prevComments => {
      const currentPostComments = prevComments[postId] || [];
      return {
        ...prevComments,
        [postId]: [newCommentObj, ...currentPostComments]
      };
    });
    
    // Update post comment count
    setPosts(posts.map(post => 
      post._id === postId 
        ? { ...post, comment_count: post.comment_count + 1 } 
        : post
    ));
    
    // Clear input and reset replying state
    setNewComment('');
    setReplyingToCommentId(null);
    
    try {
      const token = getToken();
      
      if (token) {
        // Call API to add comment
        const response = await socialAPI.commentOnPost(token, postId, newComment);
        
        // Replace the temporary comment with the real one from the server
        if (response.status === 'success' && response.data && response.data.comment) {
          // Update the comments state with the real comment from the server
          setPostComments(prevComments => {
            const currentPostComments = prevComments[postId] || [];
            // Filter out the temporary comment and add the real one
            const updatedComments = currentPostComments.filter(c => c._id !== newCommentObj._id);
            return {
              ...prevComments,
              [postId]: [response.data.comment, ...updatedComments]
            };
          });
        }
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      
      // If there's an error, revert the optimistic update
      setPostComments(prevComments => {
        const currentPostComments = prevComments[postId] || [];
        return {
          ...prevComments,
          [postId]: currentPostComments.filter(c => c._id !== newCommentObj._id)
        };
      });
      
      // Revert the post comment count
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, comment_count: Math.max(0, post.comment_count - 1) } 
          : post
      ));
    }
  };

  // Handle comment media selection
  const handleCommentMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image and size is less than 5MB
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setCommentMedia(file);
    }
  };

  // Handle comment link input
  const handleCommentLinkToggle = () => {
    setShowLinkInput(!showLinkInput);
    if (!showLinkInput) {
      setCommentLink('');
    }
  };

  // Handle comment link change
  const handleCommentLinkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommentLink(event.target.value);
  };

  // Handle comment submission
  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() && !commentMedia && !commentLink) return;
    
    // Create new comment object for optimistic UI update
    const newCommentObj: Comment = {
      _id: `temp-${Date.now()}`,
      content: newComment,
      author: {
        id: user?.id || '1',
        username: user?.username || 'user',
        name: user?.name || 'User',
        profile_picture: user?.profile_picture || 'https://via.placeholder.com/150'
      },
      created_at: new Date().toISOString(),
      is_anonymous: false,
      like_count: 0,
      is_liked: false,
      media_url: commentMedia ? URL.createObjectURL(commentMedia) : undefined,
      link: commentLink || undefined
    };
    
    // Update the UI optimistically
    setPostComments(prevComments => {
      const currentPostComments = prevComments[postId] || [];
      return {
        ...prevComments,
        [postId]: [newCommentObj, ...currentPostComments]
      };
    });
    
    // Update post comment count
    setPosts(posts.map(post => 
      post._id === postId 
        ? { ...post, comment_count: post.comment_count + 1 } 
        : post
    ));
    
    // Clear input and media
    setNewComment('');
    setCommentMedia(null);
    setCommentLink('');
    setShowLinkInput(false);
    
    try {
      const token = getToken();
      if (token) {
        let response: CommentResponse;
        
        if (commentMedia) {
          // If we have media, use FormData
          const formData = new FormData();
          formData.append('content', newComment);
          formData.append('image', commentMedia);
          if (commentLink) {
            formData.append('link', commentLink);
          }
          response = await socialAPI.createComment(token, postId, formData);
        } else {
          // If no media, use JSON payload
          response = await socialAPI.commentOnPost(token, postId, newComment, commentLink || undefined);
        }
        
        if (response.status === 'success' && response.data.comment) {
          // Update the comment with actual data from server
          setPostComments(prevComments => {
            const currentPostComments = [...(prevComments[postId] || [])];
            const tempIndex = currentPostComments.findIndex(c => c._id === newCommentObj._id);
            if (tempIndex !== -1) {
              currentPostComments[tempIndex] = response.data.comment;
            }
            return {
              ...prevComments,
              [postId]: currentPostComments
            };
          });
        }
      }
    } catch (err) {
      console.error('Error creating comment:', err);
      // Revert optimistic update on error
      setPostComments(prevComments => {
        const currentPostComments = [...(prevComments[postId] || [])];
        return {
          ...prevComments,
          [postId]: currentPostComments.filter(c => c._id !== newCommentObj._id)
        };
      });
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, comment_count: Math.max(0, post.comment_count - 1) } 
          : post
      ));
    }
  };
  
  // Handle create post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    try {
      const token = getToken();
      
      if (!token) {
        console.error('No token available');
        setError('You must be logged in to create a post');
        return;
      }
      
      console.log('Creating new post with token:', token);
      
      // Create temporary media URLs for optimistic UI update
      const tempMediaUrls = [];
      if (selectedImage) {
        tempMediaUrls.push(URL.createObjectURL(selectedImage));
      }
      
      // Create new post object for optimistic UI update
      const newPost: Post = {
        _id: `temp-${Date.now()}`,
        title: newPostContent.split('\n')[0] || 'New Post',
        content: newPostContent,
        category: 'general',
        author: {
          id: user?.id || '1',
          username: user?.username || 'user',
          name: user?.name || 'User',
          profile_picture: user?.profile_picture || 'https://via.placeholder.com/150'
        },
        created_at: new Date().toISOString(),
        updated_at: null,
        tags: [],
        is_anonymous: false,
        media_urls: tempMediaUrls,
        comment_count: 0,
        like_count: 0,
        is_liked: false,
        image: selectedImage ? URL.createObjectURL(selectedImage) : undefined
      };
      
      // Add to posts array for immediate UI feedback
      setPosts([newPost, ...posts]);
      
      // Prepare form data for API if we have files to upload
      // Define response type to match the API response structure
      let response: {
        status: string;
        message: string;
        data: {
          post_id: string;
          is_moderated: boolean;
          post: Post;
        }
      };
      if (selectedImage || selectedAttachment) {
        const formData = new FormData();
        formData.append('content', newPostContent);
        formData.append('category', 'general');
        formData.append('title', newPostContent.split('\n')[0] || 'New Post');
        formData.append('is_anonymous', 'false');
        
        if (selectedImage) {
          formData.append('image', selectedImage);
        }
        
        if (selectedAttachment) {
          formData.append('attachment', selectedAttachment);
        }
        
        // Call API to create post with files
        response = await socialAPI.createPostWithMedia(token, formData);
      } else {
        // Prepare post data for API (no files)
        const postData = {
          content: newPostContent,
          category: 'general',
          title: newPostContent.split('\n')[0] || 'New Post',
          tags: [],
          is_anonymous: false,
          media_urls: []
        };
        
        console.log('Sending post data:', postData);
        
        // Call API to create post
        response = await socialAPI.createPost(token, postData);
      }
      
      console.log('Create post response:', response);
      
      // Clear input and selected files
      setNewPostContent('');
      setSelectedImage(null);
      setSelectedAttachment(null);
      
      // Replace the temporary post with the real one from the server
      if (response.status === 'success' && response.data && response.data.post) {
        console.log('Post created successfully:', response.data.post);
        setPosts(prevPosts => {
          const filteredPosts = prevPosts.filter(p => p._id !== newPost._id);
          return [response.data.post, ...filteredPosts];
        });
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(`Failed to create post: ${err.message || 'Unknown error'}`);
      // Remove the optimistic post if there's an error
      setPosts(prevPosts => prevPosts.filter(p => p._id !== `temp-${Date.now()}`));
    }
  };

  // Handle clearing all posts
  const handleClearAllPosts = async () => {
    try {
      setClearingPosts(true);
      const token = getToken();
      
      if (token) {
        console.log('Clearing all posts...');
        const response = await socialAPI.clearAllPosts(token);
        console.log('Clear posts response:', response);
        
        if (response.status === 'success') {
          // Clear the posts array
          setPosts([]);
          setError('');
          console.log(`Cleared ${response.data.posts_deleted} posts, ${response.data.comments_deleted} comments, and ${response.data.likes_deleted} likes`);
        }
      }
    } catch (err: any) {
      console.error('Error clearing posts:', err);
      setError(`Failed to clear posts: ${err.message || 'Unknown error'}`);
    } finally {
      setClearingPosts(false);
    }
  };

  // Add handlers for edit media and link
  const handleEditCommentMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image and size is less than 5MB
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setEditCommentMedia(file);
    }
  };

  const handleEditCommentLinkToggle = () => {
    setShowEditLinkInput(!showEditLinkInput);
    if (!showEditLinkInput) {
      setEditCommentLink('');
    }
  };

  // Handle edit post
  const handleEditPost = (post: Post) => {
    setEditingPostId(post._id);
    setEditPostContent(post.content);
    setExistingPostMediaUrl(post.media_urls?.[0]);
    setShowEditModal(true);
  };

  // Handle selective post editing
  const handleSelectiveEditPost = (post: Post, component: 'text' | 'media' | 'all') => {
    setEditingPostId(post._id);
    setEditingPostComponent(component);
    setEditPostContent(post.content);
    setExistingPostMediaUrl(post.media_urls?.[0]);
    setExistingPostAttachmentUrl(post.media_urls?.[1]); // Second URL might be attachment
    setShowSelectiveEditModal(true);
  };

  // Handle save selective post edit
  const handleSaveSelectivePostEdit = async () => {
    if (!editingPostId || !editingPostComponent) return;
    
    try {
      const token = getToken();
      
      if (token) {
        let response: PostResponse;
        
        if (editingPostComponent === 'text') {
          // Update only text
          response = await socialAPI.updatePostText(token, editingPostId, editPostContent);
        } else if (editingPostComponent === 'media') {
          // Update only media/attachments
          if (editPostMedia || editPostAttachment) {
            const formData = new FormData();
            if (editPostMedia) {
              formData.append('image', editPostMedia);
            }
            if (editPostAttachment) {
              formData.append('attachment', editPostAttachment);
            }
            response = await socialAPI.updatePostMedia(token, editingPostId, formData);
          } else {
            // Remove media
            response = await socialAPI.removePostMedia(token, editingPostId);
          }
        } else {
          // Update all (existing functionality)
          if (editPostMedia || editPostAttachment) {
            const formData = new FormData();
            formData.append('content', editPostContent);
            if (editPostMedia) {
              formData.append('image', editPostMedia);
            }
            if (editPostAttachment) {
              formData.append('attachment', editPostAttachment);
            }
            response = await socialAPI.updatePostWithMedia(token, editingPostId, formData);
          } else {
            response = await socialAPI.updatePost(token, editingPostId, {
              content: editPostContent,
              media_urls: [
                ...(existingPostMediaUrl ? [existingPostMediaUrl] : []),
                ...(existingPostAttachmentUrl ? [existingPostAttachmentUrl] : [])
              ]
            });
          }
        }
        
        if (response.status === 'success' && response.data.post) {
          // Update posts state with the updated post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === editingPostId ? response.data.post : post
            )
          );
          
          // Reset edit state
          setEditingPostId(null);
          setEditingPostComponent(null);
          setEditPostContent('');
          setEditPostMedia(null);
          setEditPostAttachment(null);
          setExistingPostMediaUrl(undefined);
          setExistingPostAttachmentUrl(undefined);
          setShowSelectiveEditModal(false);
        }
      }
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  // Handle edit post media select
  const handleEditPostMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image and size is less than 10MB
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }
      setEditPostMedia(file);
      setExistingPostMediaUrl(undefined); // Clear existing media URL when new file is selected
    }
  };

  // Handle edit post attachment select
  const handleEditPostAttachmentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (25MB limit for documents)
      if (file.size > 25 * 1024 * 1024) {
        alert('Document size should be less than 25MB');
        return;
      }
      setEditPostAttachment(file);
      setExistingPostAttachmentUrl(undefined); // Clear existing attachment URL when new file is selected
    }
  };

  // Handle remove existing post media
  const handleRemovePostMedia = () => {
    setExistingPostMediaUrl(undefined);
    setEditPostMedia(null);
  };

  // Handle remove existing post attachment
  const handleRemovePostAttachment = () => {
    setExistingPostAttachmentUrl(undefined);
    setEditPostAttachment(null);
  };

  // Handle save edited post
  const handleSaveEditedPost = async () => {
    if (!editingPostId || !editPostContent.trim()) return;
    
    try {
      const token = getToken();
      
      if (token) {
        let response: PostResponse;
        
        if (editPostMedia) {
          // If we have new media, use FormData
          const formData = new FormData();
          formData.append('content', editPostContent);
          formData.append('image', editPostMedia);
          response = await socialAPI.updatePostWithMedia(token, editingPostId, formData);
        } else {
          // If no new media, use JSON with existing media URL
          response = await socialAPI.updatePost(token, editingPostId, {
            content: editPostContent,
            media_urls: existingPostMediaUrl ? [existingPostMediaUrl] : []
          });
        }
        
        if (response.status === 'success' && response.data.post) {
          // Update posts state with the updated post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === editingPostId ? response.data.post : post
            )
          );
          
          // Reset edit state
          setEditingPostId(null);
          setEditPostContent('');
          setEditPostMedia(null);
          setExistingPostMediaUrl(undefined);
          setShowEditModal(false);
        }
      }
    } catch (err) {
      console.error('Error updating post:', err);
      // You could add error handling here
    }
  };

  // Handle selective comment editing
  const handleSelectiveEditComment = (comment: Comment, component: 'text' | 'media' | 'link', postId: string) => {
    setEditingCommentId(comment._id);
    setEditingCommentComponent(component);
    setEditCommentContent(comment.content);
    setExistingMediaUrl(comment.media_url);
    setEditCommentLink(comment.link || '');
    setEditingCommentPostId(postId);
    setShowSelectiveCommentEdit(true);
  };

  // Handle save selective comment edit
  const handleSaveSelectiveCommentEdit = async (commentId: string, postId: string) => {
    if (!editingCommentComponent) return;
    
    try {
      const token = getToken();
      
      if (token) {
        // Find the comment in the postComments state
        const currentPostComments = postComments[postId] || [];
        const commentIndex = currentPostComments.findIndex(c => c._id === commentId);
        
        if (commentIndex !== -1) {
          let response: CommentResponse;
          
          if (editingCommentComponent === 'text') {
            // Update only text
            response = await socialAPI.updateCommentText(token, commentId, editCommentContent);
          } else if (editingCommentComponent === 'media') {
            // Update only media
            if (editCommentMedia) {
              const formData = new FormData();
              formData.append('image', editCommentMedia);
              response = await socialAPI.updateCommentMedia(token, commentId, formData);
            } else {
              // Remove media
              response = await socialAPI.removeCommentMedia(token, commentId);
            }
          } else if (editingCommentComponent === 'link') {
            // Update only link
            response = await socialAPI.updateCommentLink(token, commentId, editCommentLink);
          } else {
            // Fallback to existing functionality
            if (editCommentMedia) {
              const formData = new FormData();
              formData.append('content', editCommentContent);
              formData.append('image', editCommentMedia);
              if (editCommentLink) {
                formData.append('link', editCommentLink);
              }
              response = await socialAPI.updateCommentWithMedia(token, commentId, formData);
            } else {
              response = await socialAPI.updateComment(
                token, 
                commentId, 
                editCommentContent, 
                editCommentLink || undefined,
                existingMediaUrl
              );
            }
          }
          
          if (response.status === 'success' && response.data.comment) {
            // Update the comments state with the server response
            setPostComments(prevComments => {
              const updatedComments = [...currentPostComments];
              updatedComments[commentIndex] = response.data.comment;
              return {
                ...prevComments,
                [postId]: updatedComments
              };
            });
          }
          
          // Reset editing state
          setEditingCommentId(null);
          setEditingCommentComponent(null);
          setEditCommentContent('');
          setEditCommentMedia(null);
          setEditCommentLink('');
          setShowEditLinkInput(false);
          setExistingMediaUrl(undefined);
          setShowSelectiveCommentEdit(false);
        }
      }
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      // Filter out the post from the posts array
      setPosts(posts.filter(p => p._id !== postId));
      // Call API to delete post
      const token = getToken();
      if (token) {
        try {
          const response = await socialAPI.deletePost(token, postId);
          console.log('Post deleted successfully:', response);
        } catch (err) {
          console.error('Error deleting post:', err);
          // If there's an error, add the post back
          const deletedPost = posts.find(p => p._id === postId);
          if (deletedPost) {
            setPosts(prevPosts => [deletedPost, ...prevPosts.filter(p => p._id !== postId)]);
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Profile and Create Post section (desktop only) */}
      <div className="hidden lg:block">
        <Card variant="elevated" elevation={2} className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-elevation-3">
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 h-24 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/30 to-transparent"></div>
          </div>
          <div className="px-5 pb-5 -mt-12 relative z-10">
            <div className="flex justify-center">
              <div className="p-1 bg-white rounded-full shadow-lg">
                <img 
                  src={user?.profile_picture ? `${user.profile_picture}?t=${new Date().getTime()}` : 'https://via.placeholder.com/150'} 
                  alt={user?.name || 'User'} 
                  className="w-20 h-20 rounded-full border-2 border-primary-100"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
                  }}
                />
              </div>
            </div>
            <div className="text-center mt-3">
              <h3 className="text-xl font-semibold text-primary-900">{user?.name || 'User'}</h3>
              <p className="text-gray-600 text-sm flex items-center justify-center mt-1">
                <LocationIcon size={14} className="mr-1" color="var(--md-sys-color-outline)" />
                {'Hyderabad, Telangana'}
              </p>
              <div className="flex items-center justify-center mt-1">
                <SchoolIcon size={14} className="mr-1" color="var(--md-sys-color-secondary)" />
                <span className="text-sm text-gray-600">{user?.college || 'University'}</span>
              </div>
              {/* Connection count removed as requested */}
            </div>
          </div>
        </Card>
        
        <Card variant="elevated" elevation={2} className="mb-6 overflow-hidden transition-all duration-300 hover:shadow-elevation-3">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-primary-900 mb-3">Create Post</h3>
            <div className="flex items-center mb-4">
              <img 
                src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`} 
                alt={user?.name || 'User'} 
                className="w-10 h-10 rounded-full mr-3 border border-gray-100 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
                }}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.college || 'University'}</p>
              </div>
            </div>
            <textarea
              id="post-textarea"
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all mb-3 text-gray-700"
              rows={newPostContent ? 4 : 3}
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedImage(e.target.files[0]);
                      // Show image preview or filename
                      alert(`Selected image: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <button 
                  className="p-2 rounded-full hover:bg-tertiary-50 transition-colors" 
                  title="Add Image"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={20} color="var(--md-sys-color-tertiary)" />
                </button>
                
                <input
                  type="file"
                  ref={attachmentInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedAttachment(e.target.files[0]);
                      // Show attachment filename
                      alert(`Selected file: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <button 
                  className="p-2 rounded-full hover:bg-tertiary-50 transition-colors" 
                  title="Add Attachment"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <AttachmentIcon size={20} color="var(--md-sys-color-tertiary)" />
                </button>
              </div>
              <Button 
                variant="primary" 
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
                className="px-4 py-2 rounded-lg"
              >
                Post
              </Button>
            </div>
            
            {/* Display selected image preview */}
            {selectedImage && (
              <div className="mt-3 relative">
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Selected" 
                  className="w-full h-auto rounded-lg max-h-60 object-contain bg-gray-100" 
                />
                <button 
                  className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                  onClick={() => setSelectedImage(null)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
            
            {/* Display selected attachment */}
            {selectedAttachment && (
              <div className="mt-3 bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <AttachmentIcon size={16} className="mr-2" />
                  <span className="text-sm truncate">{selectedAttachment.name}</span>
                </div>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedAttachment(null)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Create Post Modal (mobile and desktop) */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowCreatePostModal(false)}
            >
              <CloseIcon size={20} />
            </button>
            <h3 className="text-lg font-semibold text-primary-900 mb-3">Create Post</h3>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 aspect-square rounded-full overflow-hidden mr-3 bg-gray-100">
  <img
    src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`}
    alt={user?.name || 'User'}
    className="w-full h-full object-cover"
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      target.onerror = null;
      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
    }}
  />
</div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.college || 'University'}</p>
              </div>
            </div>
            <textarea
              id="post-textarea-modal"
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all mb-3 text-gray-700"
              rows={newPostContent ? 4 : 3}
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <div className="flex space-x-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedImage(e.target.files[0]);
                      alert(`Selected image: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <button
                  className="p-2 rounded-full hover:bg-tertiary-50 transition-colors"
                  title="Add Image"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={20} color="var(--md-sys-color-tertiary)" />
                </button>
                <input
                  type="file"
                  ref={attachmentInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedAttachment(e.target.files[0]);
                      alert(`Selected file: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <button
                  className="p-2 rounded-full hover:bg-tertiary-50 transition-colors"
                  title="Add Attachment"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <AttachmentIcon size={20} color="var(--md-sys-color-tertiary)" />
                </button>
              </div>
              <Button
                variant="primary"
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
                className="px-4 py-2 rounded-lg"
              >
                Post
              </Button>
            </div>
            {/* Display selected image preview */}
            {selectedImage && (
              <div className="mt-3 relative">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="w-full h-auto rounded-lg max-h-60 object-contain bg-gray-100"
                />
                <button
                  className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                  onClick={() => setSelectedImage(null)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
            {/* Display selected attachment */}
            {selectedAttachment && (
              <div className="mt-3 bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <AttachmentIcon size={16} className="mr-2" />
                  <span className="text-sm truncate">{selectedAttachment.name}</span>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedAttachment(null)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content - Posts */}
      <div className="lg:w-2/4 w-full">
        <Card variant="elevated" elevation={2} className="mb-6 overflow-hidden flex flex-col" noHover={true}>
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">What's Happening</h2>
              <div className="relative">
                <div className="flex items-center bg-white/20 rounded-full pl-3 pr-1 py-2">
                  <SearchIcon size={18} className="text-white" />
                  <input 
                    type="text" 
                    placeholder="Search posts..." 
                    className="bg-transparent border-none outline-none text-white placeholder-white/70 text-sm w-28 focus:w-40 transition-all duration-300"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearching(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-1">
                <button 
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-primary-100 text-primary-800 shadow-sm"
                  onClick={() => handleCategoryFilter('all')}
                >
                  All Posts
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowSentimentFilter(!showSentimentFilter)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span>Filter: {selectedSentiment === 'all' ? 'All' : selectedSentiment}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showSentimentFilter && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-100">
                    <div className="py-1">
                      <button 
                        onClick={() => {
                          setSelectedSentiment('all');
                          setShowSentimentFilter(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${selectedSentiment === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        All Sentiments
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedSentiment('Positive');
                          setShowSentimentFilter(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${selectedSentiment === 'Positive' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        Positive
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedSentiment('Neutral');
                          setShowSentimentFilter(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${selectedSentiment === 'Neutral' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                        Neutral
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedSentiment('Negative');
                          setShowSentimentFilter(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${selectedSentiment === 'Negative' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                        Negative
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
            
          {/* Posts list */}
          <div className="p-4 space-y-6 overflow-y-auto thin-scrollbar" style={{ maxHeight: 'calc(80vh - 120px)', minHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              // Loading indicator
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                <p className="text-gray-500">Loading posts...</p>
              </div>
            ) : error ? (
              // Error message
              <div className="flex flex-col items-center justify-center py-10">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                  <p>{error}</p>
                </div>
                <button 
                  className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                  onClick={() => handleCategoryFilter(activeCategory)}
                >
                  Try Again
                </button>
              </div>
            ) : posts.length === 0 ? (
              // No posts found
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-gray-500 mb-4">No posts found.</p>
                {searchQuery && (
                  <p className="text-sm text-gray-400 mb-4">Try a different search term or category.</p>
                )}
                <button 
                  className="px-4 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                  onClick={() => {
                    setSearchQuery('');
                    handleCategoryFilter('all');
                  }}
                >
                  View All Posts
                </button>
              </div>
            ) : (
              // Posts list
              posts.map(post => (
              <div key={post._id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 mb-6">
                {/* Post header */}
                <div className="p-4 flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="relative mr-3">
                      <div className="w-12 h-12 aspect-square rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100">
                        <img 
                          src={post.author && post.author.profile_picture ? `${post.author.profile_picture}?t=${new Date().getTime()}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=random&color=fff&size=150`} 
                          alt={post.author?.name || 'User'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('Post author profile image failed to load:', post.author?.profile_picture);
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=random&color=fff&size=150`;
                          }}
                        />
                      </div>
                      {/* Category icon removed */}
                      {post.author?.name?.includes('Vaddi') && post.author?.name?.includes('Harsha') && (
                        <div className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                          A
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900 text-base flex items-center">
                        {post.author?.name || 'User'}
                        {post.author?.name?.includes('Vaddi') && post.author?.name?.includes('Harsha') && (
                          <span className="ml-2 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
                        )}
                      </h3>
                      <div className="flex items-center text-gray-500 text-xs">
                        <span>{formatDate(post.created_at)}</span>
                        {post.sentiment && (
                          <>
                            <span className="mx-1">•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center ${getSentimentBadgeColor(post.sentiment)}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {post.sentiment}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    {post.author?.id === user?.id && (
                      <div className="flex space-x-1">
                        <div className="relative">
                          <button 
                            className="text-gray-400 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              // Toggle dropdown for selective editing
                              setEditingPostId(post._id);
                              setEditPostContent(post.content);
                              setExistingPostMediaUrl(post.media_urls?.[0]);
                              setShowSelectiveEditModal(true);
                            }}
                          >
                            <EditIcon size={18} />
                          </button>
                        </div>
                        <button 
                          className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                  
                {/* Post content */}
                <div className="px-5 pb-4">
                  <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
                  
                  {/* Display media (images or attachments) - prioritize media_items if available */}
                  {post.media_items && post.media_items.length > 0 ? (
                    <div className="mt-4 rounded-xl overflow-hidden">
                      {post.media_items.map((item, index) => {
                        if (item.is_image) {
                          return (
                            <img 
                              key={index}
                              src={item.url} 
                              alt={item.filename || "Post image"} 
                              className="w-full h-auto max-h-96 object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
                              onClick={() => setFullSizeImage(item.url)}
                            />
                          );
                        } else {
                          // For non-image attachments, show a download link with the original filename
                          return (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between mt-2">
                              <div className="flex items-center">
                                <AttachmentIcon size={20} color="var(--md-sys-color-primary)" />
                                <span className="ml-2 text-sm text-gray-700 truncate max-w-[200px]">
                                  {item.filename || "attachment"}
                                </span>
                              </div>
                              <a 
                                href={`${item.url}${item.url.includes('?') ? '&' : '?'}download=true`}
                                download={item.filename}
                                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  // Track download attempts for analytics
                                  console.log(`Downloading ${item.filename || 'attachment'}`);
                                  
                                  // Remove any v1 prefix if present to ensure compatibility
                                  const cleanUrl = item.url.replace('/api/v1/', '/api/');
                                  if (cleanUrl !== item.url) {
                                    e.preventDefault();
                                    window.open(`${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}download=true`, '_blank');
                                  }
                                  
                                  // Set a timeout to check if download failed
                                  setTimeout(() => {
                                    // This code will run after the download should have started
                                    // We can't reliably detect download failures due to browser security restrictions
                                    // but we can log the attempt
                                    console.log(`Download attempt completed for ${item.filename || 'attachment'}`);
                                  }, 2000);
                                }}
                              >
                                Download
                              </a>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : post.media_urls && post.media_urls.length > 0 ? (
                    // For backward compatibility with older posts using media_urls
                    <div className="mt-4 rounded-xl overflow-hidden">
                      {post.media_urls.map((url, index) => {
                        // Check if it's an image by file extension
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        
                        if (isImage) {
                          return (
                            <img 
                              key={index}
                              src={url} 
                              alt="Post image" 
                              className="w-full h-auto max-h-96 object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
                              onClick={() => setFullSizeImage(url)}
                            />
                          );
                        } else {
                          // For non-image attachments, show a download link
                          const filename = url.split('/').pop() || 'attachment';
                          return (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between mt-2">
                              <div className="flex items-center">
                                <AttachmentIcon size={20} color="var(--md-sys-color-primary)" />
                                <span className="ml-2 text-sm text-gray-700 truncate max-w-[200px]">{filename}</span>
                              </div>
                              <a 
                                href={`${url}${url.includes('?') ? '&' : '?'}download=true`}
                                download={filename}
                                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  // Track download attempts for analytics
                                  console.log(`Downloading ${filename}`);
                                  
                                  // Remove any v1 prefix if present to ensure compatibility
                                  const cleanUrl = url.replace('/api/v1/', '/api/');
                                  if (cleanUrl !== url) {
                                    e.preventDefault();
                                    window.open(`${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}download=true`, '_blank');
                                  }
                                }}
                              >
                                Download
                              </a>
                            </div>
                          );
                        }
                      })}
                    </div>
                  ) : null}
                  
                  {/* For backward compatibility with older posts that might use image property */}
                  {!post.media_urls?.length && !post.media_items?.length && post.image && (
                    <div className="mt-4 rounded-xl overflow-hidden">
                      <img 
                        src={post.image} 
                        alt="Post image" 
                        className="w-full h-auto max-h-96 object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
                        onClick={() => post.image && setFullSizeImage(post.image)}
                      />
                    </div>
                  )}
                </div>
                  
                {/* Post stats */}
                <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      {post.like_count > 0 ? (
                        <>
                          <div className="flex -space-x-1 mr-2">
                            <div className="w-6 h-6 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center text-white text-[10px] shadow-sm">
                              {post.like_count > 3 ? `+${post.like_count - 2}` : <ThumbUpIcon size={12} />}
                            </div>
                            {post.like_count > 1 && (
                              <div className="w-6 h-6 rounded-full bg-secondary-500 border-2 border-white shadow-sm"></div>
                            )}
                            {post.like_count > 2 && (
                              <div className="w-6 h-6 rounded-full bg-tertiary-500 border-2 border-white shadow-sm"></div>
                            )}
                          </div>
                          <span className="text-sm">{post.like_count} {post.like_count === 1 ? 'person' : 'people'} liked this</span>
                        </>
                      ) : (
                        <span className="text-sm">Be the first to like this</span>
                      )}
                    </div>
                    <div className="flex space-x-4">
                      {post.comment_count > 0 && (
                        <span 
                          className="text-sm cursor-pointer hover:text-primary-600 transition-colors"
                          onClick={() => handleCommentClick(post._id)}
                        >
                          {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                        </span>
                      )}
                      {(post.share_count || 0) > 0 && (
                        <span className="text-sm cursor-pointer hover:text-primary-600 transition-colors">
                          {post.share_count} {post.share_count === 1 ? 'share' : 'shares'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                  
                {/* Post actions */}
                <div className="px-2 py-2 border-t border-gray-100 flex flex-nowrap justify-between items-center gap-2">
                  <button
                    className={`flex items-center justify-center min-w-[90px] px-3 py-2 rounded-lg ${post.is_liked ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-600 hover:bg-gray-50'} transition-colors flex-1`}
                    onClick={() => handleLikePost(post._id)}
                  >
                    <ThumbUpIcon size={18} className="mr-2" />
                    <span className="text-sm">{post.is_liked ? 'Liked' : 'Like'}</span>
                  </button>
                  <button
                    className={`flex items-center justify-center min-w-[90px] px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex-1 ${activeComments === post._id ? 'bg-gray-100 font-medium' : ''}`}
                    onClick={() => handleCommentClick(post._id)}
                  >
                    <ChatIcon size={18} className="mr-2" />
                    <span className="text-sm">Comment</span>
                  </button>
                  <div className="flex-1 min-w-[120px] w-full sm:w-auto">
                    <SummarizeButton
                      text={post.content}
                      minLength={100}
                      showSummary={showSummaryFor === post._id}
                      loading={summaryLoadingFor === post._id}
                      onSummary={summary => setPostSummaries(prev => ({ ...prev, [post._id]: summary }))}
                      onShowSummary={show => {
                        setShowSummaryFor(show ? post._id : null);
                        if (!show) setSummaryLoadingFor(null);
                      }}
                      onLoading={loading => setSummaryLoadingFor(loading ? post._id : null)}
                    />
                  </div>
                </div>
                
                {/* Horizontal summary section below all buttons */}
                {showSummaryFor === post._id && postSummaries[post._id] && (
                  <div className="flex flex-row items-start mt-2 w-full bg-primary-50 border border-primary-100 rounded-lg shadow-md p-6 gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 mt-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <div className="flex-1 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {postSummaries[post._id]}
                    </div>
                  </div>
                )}
                
                {/* Comments section - only shown when activeComments matches post._id */}
                {activeComments === post._id && (
                  <div className="border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <div className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-primary-900 flex items-center">
                          <ChatIcon size={18} className="mr-2" color="var(--md-sys-color-primary)" />
                          Comments ({post.comment_count})
                        </h4>
                        <button 
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
                          onClick={() => setActiveComments(null)}
                        >
                          <CloseIcon size={18} />
                        </button>
                      </div>
                      
                      {/* Comment list */}
                      <div className="space-y-6 max-h-96 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                        {commentsLoading && (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                          </div>
                        )}
                        
                        {commentsError && (
                          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            {commentsError}
                            <button 
                              className="ml-2 underline text-primary-600"
                              onClick={() => handleCommentClick(post._id)}
                            >
                              Try again
                            </button>
                          </div>
                        )}
                        
                        {!commentsLoading && !commentsError && postComments[post._id]?.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            No comments yet. Be the first to comment!
                          </div>
                        )}
                        
                        {!commentsLoading && !commentsError && postComments[post._id]?.map(comment => (
                          <div key={comment._id} className="animate-fade-in">
                            <div className="flex items-start">
                              <div className="w-9 h-9 aspect-square rounded-full overflow-hidden mr-3 border border-white shadow-sm bg-gray-100">
                                <img
                                  src={comment.author && comment.author.profile_picture ? comment.author.profile_picture : `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'User')}&background=random&color=fff&size=150`}
                                  alt={comment.author?.name || 'User'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'User')}&background=random&color=fff&size=150`;
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                                  <div className="flex justify-between items-start">
                                    <div className="font-medium text-sm text-primary-900">{comment.author?.name || 'User'}</div>
                                    {comment.author?.id === user?.id && (
                                      <div className="flex space-x-1">
                                        <div className="relative">
                                          <button 
                                            className="text-gray-400 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                            onClick={() => {
                                              // Show selective editing options
                                              setEditingCommentId(comment._id);
                                              setEditCommentContent(comment.content);
                                              setExistingMediaUrl(comment.media_url);
                                              setEditCommentLink(comment.link || '');
                                              setEditingCommentPostId(post._id);
                                              setShowSelectiveCommentEdit(true);
                                            }}
                                            title="Edit comment"
                                          >
                                            <EditIcon size={14} />
                                          </button>
                                        </div>
                                        <button 
                                          className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                          onClick={() => handleDeleteComment(comment._id, post._id)}
                                          title="Delete comment"
                                        >
                                          <DeleteIcon size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {editingCommentId === comment._id ? (
                                    <div className="mt-2">
                                      <textarea
                                        className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                        rows={2}
                                        value={editCommentContent}
                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                        autoFocus
                                      ></textarea>
                                      <div className="flex items-center mt-2 space-x-2">
                                        <div className="flex space-x-1">
                                          <label className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary-500 cursor-pointer">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={handleEditCommentMediaSelect}
                                            />
                                            <ImageIcon size={16} />
                                          </label>
                                          <button 
                                            className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${showEditLinkInput ? 'text-primary-500' : 'text-gray-400 hover:text-primary-500'}`}
                                            onClick={handleEditCommentLinkToggle}
                                          >
                                            <AttachmentIcon size={16} />
                                          </button>
                                        </div>
                                      </div>
                                      {showEditLinkInput && (
                                        <div className="mt-2">
                                          <input
                                            type="url"
                                            placeholder="Enter link URL..."
                                            className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            value={editCommentLink}
                                            onChange={(e) => setEditCommentLink(e.target.value)}
                                          />
                                        </div>
                                      )}
                                      {editCommentMedia && (
                                        <div className="mt-2 relative">
                                          <img
                                            src={URL.createObjectURL(editCommentMedia)}
                                            alt="Selected media"
                                            className="max-h-32 rounded-lg"
                                          />
                                          <button
                                            className="absolute top-1 right-1 p-1 rounded-full bg-gray-800 bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
                                            onClick={() => setEditCommentMedia(null)}
                                          >
                                            <CloseIcon size={14} />
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex justify-end mt-2 space-x-2">
                                        <button 
                                          className="px-2 py-1 rounded-lg text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                                          onClick={() => {
                                            setEditingCommentId(null);
                                            setEditCommentContent('');
                                            setEditCommentMedia(null);
                                            setEditCommentLink('');
                                            setShowEditLinkInput(false);
                                          }}
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          className="px-2 py-1 rounded-lg text-xs bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                                          onClick={() => handleSaveEditedComment(comment._id, post._id)}
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                      {comment.media_url && (
                                        <div className="mt-2">
                                          <img
                                            src={comment.media_url}
                                            alt="Comment media"
                                            className="max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(comment.media_url, '_blank')}
                                          />
                                        </div>
                                      )}
                                      {comment.link && (
                                        <a
                                          href={comment.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-2 block text-sm text-primary-600 hover:text-primary-700 break-all"
                                        >
                                          {comment.link}
                                        </a>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="flex text-xs text-gray-500 mt-1.5 ml-1 space-x-4">
                                  <span className="text-gray-400">{formatDate(comment.created_at)}</span>
                                  <button 
                                    className={`${comment.is_liked ? 'text-primary-600 font-medium' : 'hover:text-gray-700'} transition-colors`}
                                    onClick={() => handleLikeComment(comment._id, post._id)}
                                  >
                                    {comment.is_liked ? 'Liked' : 'Like'} {comment.like_count > 0 && `(${comment.like_count})`}
                                  </button>
                                  <button 
                                    className="hover:text-gray-700 transition-colors"
                                    onClick={() => handleReplyToComment(comment._id)}
                                  >
                                    Reply
                                  </button>
                                </div>
                                
                                {/* Reply input */}
                                {replyingToCommentId === comment._id && (
                                  <div className="mt-3 ml-6">
                                    <div className="flex items-start bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <div className="w-7 h-7 aspect-square rounded-full overflow-hidden mr-2 border border-gray-100 bg-gray-100">
                                        <img
                                          src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`}
                                          alt={user?.name || 'User'}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1 relative">
                                        <textarea
                                          className="w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0 placeholder-gray-400 resize-none"
                                          rows={1}
                                          placeholder={`Reply to ${comment.author?.name || 'User'}...`}
                                          value={newComment}
                                          onChange={(e) => setNewComment(e.target.value)}
                                          style={{ minHeight: '36px' }}
                                          autoFocus
                                        ></textarea>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                          <button 
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                            onClick={() => setReplyingToCommentId(null)}
                                          >
                                            Cancel
                                          </button>
                                          <button 
                                            className={`p-1.5 rounded-full ${newComment.trim() ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'} transition-colors`}
                                            onClick={() => handleSaveReply(post._id, comment._id)}
                                            disabled={!newComment.trim()}
                                          >
                                            <SendIcon size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add comment */}
                      <div className="flex items-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <img 
                          src={user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`} 
                          alt={user?.name || 'User'} 
                          className="w-9 h-9 rounded-full mr-3 border border-gray-100 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=150`;
                          }}
                        />
                        <div className="flex-1 relative">
                          <textarea
                            className="w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0 placeholder-gray-400 resize-none"
                            rows={1}
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ minHeight: '36px' }}
                          ></textarea>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                            <div className="flex space-x-1">
                              <label className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary-500 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleCommentMediaSelect}
                                />
                                <ImageIcon size={16} />
                              </label>
                              <button 
                                className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${showLinkInput ? 'text-primary-500' : 'text-gray-400 hover:text-primary-500'}`}
                                onClick={handleCommentLinkToggle}
                              >
                                <AttachmentIcon size={16} />
                              </button>
                            </div>
                            <button 
                              className={`p-1.5 rounded-full ${newComment.trim() || commentMedia || commentLink ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'} transition-colors`}
                              onClick={() => handleAddComment(post._id)}
                              disabled={!newComment.trim() && !commentMedia && !commentLink}
                            >
                              <SendIcon size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {showLinkInput && (
                        <div className="mt-2">
                          <input
                            type="url"
                            placeholder="Enter link URL..."
                            className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={commentLink}
                            onChange={handleCommentLinkChange}
                          />
                        </div>
                      )}
                      {commentMedia && (
                        <div className="mt-2 relative">
                          <img
                            src={URL.createObjectURL(commentMedia)}
                            alt="Selected media"
                            className="max-h-32 rounded-lg"
                          />
                          <button
                            className="absolute top-1 right-1 p-1 rounded-full bg-gray-800 bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
                            onClick={() => setCommentMedia(null)}
                          >
                            <CloseIcon size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )))}
          </div>
        </Card>
      </div>
      
      {/* Right sidebar - News and events */}
      <div className="lg:w-1/4">
        <div className="hidden lg:block">
          <CampusNews />
          <UpcomingEvents />
        </div>
      </div>
      
      {/* Full-size image modal */}
      {fullSizeImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-5xl max-h-screen">
            <img 
              src={fullSizeImage} 
              alt="Full size image" 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button 
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setFullSizeImage(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Edit Post Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowEditModal(false);
                setEditingPostId(null);
                setEditPostContent('');
                setEditPostMedia(null);
                setExistingPostMediaUrl(undefined);
              }}
            >
              <CloseIcon size={20} />
            </button>
            <h3 className="text-lg font-semibold text-primary-900 mb-3">Edit Post</h3>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all mb-3 text-gray-700"
              rows={4}
              value={editPostContent}
              onChange={(e) => setEditPostContent(e.target.value)}
            ></textarea>
            
            {/* Media section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Media</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="edit-post-media"
                  onChange={handleEditPostMediaSelect}
                />
                <label
                  htmlFor="edit-post-media"
                  className="p-2 rounded-full hover:bg-tertiary-50 transition-colors cursor-pointer"
                  title="Add Image"
                >
                  <ImageIcon size={20} color="var(--md-sys-color-tertiary)" />
                </label>
              </div>
              
              {/* Show existing or new media preview */}
              {(existingPostMediaUrl || editPostMedia) && (
                <div className="relative">
                  <img
                    src={editPostMedia ? URL.createObjectURL(editPostMedia) : existingPostMediaUrl}
                    alt="Post media"
                    className="w-full h-auto rounded-lg max-h-60 object-contain bg-gray-100"
                  />
                  <button
                    className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                    onClick={handleRemovePostMedia}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPostId(null);
                  setEditPostContent('');
                  setEditPostMedia(null);
                  setExistingPostMediaUrl(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEditedPost}
                disabled={!editPostContent.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selective Post Edit Modal */}
      {showSelectiveEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowSelectiveEditModal(false);
                setEditingPostId(null);
                setEditingPostComponent(null);
                setEditPostContent('');
                setEditPostMedia(null);
                setExistingPostMediaUrl(undefined);
              }}
            >
              <CloseIcon size={20} />
            </button>
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Edit Post</h3>
            
            {/* Edit Options */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">What would you like to edit?</p>
              <div className="space-y-2">
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingPostComponent === 'text' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingPostComponent('text')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">📝</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Text Only</div>
                      <div className="text-sm text-gray-500">Update the post content</div>
                    </div>
                  </div>
                </button>
                
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingPostComponent === 'media' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingPostComponent('media')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🖼️</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Media & Documents</div>
                      <div className="text-sm text-gray-500">Change images or documents</div>
                    </div>
                  </div>
                </button>
                
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingPostComponent === 'all' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingPostComponent('all')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">✏️</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Everything</div>
                      <div className="text-sm text-gray-500">Update text and media together</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Edit Content Based on Selection */}
            {editingPostComponent && (
              <div className="space-y-4">
                {(editingPostComponent === 'text' || editingPostComponent === 'all') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Post Content</label>
                    <textarea
                      className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-700"
                      rows={4}
                      value={editPostContent}
                      onChange={(e) => setEditPostContent(e.target.value)}
                      placeholder="What's on your mind?"
                    ></textarea>
                  </div>
                )}
                
                {(editingPostComponent === 'media' || editingPostComponent === 'all') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Media & Documents</label>
                    <div className="space-y-3">
                      {/* Image Upload */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Add or change image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="selective-edit-post-media"
                          onChange={handleEditPostMediaSelect}
                        />
                        <label
                          htmlFor="selective-edit-post-media"
                          className="p-2 rounded-full hover:bg-tertiary-50 transition-colors cursor-pointer"
                          title="Add Image"
                        >
                          <ImageIcon size={20} color="var(--md-sys-color-tertiary)" />
                        </label>
                      </div>
                      
                      {/* Document Upload */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Add or change document</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                          className="hidden"
                          id="selective-edit-post-attachment"
                          onChange={handleEditPostAttachmentSelect}
                        />
                        <label
                          htmlFor="selective-edit-post-attachment"
                          className="p-2 rounded-full hover:bg-tertiary-50 transition-colors cursor-pointer"
                          title="Add Document"
                        >
                          <AttachmentIcon size={20} color="var(--md-sys-color-tertiary)" />
                        </label>
                      </div>
                    </div>
                    
                    {/* Show existing or new media preview */}
                    {(existingPostMediaUrl || editPostMedia) && (
                      <div className="relative mt-3">
                        <img
                          src={editPostMedia ? URL.createObjectURL(editPostMedia) : existingPostMediaUrl}
                          alt="Post media"
                          className="w-full h-auto rounded-lg max-h-60 object-contain bg-gray-100"
                        />
                        <button
                          className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                          onClick={handleRemovePostMedia}
                        >
                          <CloseIcon size={16} />
                        </button>
                      </div>
                    )}
                    
                    {/* Show existing or new attachment preview */}
                    {(existingPostAttachmentUrl || editPostAttachment) && (
                      <div className="relative mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <AttachmentIcon size={20} color="var(--md-sys-color-primary)" />
                            <span className="ml-2 text-sm text-gray-700 truncate max-w-[200px]">
                              {editPostAttachment ? editPostAttachment.name : 'Document'}
                            </span>
                          </div>
                          <button
                            className="bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                            onClick={handleRemovePostAttachment}
                          >
                            <CloseIcon size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSelectiveEditModal(false);
                  setEditingPostId(null);
                  setEditingPostComponent(null);
                  setEditPostContent('');
                  setEditPostMedia(null);
                  setExistingPostMediaUrl(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSelectivePostEdit}
                disabled={!editingPostId || !editingPostComponent}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selective Comment Edit Modal */}
      {showSelectiveCommentEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowSelectiveCommentEdit(false);
                setEditingCommentId(null);
                setEditingCommentComponent(null);
                setEditCommentContent('');
                setEditCommentMedia(null);
                setEditCommentLink('');
                setExistingMediaUrl(undefined);
              }}
            >
              <CloseIcon size={20} />
            </button>
            <h3 className="text-lg font-semibold text-primary-900 mb-4">Edit Comment</h3>
            
            {/* Edit Options */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">What would you like to edit?</p>
              <div className="space-y-2">
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingCommentComponent === 'text' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingCommentComponent('text')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">📝</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Text Only</div>
                      <div className="text-sm text-gray-500">Update the comment content</div>
                    </div>
                  </div>
                </button>
                
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingCommentComponent === 'media' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingCommentComponent('media')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🖼️</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Media Only</div>
                      <div className="text-sm text-gray-500">Change image</div>
                    </div>
                  </div>
                </button>
                
                <button
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    editingCommentComponent === 'link' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setEditingCommentComponent('link')}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">🔗</span>
                    <div className="text-left">
                      <div className="font-medium">Edit Link Only</div>
                      <div className="text-sm text-gray-500">Update or add a link</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Edit Content Based on Selection */}
            {editingCommentComponent && (
              <div className="space-y-4">
                {editingCommentComponent === 'text' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Comment Content</label>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-700"
                      rows={3}
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      placeholder="Write your comment..."
                    ></textarea>
                  </div>
                )}
                
                {editingCommentComponent === 'media' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Media</label>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Add or change image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="selective-edit-comment-media"
                        onChange={handleEditCommentMediaSelect}
                      />
                      <label
                        htmlFor="selective-edit-comment-media"
                        className="p-2 rounded-full hover:bg-tertiary-50 transition-colors cursor-pointer"
                        title="Add Image"
                      >
                        <ImageIcon size={20} color="var(--md-sys-color-tertiary)" />
                      </label>
                    </div>
                    
                    {/* Show existing or new media preview */}
                    {(existingMediaUrl || editCommentMedia) && (
                      <div className="relative">
                        <img
                          src={editCommentMedia ? URL.createObjectURL(editCommentMedia) : existingMediaUrl}
                          alt="Comment media"
                          className="w-full h-auto rounded-lg max-h-40 object-contain bg-gray-100"
                        />
                        <button
                          className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70"
                          onClick={() => {
                            setEditCommentMedia(null);
                            setExistingMediaUrl(undefined);
                          }}
                        >
                          <CloseIcon size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {editingCommentComponent === 'link' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Link</label>
                    <input
                      type="url"
                      placeholder="Enter link URL..."
                      className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-700"
                      value={editCommentLink}
                      onChange={(e) => setEditCommentLink(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSelectiveCommentEdit(false);
                  setEditingCommentId(null);
                  setEditingCommentComponent(null);
                  setEditCommentContent('');
                  setEditCommentMedia(null);
                  setEditCommentLink('');
                  setExistingMediaUrl(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => editingCommentId && handleSaveSelectiveCommentEdit(editingCommentId, editingCommentPostId)}
                disabled={!editingCommentComponent || (editingCommentComponent === 'text' && !editCommentContent.trim())}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
