// Common API Response interface
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

// User related types
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  profile_picture?: string;
  college?: string;
  department?: string;
  year?: string;
  bio?: string;
  skills?: string[];
  social_links?: {
    [key: string]: string;
  };
  preferences?: {
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

// Post related types
export interface Post {
  _id: string;
  author: {
    id: string;
    username: string;
    name: string;
    profile_picture?: string;
  };
  content: string;
  title?: string;
  media_urls?: string[];
  attachment_urls?: string[];
  category?: string;
  tags?: string[];
  is_anonymous: boolean;
  created_at: string;
  updated_at?: string;
  comment_count: number;
  like_count: number;
  is_liked: boolean;
  sentiment?: string;
  sentiment_score?: number;
  emotional_intensity?: number;
  detected_emotions?: Array<{
    name: string;
    percentage: number;
  }>;
}

// Comment related types
export interface Comment {
  _id: string;
  post_id: string;
  author: {
    id: string;
    username: string;
    name: string;
    profile_picture?: string;
  };
  content: string;
  media_url?: string;
  link?: string;
  created_at: string;
  updated_at?: string;
  like_count: number;
  is_liked: boolean;
  is_anonymous: boolean;
}

// News related types
export interface News {
  _id: string;
  title: string;
  content: string;
  image_url?: string;
  category: string;
  author: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  created_at: string;
  updated_at?: string;
  likes: number;
  is_liked?: boolean;
}

// Event related types
export interface Event {
  _id: string;
  title: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date: string;
  location: string;
  category: string;
  organizer: {
    id: string;
    name: string;
    profile_picture?: string;
  };
  created_at: string;
  updated_at?: string;
  attendees_count: number;
  is_attending?: boolean;
}

// API Response types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface PostResponse {
  post: Post;
  post_id?: string;
  is_moderated?: boolean;
}

export interface CommentResponse {
  comment: Comment;
  comment_id?: string;
  is_moderated?: boolean;
}

export interface NewsResponse {
  news: News[];
  total: number;
  page: number;
  per_page: number;
}

export interface EventResponse {
  events: Event[];
  total: number;
  page: number;
  per_page: number;
}

// Error state type
export interface ErrorState {
  message: string;
  code?: string;
  field?: string;
}

// Loading state type
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
} 