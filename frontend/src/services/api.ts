// API service for handling all backend requests
const API_URL = 'http://localhost:5000/api';

// Flag to determine if we should use mock data (when backend is not available)
const USE_MOCK_DATA = false; // Set to false to use the real backend

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Mock data for when backend is not available
const mockData = {
  // Mock user data
  users: {
    login: {
      status: 'success',
      message: 'Login successful',
      data: {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          name: 'Harshavardhan Vaddi',
          username: 'harshavardhan',
          email: 'harshavardhan@example.com',
          role: 'student',
          profile_picture: 'https://via.placeholder.com/150'
        }
      }
    },
    register: {
      status: 'success',
      message: 'Registration successful',
      data: {
        user_id: '1',
        verification_code: '123456'
      }
    },
    profile: {
      status: 'success',
      message: 'Profile retrieved successfully',
      data: {
        id: '1',
        name: 'Harshavardhan Vaddi',
        username: 'harshavardhan',
        email: 'harshavardhan@example.com',
        role: 'student',
        profile_picture: 'https://via.placeholder.com/150',
        bio: 'Computer Science student at Osmania University',
        university: 'Osmania University',
        year: '2025',
        department: 'Computer Science'
      }
    }
  },
  
  // Mock social feed data
  social: {
    posts: {
      status: 'success',
      message: 'Posts retrieved successfully',
      data: {
        posts: [
          {
            _id: '1',
            title: 'Exciting Remote Internship Opportunity Alert!',
            content: 'We are hiring for multiple positions including Web Development, Java Full Stack, Data Science, and UI/UX Design. Apply now!',
            category: 'opportunity',
            author: {
              id: '2',
              username: 'codtech',
              name: 'CODTECH IT SOLUTIONS',
              profile_picture: 'https://via.placeholder.com/50'
            },
            created_at: new Date(Date.now()).toISOString(), 
            updated_at: null,
            tags: ['internship', 'hiring', 'webdev'],
            is_anonymous: false,
            media_urls: ['https://via.placeholder.com/600x300'],
            comment_count: 5,
            like_count: 12,
            is_liked: false
          },
          {
            _id: '2',
            title: 'Looking for project partners',
            content: 'I\'m working on a machine learning project focused on computer vision. Looking for 2-3 teammates who are interested in AI/ML. Please comment if interested!',
            category: 'project_idea',
            author: {
              id: '3',
              username: 'aishwarya',
              name: 'Aishwarya Reddy',
              profile_picture: 'https://via.placeholder.com/50'
            },
            created_at: new Date(Date.now()).toISOString(), // 2 days ago
            updated_at: null,
            tags: ['machinelearning', 'AI', 'project'],
            is_anonymous: false,
            media_urls: [],
            comment_count: 3,
            like_count: 7,
            is_liked: true
          },
          {
            _id: '3',
            title: 'Campus Hackathon Next Week',
            content: 'The Computer Science department is organizing a 24-hour hackathon next weekend. Theme: Sustainable Technology Solutions. Register your team by Wednesday!',
            category: 'events',
            author: {
              id: '4',
              username: 'csdept',
              name: 'CS Department',
              profile_picture: 'https://via.placeholder.com/50'
            },
            created_at: new Date(Date.now()).toISOString(), // 15 minutes ago
            updated_at: null,
            tags: ['hackathon', 'event', 'sustainability'],
            is_anonymous: false,
            media_urls: ['https://via.placeholder.com/600x300'],
            comment_count: 8,
            like_count: 25,
            is_liked: false
          }
        ],
        total: 3,
        page: 1,
        limit: 20
      }
    },
    post: {
      status: 'success',
      message: 'Post retrieved successfully',
      data: {
        post: {
          _id: '1',
          title: 'Exciting Remote Internship Opportunity Alert!',
          content: 'We are hiring for multiple positions including Web Development, Java Full Stack, Data Science, and UI/UX Design. Apply now!',
          category: 'opportunity',
          author: {
            id: '2',
            username: 'codtech',
            name: 'CODTECH IT SOLUTIONS',
            profile_picture: 'https://via.placeholder.com/50'
          },
          created_at: new Date(Date.now()).toISOString(),
          updated_at: null,
          tags: ['internship', 'hiring', 'webdev'],
          is_anonymous: false,
          media_urls: ['https://via.placeholder.com/600x300'],
          comment_count: 5,
          like_count: 12,
          is_liked: false,
          comments: [
            {
              _id: 'c1',
              content: 'Is this open for first-year students?',
              author: {
                id: '5',
                username: 'priya',
                name: 'Priya Sharma',
                profile_picture: 'https://via.placeholder.com/50'
              },
              created_at: new Date().toISOString(),
              is_anonymous: false,
              like_count: 2,
              is_liked: false
            },
            {
              _id: 'c2',
              content: 'What is the application deadline?',
              author: {
                id: '6',
                username: 'rahul',
                name: 'Rahul Kumar',
                profile_picture: 'https://via.placeholder.com/50'
              },
              created_at: new Date().toISOString(),
              is_anonymous: false,
              like_count: 0,
              is_liked: false
            }
          ]
        }
      }
    },
    createPost: {
      status: 'success',
      message: 'Post created successfully',
      data: {
        post_id: '4',
        is_moderated: false,
        post: {
          _id: '4',
          title: 'New Post',
          content: 'This is a new post created by the user',
          category: 'general',
          author: {
            id: '1',
            username: 'harshavardhan',
            name: 'Harshavardhan Vaddi',
            profile_picture: 'https://via.placeholder.com/150'
          },
          created_at: new Date().toISOString(),
          updated_at: null,
          tags: [],
          is_anonymous: false,
          media_urls: [],
          comment_count: 0,
          like_count: 0,
          is_liked: false
        }
      }
    },
    createComment: {
      status: 'success',
      message: 'Comment created successfully',
      data: {
        comment: {
          _id: 'c3',
          content: 'This is a new comment',
          author: {
            id: '1',
            username: 'harshavardhan',
            name: 'Harshavardhan Vaddi',
            profile_picture: 'https://via.placeholder.com/150'
          },
          created_at: new Date().toISOString(),
          is_anonymous: false,
          like_count: 0,
          is_liked: false
        }
      }
    },
    likePost: {
      status: 'success',
      message: 'Post liked successfully',
      data: {}
    },
    likeComment: {
      status: 'success',
      message: 'Comment liked successfully',
      data: {
        comment: {
          _id: 'c3',
          content: 'This is a comment',
          author: {
            id: '1',
            username: 'harshavardhan',
            name: 'Harshavardhan Vaddi',
            profile_picture: 'https://via.placeholder.com/150'
          },
          created_at: new Date().toISOString(),
          is_anonymous: false,
          like_count: 1,
          is_liked: true
        }
      }
    }
  }
};

