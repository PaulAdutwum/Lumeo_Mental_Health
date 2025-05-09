// API endpoints utility
import axios from 'axios';

// Determine if running in production or development
const isProduction = import.meta.env.PROD;

// Base API URL based on environment
export const API_BASE_URL = isProduction 
  ? '' // Empty for production because we're using relative paths to the same domain
  : 'http://localhost:3001';

// Create a configured axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
const API_ENDPOINTS = {
  // User endpoints
  USER_LOGIN: '/api/users/login',
  USER_SIGNUP: '/api/users/signup',
  USER_PROFILE: '/api/users/profile',

  // AI endpoints
  AI_CHAT: '/api/ai/chat',
  AI_IMAGE: '/api/media-gen/image',

  // Video endpoints
  VIDEO_RECOMMENDATIONS: '/api/videos/recommendations',
  VIDEO_WATCH: '/api/videos/watch',
  VIDEO_FEEDBACK: '/api/videos/feedback',
  VIDEO_PREFERENCES: '/api/videos/preferences',

  // Health check endpoint
  HEALTH: '/api/health',
};

// Socket.io connection URL
export const getSocketUrl = () => {
  return isProduction 
    ? window.location.origin // Use the same domain in production
    : 'http://localhost:3001';
};

export default api; 