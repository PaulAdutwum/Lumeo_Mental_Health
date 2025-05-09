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
export const ENDPOINTS = {
  // Canvas endpoints
  CANVAS_SUGGEST: '/api/canvas/suggest',
  
  // Media generation endpoints
  MEDIA_GEN_IMAGE: '/api/media-gen/image',
  
  // Health check
  HEALTH: '/api/health',
};

// Socket.io connection URL
export const getSocketUrl = () => {
  return isProduction 
    ? window.location.origin // Use the same domain in production
    : 'http://localhost:3001';
};

export default api; 