// Authentication API
const authAPI = {
  // Login user
  login: async (email: string, password: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for login');
        return mockData.users.login;
      }
      
      console.log('Attempting login with:', { email });
      
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });
      
      const data = await handleResponse(response);
      console.log('Login API response:', data);
      
      // Ensure the response has the expected structure
      if (!data || !data.data || !data.data.token) {
        console.error('Invalid login response structure:', data);
        throw new Error('Invalid response from server');
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      if (USE_MOCK_DATA) {
        return mockData.users.login;
      }
      throw error;
    }
  },
  
  // Register user
  register: async (userData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for register');
        return mockData.users.register;
      }
      
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Register error:', error);
      if (USE_MOCK_DATA) {
        return mockData.users.register;
      }
      throw error;
    }
  },
  
  // Verify email
  verifyEmail: async (email: string, verificationCode: string) => {
    const response = await fetch(`${API_URL}/users/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, verification_code: verificationCode }),
    });
    
    return handleResponse(response);
  },

  // Initiate forgot password process
  initiateForgotPassword: async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/users/forgot-password/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Initiate forgot password error:', error);
      throw error;
    }
  },

  // Verify security answer
  verifySecurityAnswer: async (email: string, securityAnswer: string) => {
    try {
      const response = await fetch(`${API_URL}/users/forgot-password/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, security_answer: securityAnswer }),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Verify security answer error:', error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (resetToken: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_URL}/users/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },
};

// Social feed API
const socialAPI = {

  // Clear all posts (development only)
  clearAllPosts: async (token: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Mock: Clearing all posts');
        return {
          status: 'success',
          message: 'All posts cleared successfully',
          data: {
            posts_deleted: 0,
            comments_deleted: 0,
            likes_deleted: 0
          }
        };
      }
      
      const response = await fetch(`${API_URL}/social-feed/clear-all-posts`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('ClearAllPosts error:', error);
      throw error;
    }
  },

  // Get a single post with comments
  getPost: async (token: string, postId: string) => {
    try {
      if (USE_MOCK_DATA) {
        return mockData.social.post;
      }
      
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('GetPost error:', error);
      throw error;
    }
  },

  // Get posts
  getPosts: async (token: string, skip: number = 0, limit: number = 20, category?: string, search?: string, sentiment?: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getPosts');
        // Filter mock posts by category if provided
        if (category) {
          const filteredPosts = mockData.social.posts.data.posts.filter(post => post.category === category);
          return {
            ...mockData.social.posts,
            data: {
              ...mockData.social.posts.data,
              posts: filteredPosts
            }
          };
        }
        return mockData.social.posts;
      }
      
      let url = `${API_URL}/social-feed/posts?skip=${skip}&limit=${limit}`;
      
      if (category) {
        url += `&category=${category}`;
      }
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (sentiment) {
        url += `&sentiment=${sentiment}`;
      }
      
      console.log('Making API request to:', url);
      console.log('Using token:', token);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log('API response status:', response.status);
      
      return handleResponse(response);
    } catch (error) {
      console.error('GetPosts error:', error);
      if (USE_MOCK_DATA) {
        // Filter mock posts by category if provided
        if (category) {
          const filteredPosts = mockData.social.posts.data.posts.filter(post => post.category === category);
          return {
            ...mockData.social.posts,
            data: {
              ...mockData.social.posts.data,
              posts: filteredPosts
            }
          };
        }
        return mockData.social.posts;
      }
      throw error;
    }
  },
  
  // Create post with media (images and attachments)
  createPostWithMedia: async (token: string, formData: FormData) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for createPostWithMedia');
        return mockData.social.createPost;
      }
      
      // Get the content from formData
      const content = formData.get('content') as string;
      
      // If content is large, split it into chunks
      const CHUNK_SIZE = 50000; // 50KB chunks
      if (content && content.length > CHUNK_SIZE) {
        // Remove the original content from formData
        formData.delete('content');
        
        // Split content into chunks
        const chunks = [];
        let remainingContent = content;
        while (remainingContent.length > 0) {
          chunks.push(remainingContent.slice(0, CHUNK_SIZE));
          remainingContent = remainingContent.slice(CHUNK_SIZE);
        }
        
        // Add chunks to formData
        chunks.forEach((chunk, index) => {
          formData.append(`content_chunk_${index}`, chunk);
        });
        formData.append('content_chunks_count', chunks.length.toString());
      }
      
      const response = await fetch(`${API_URL}/social-feed/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header when sending FormData
        },
        body: formData
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('CreatePostWithMedia error:', error);
      throw error;
    }
  },
  
  // Create post
  createPost: async (token: string, postData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for createPost');
        // Update the mock post with the actual content
        const mockPost = {
          ...mockData.social.createPost,
          data: {
            post: {
              ...mockData.social.createPost.data.post,
              title: postData.title || 'New Post',
              content: postData.content,
              category: postData.category || 'general',
              created_at: new Date().toISOString()
            }
          }
        };
        return mockPost;
      }
      
      // If content is large, split it into chunks
      const CHUNK_SIZE = 50000; // 50KB chunks
      if (postData.content && postData.content.length > CHUNK_SIZE) {
        const chunks = [];
        let remainingContent = postData.content;
        while (remainingContent.length > 0) {
          chunks.push(remainingContent.slice(0, CHUNK_SIZE));
          remainingContent = remainingContent.slice(CHUNK_SIZE);
        }
        
        // Replace content with chunks
        const modifiedPostData = {
          ...postData,
          content_chunks: chunks
        };
        delete modifiedPostData.content;
        
        const response = await fetch(`${API_URL}/social-feed/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(modifiedPostData),
        });
        
        return handleResponse(response);
      }
      
      // For small content, proceed normally
      const response = await fetch(`${API_URL}/social-feed/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('CreatePost error:', error);
      throw error;
    }
  },
  
  // Update post
  updatePost: async (token: string, postId: string, postData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for updatePost');
        // Return success response
        return {
          status: 'success',
          message: 'Post updated successfully',
          data: {
            post: {
              _id: postId,
              title: postData.title || 'Updated Post',
              content: postData.content,
              updated_at: new Date().toISOString()
            }
          }
        };
      }
      
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('UpdatePost error:', error);
      if (USE_MOCK_DATA) {
        return {
          status: 'success',
          message: 'Post updated successfully',
          data: {
            post: {
              _id: postId,
              title: postData.title || 'Updated Post',
              content: postData.content,
              updated_at: new Date().toISOString()
            }
          }
        };
      }
      throw error;
    }
  },
  
  // Delete post
  deletePost: async (token: string, postId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for deletePost');
        // Return success response
        return {
          status: 'success',
          message: 'Post deleted successfully',
          data: {
            post_id: postId
          }
        };
      }
      
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('DeletePost error:', error);
      if (USE_MOCK_DATA) {
        return {
          status: 'success',
          message: 'Post deleted successfully',
          data: {
            post_id: postId
          }
        };
      }
      throw error;
    }
  },
  
  // Like post
  likePost: async (token: string, postId: string) => {
    const response = await fetch(`${API_URL}/social-feed/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return handleResponse(response);
  },
  
  // Comment on post with media
  commentOnPostWithMedia: async (token: string, postId: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add comment with media');
      }
      return data;
    } catch (error) {
      console.error('Error in commentOnPostWithMedia:', error);
      throw error;
    }
  },
  
  // Add comment on post with optional link
  commentOnPost: async (token: string, postId: string, content: string, link?: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, link })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }
      return data;
    } catch (error) {
      console.error('Error in commentOnPost:', error);
      throw error;
    }
  },
  
  // Like comment
  likeComment: async (token: string, commentId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for likeComment');
        return mockData.social.likeComment;
      }
      
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('LikeComment error:', error);
      throw error;
    }
  },
  
  // Delete comment
  deleteComment: async (token: string, commentId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for deleteComment');
        return {
          status: 'success',
          message: 'Comment deleted successfully',
          data: {
            comment_id: commentId
          }
        };
      }
      
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('DeleteComment error:', error);
      throw error;
    }
  },
  
  // Get comments for a post
  getPostComments: async (token: string, postId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getPostComments');
        // Return mock comments for the post
        return {
          status: 'success',
          message: 'Comments retrieved successfully',
          data: {
            comments: mockData.social.post.data.post.comments || []
          }
        };
      }
      
      console.log(`Fetching comments for post ${postId}`);
      
      // Use the dedicated endpoint for fetching comments
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/comments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      // If the response is not ok, throw an error
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw response data:', data);
      
      // Check if the response is valid
      if (data.status === 'success' && data.data && Array.isArray(data.data.comments)) {
        console.log(`Found ${data.data.comments.length} comments`);
        return data;
      } else {
        console.log('No comments found or invalid response format');
        return {
          status: 'success',
          message: 'No comments found',
          data: {
            comments: []
          }
        };
      }
    } catch (error) {
      console.error('GetPostComments error:', error);
      if (USE_MOCK_DATA) {
        return {
          status: 'success',
          message: 'Comments retrieved successfully',
          data: {
            comments: mockData.social.post.data.post.comments || []
          }
        };
      }
      throw error;
    }
  },

  // Update post with media
  updatePostWithMedia: async (token: string, postId: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdatePostWithMedia error:', error);
      throw error;
    }
  },

  // Update only post text
  updatePostText: async (token: string, postId: string, content: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/text`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdatePostText error:', error);
      throw error;
    }
  },

  // Update only post media
  updatePostMedia: async (token: string, postId: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/media`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdatePostMedia error:', error);
      throw error;
    }
  },

  // Remove post media
  removePostMedia: async (token: string, postId: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/remove-media`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return handleResponse(response);
    } catch (error) {
      console.error('RemovePostMedia error:', error);
      throw error;
    }
  },

  // Update comment with media
  updateCommentWithMedia: async (token: string, commentId: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateCommentWithMedia error:', error);
      throw error;
    }
  },

  // Update only comment text
  updateCommentText: async (token: string, commentId: string, content: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}/text`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateCommentText error:', error);
      throw error;
    }
  },

  // Update only comment media
  updateCommentMedia: async (token: string, commentId: string, formData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}/media`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateCommentMedia error:', error);
      throw error;
    }
  },

  // Update only comment link
  updateCommentLink: async (token: string, commentId: string, link: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}/link`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ link }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateCommentLink error:', error);
      throw error;
    }
  },

  // Remove comment media
  removeCommentMedia: async (token: string, commentId: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}/remove-media`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return handleResponse(response);
    } catch (error) {
      console.error('RemoveCommentMedia error:', error);
      throw error;
    }
  },

  // Update comment with content and optional link
  updateComment: async (token: string, commentId: string, content: string, link?: string, existingMediaUrl?: string) => {
    try {
      const response = await fetch(`${API_URL}/social-feed/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, link, media_url: existingMediaUrl }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateComment error:', error);
      throw error;
    }
  },

  // Create comment
  createComment: async (token: string, postId: string, formData: FormData) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for createComment');
        return {
          status: 'success',
          message: 'Comment created successfully',
          data: {
            comment: {
              _id: `mock-${Date.now()}`,
              content: formData.get('content') as string,
              author: {
                id: '1',
                username: 'user',
                name: 'User',
                profile_picture: 'https://via.placeholder.com/150'
              },
              created_at: new Date().toISOString(),
              is_anonymous: false,
              like_count: 0,
              is_liked: false,
              media_url: formData.get('image') ? 'https://via.placeholder.com/300' : undefined,
              link: formData.get('link') as string || undefined
            }
          }
        };
      }

      const response = await fetch(`${API_URL}/social-feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      return handleResponse(response);
    } catch (error) {
      console.error('CreateComment error:', error);
      throw error;
    }
  },
};

// User API
const userAPI = {
  // Get user profile
  getProfile: async (token: string, userId?: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getProfile');
        return mockData.users.profile.data;
      }
      
      const endpoint = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users/profile`;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('GetProfile error:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateProfile: async (token: string, profileData: any, userId?: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for updateProfile');
        return {
          status: 'success',
          message: 'Profile updated successfully',
          data: {
            ...mockData.users.profile.data,
            ...profileData
          }
        };
      }
      
      const endpoint = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users/profile`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('UpdateProfile error:', error);
      throw error;
    }
  },
  
  // Upload profile image
  uploadProfileImage: async (token: string, formData: FormData, userId?: string, imageType: 'profile' | 'background' = 'profile') => {
    try {
      if (USE_MOCK_DATA) {
        console.log(`Using mock data for ${imageType} image upload`);
        // Return a fake URL for testing
        if (imageType === 'profile') {
          return { 
            status: 'success',
            message: 'Profile image updated successfully',
            data: {
              profile_picture: 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=150'
            }
          };
        } else {
          return { 
            status: 'success',
            message: 'Background image updated successfully',
            data: {
              background_image: 'https://via.placeholder.com/500x200/3b5998/ffffff'
            }
          };
        }
      }
      
      // Determine the endpoint based on whether userId is provided and image type
      let endpoint;
      if (imageType === 'profile') {
        endpoint = userId ? `${API_URL}/users/${userId}/profile-image` : `${API_URL}/users/profile/image`;
      } else {
        endpoint = userId ? `${API_URL}/users/${userId}/background-image` : `${API_URL}/users/profile/background-image`;
      }
      console.log(`Uploading ${imageType} image to ${endpoint}`);
      
      // Rename the form field based on the image type
      // This is necessary because the backend expects different field names
      if (formData.has('background_image') && imageType === 'background') {
        // Keep it as is - the backend expects 'background_image'
      } else if (formData.has('profile_image') && imageType === 'profile') {
        // Keep it as is - the backend expects 'profile_image'
      } else {
        // If the form field doesn't match what the backend expects, rename it
        const fileField = Array.from(formData.keys())[0]; // Get the first field name
        if (fileField && formData.has(fileField)) {
          const file = formData.get(fileField);
          formData.delete(fileField);
          
          // Add with the correct field name
          if (imageType === 'profile') {
            formData.append('profile_image', file as Blob);
          } else {
            formData.append('background_image', file as Blob);
          }
        }
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await handleResponse(response);
      console.log(`${imageType} image upload response:`, result);
      
      if (result.status === 'success') {
        return result;
      } else {
        throw new Error(result.message || 'Failed to upload profile image');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  },
  
  // Delete user account
  deleteAccount: async (token: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for deleteAccount');
        return {
          status: 'success',
          message: 'Account deleted successfully'
        };
      }
      
      const response = await fetch(`${API_URL}/users/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('DeleteAccount error:', error);
      throw error;
    }
  },
};

// Campus News API
const campusNewsAPI = {
  // Get all campus news
  getNews: async (token: string, params?: { sentiment?: string }) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getNews');
        return {
          status: 'success',
          message: 'News retrieved successfully',
          data: {
            news: [
              {
                id: '1',
                title: 'Annual Tech Fest Announced',
                content: 'The annual tech fest will be held from June 15-17. Register now to participate in various events and workshops.',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                readers: 120,
                category: 'announcement'
              },
              {
                id: '2',
                title: 'Workshop on AI/ML Basics',
                content: 'A workshop on AI/ML basics will be conducted by Prof. Sharma on June 10. All students are welcome to attend.',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                readers: 85,
                category: 'workshop'
              },
              {
                id: '3',
                title: 'Campus Placement Drive',
                content: 'A campus placement drive will be held on June 5. All eligible students must register by June 3.',
                date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                readers: 210,
                category: 'placement'
              }
            ]
          }
        };
      }
      
      const response = await fetch(`${API_URL}/campus/news`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching campus news:', error);
      throw error;
    }
  },
  
  // Add a news item (admin only)
  addNews: async (token: string, newsData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for addNews');
        return {
          status: 'success',
          message: 'News added successfully',
          data: {
            news: {
              id: Date.now().toString(),
              ...newsData,
              date: new Date().toISOString(),
              readers: 0
            }
          }
        };
      }
      
      const response = await fetch(`${API_URL}/campus/news`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newsData)
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error adding campus news:', error);
      throw error;
    }
  },
  
  // Update a news item (admin only)
  updateNews: async (token: string, newsId: string, newsData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for updateNews');
        return {
          status: 'success',
          message: 'News updated successfully',
          data: {
            news: {
              id: newsId,
              ...newsData,
              date: new Date().toISOString()
            }
          }
        };
      }
      
      const response = await fetch(`${API_URL}/campus/news/${newsId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newsData)
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating campus news:', error);
      throw error;
    }
  },
  
  // Delete a news item (admin only)
  deleteNews: async (token: string, newsId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for deleteNews');
        return {
          status: 'success',
          message: 'News deleted successfully'
        };
      }
      
      const response = await fetch(`${API_URL}/campus/news/${newsId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting campus news:', error);
      throw error;
    }
  }
};

// Events API
// Helper function to get events from local storage
const getEventsFromLocalStorage = () => {
  try {
    const eventsJson = localStorage.getItem('campus_events');
    if (eventsJson) {
      return JSON.parse(eventsJson);
    }
  } catch (err) {
    console.error('Error reading events from local storage:', err);
  }
  return [];
};

// Helper function to save events to local storage
const saveEventsToLocalStorage = (events: any[]) => {
  try {
    localStorage.setItem('campus_events', JSON.stringify(events));
    return true;
  } catch (err) {
    console.error('Error saving events to local storage:', err);
    return false;
  }
};

const eventsAPI = {
  // Get all events
  getEvents: async (token: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getEvents');
        return {
          status: 'success',
          message: 'Events retrieved successfully',
          data: {
            events: [
              {
                id: '1',
                title: 'Web Development Workshop',
                description: 'Learn the basics of HTML, CSS, and JavaScript',
                date: '2025-05-28T14:00:00Z',
                location: 'Room 101, CS Building',
                organizer: 'CS Department',
                category: 'workshop',
                day: 28,
                month: 'May',
                time: '2:00 PM',
                status: 'upcoming'
              },
              {
                id: '2',
                title: 'Resume Building Session',
                description: 'Tips and tricks for creating an effective resume',
                date: '2025-06-02T11:00:00Z',
                location: 'Seminar Hall, Main Building',
                organizer: 'Career Services',
                category: 'career',
                day: 2,
                month: 'Jun',
                time: '11:00 AM',
                status: 'upcoming'
              },
              {
                id: '3',
                title: 'AI Research Symposium',
                description: 'Presentation of latest research in AI and Machine Learning',
                date: '2025-06-10T15:00:00Z',
                location: 'Auditorium',
                organizer: 'AI Research Club',
                category: 'research',
                day: 10,
                month: 'Jun',
                time: '3:00 PM',
                status: 'upcoming'
              }
            ]
          }
        };
      }
      
      try {
        // Try to fetch from API first
        const response = await fetch(`${API_URL}/campus/events`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        return await handleResponse(response);
      } catch (apiError) {
        console.warn('API error, falling back to local storage:', apiError);
        
        // Fallback to local storage if API fails
        const localEvents = getEventsFromLocalStorage();
        console.log('Retrieved events from local storage:', localEvents);
        
        return {
          status: 'success',
          message: 'Events retrieved from local storage',
          data: {
            events: localEvents.length > 0 ? localEvents : []
          }
        };
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },
  
  // Add an event (admin only)
  addEvent: async (token: string, eventData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for addEvent');
        return {
          status: 'success',
          message: 'Event added successfully',
          data: {
            event: {
              id: Date.now().toString(),
              ...eventData,
              status: 'upcoming'
            }
          }
        };
      }
      
      console.log('Adding event with data:', eventData);
      
      // Process the date to extract day and month
      const eventDate = new Date(eventData.date);
      const day = eventDate.getDate();
      const month = eventDate.toLocaleString('en-US', { month: 'short' });
      
      // Ensure we have the correct date format
      const formattedData = {
        ...eventData,
        id: Date.now().toString(), // Generate a unique ID
        day,
        month,
        status: 'upcoming'
      };
      
      console.log('Formatted event data:', formattedData);
      
      try {
        // Try to use the API first
        const response = await fetch(`${API_URL}/campus/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedData)
        });
        
        const result = await handleResponse(response);
        console.log('Add event API response:', result);
        return result;
      } catch (apiError) {
        console.warn('API error, using local storage instead:', apiError);
        
        // Fallback to local storage
        const currentEvents = getEventsFromLocalStorage();
        currentEvents.push(formattedData);
        
        if (saveEventsToLocalStorage(currentEvents)) {
          console.log('Event saved to local storage successfully');
          return {
            status: 'success',
            message: 'Event added successfully (stored locally)',
            data: {
              event: formattedData
            }
          };
        } else {
          throw new Error('Failed to save event to local storage');
        }
      }
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  },
  
  // Update an event (admin only)
  updateEvent: async (token: string, eventId: string, eventData: any) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for updateEvent');
        return {
          status: 'success',
          message: 'Event updated successfully',
          data: {
            event: {
              id: eventId,
              ...eventData,
              status: 'upcoming'
            }
          }
        };
      }
      
      console.log('Updating event with ID:', eventId);
      console.log('Update event data:', eventData);
      
      // Process the date to extract day and month if date is provided
      let day = eventData.day;
      let month = eventData.month;
      
      if (eventData.date) {
        const eventDate = new Date(eventData.date);
        day = eventDate.getDate();
        month = eventDate.toLocaleString('en-US', { month: 'short' });
      }
      
      // Ensure we have the correct data format for update
      const formattedData = {
        ...eventData,
        day,
        month,
        status: 'upcoming'
      };
      
      console.log('Formatted event data for update:', formattedData);
      
      try {
        // Try to use the API first
        const response = await fetch(`${API_URL}/campus/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedData)
        });
        
        const result = await handleResponse(response);
        console.log('Update event API response:', result);
        return result;
      } catch (apiError) {
        console.warn('API error, using local storage instead:', apiError);
        
        // Fallback to local storage
        const currentEvents = getEventsFromLocalStorage();
        const updatedEvents = currentEvents.map((event: any) => 
          event.id === eventId ? { ...event, ...formattedData } : event
        );
        
        if (saveEventsToLocalStorage(updatedEvents)) {
          console.log('Event updated in local storage successfully');
          return {
            status: 'success',
            message: 'Event updated successfully (stored locally)',
            data: {
              event: formattedData
            }
          };
        } else {
          throw new Error('Failed to update event in local storage');
        }
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },
  
  // Delete an event (admin only)
  deleteEvent: async (token: string, eventId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for deleteEvent');
        return {
          status: 'success',
          message: 'Event deleted successfully',
          data: {}
        };
      }
      
      console.log('Deleting event with ID:', eventId);
      
      try {
        // Try to use the API first
        const response = await fetch(`${API_URL}/campus/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const result = await handleResponse(response);
        console.log('Delete event API response:', result);
        return result;
      } catch (apiError) {
        console.warn('API error, using local storage instead:', apiError);
        
        // Fallback to local storage
        const currentEvents = getEventsFromLocalStorage();
        const filteredEvents = currentEvents.filter((event: any) => event.id !== eventId);
        
        if (saveEventsToLocalStorage(filteredEvents)) {
          console.log('Event deleted from local storage successfully');
          return {
            status: 'success',
            message: 'Event deleted successfully (from local storage)',
            data: {}
          };
        } else {
          throw new Error('Failed to delete event from local storage');
        }
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

// Resources API
const resourcesAPI = {
  // Get resources
  getResources: async (token: string, queryParams?: Record<string, string>) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for getResources');
        return {
          status: 'success',
          message: 'Resources retrieved successfully',
          data: {
            resources: []
          }
        };
      }
      
      let url = `${API_URL}/resources`;
      
      // Add query parameters if provided
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('GetResources error:', error);
      throw error;
    }
  },
  
  // Like a resource
  likeResource: async (token: string, resourceId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for likeResource');
        return {
          status: 'success',
          message: 'Resource liked successfully',
          data: {
            upvotes: 1,
            is_upvoted: true
          }
        };
      }
      
      const response = await fetch(`${API_URL}/resources/${resourceId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('LikeResource error:', error);
      throw error;
    }
  },
  
  // Download a resource file
  downloadResource: async (token: string, resourceId: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for downloadResource');
        return {
          status: 'success',
          message: 'Resource download count incremented',
          data: {
            download_count: 1
          }
        };
      }
      
      const response = await fetch(`${API_URL}/resources/${resourceId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('DownloadResource error:', error);
      throw error;
    }
  },
  
  // Upload a resource file
  uploadResource: async (token: string, formData: FormData) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for uploadResource');
        return {
          status: 'success',
          message: 'Resource uploaded successfully',
          data: {
            resource_id: 'mock-resource-id'
          }
        };
      }
      
      const response = await fetch(`${API_URL}/resources/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header when sending FormData
        },
        body: formData
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('UploadResource error:', error);
      throw error;
    }
  },

  deleteResource: async (token: string, resourceId: string) => {
    const response = await fetch(`${API_URL}/resources/${resourceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
};

// Opportunities API
const opportunitiesAPI = {
  // Get opportunities
  getOpportunities: async (token: string, type?: string) => {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${API_URL}/opportunities${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
      
    return handleResponse(response);
  },
    
  // Send verification code to email for opportunity posting
  sendVerificationCode: async (email: string, token: string) => {
    const response = await fetch(`${API_URL}/opportunities/verify/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
      
    return handleResponse(response);
  },
    
  // Verify email with verification code for opportunity posting
  verifyEmailCode: async (email: string, verificationCode: string, token: string) => {
    const response = await fetch(`${API_URL}/opportunities/verify/check-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, verification_code: verificationCode }),
    });
      
    return handleResponse(response);
  },
  
  // Create a new opportunity
  createOpportunity: async (token: string, opportunityData: any) => {
    const response = await fetch(`${API_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(opportunityData),
    });

    return handleResponse(response);
  },

  // Update an opportunity
  updateOpportunity: async (token: string, opportunityId: string, opportunityData: any) => {
    const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(opportunityData),
    });

    return handleResponse(response);
  },

  // Delete an opportunity
  deleteOpportunity: async (token: string, opportunityId: string) => {
    const response = await fetch(`${API_URL}/opportunities/${opportunityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Apply for an opportunity
  applyForOpportunity: async (token: string, opportunityId: string, applicationData: any) => {
    const response = await fetch(`${API_URL}/opportunities/${opportunityId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(applicationData),
    });

    return handleResponse(response);
  },
};

// Summarization API
const summarizeAPI = {
  // Summarize text using Gemini API
  summarizeText: async (token: string, text: string) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('Using mock data for summarizeText');
        return {
          status: 'success',
          message: 'Text summarized successfully',
          data: {
            summary: 'This is a mock summary of the text. In a real implementation, this would be generated by the Gemini API.'
          }
        };
      }
      
      const response = await fetch(`${API_URL}/summarize/text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('SummarizeText error:', error);
      throw error;
    }
  }
};

// Export all APIs individually for direct imports
export { authAPI, socialAPI, userAPI, resourcesAPI, opportunitiesAPI, campusNewsAPI, eventsAPI, summarizeAPI };

// Also export as a combined service object
const apiService = {
  auth: authAPI,
  social: socialAPI,
  user: userAPI,
  resources: resourcesAPI,
  opportunities: opportunitiesAPI,
  campusNews: campusNewsAPI,
  events: eventsAPI,
  summarize: summarizeAPI
};

export default apiService;
