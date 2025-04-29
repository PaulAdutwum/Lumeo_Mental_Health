// src/services/api.ts
// API client for communicating with our server

import axios from 'axios';

export interface VideoPreference {
  category: string;
  weight: number;
}

export interface VideoRecommendation {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  description: string;
}

export interface VideoData {
  videoId: string;
  title: string;
  emotionBefore?: string;
}

export interface AssetData {
  type: 'image' | 'video' | 'gif';
  url: string;
  model_used: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API requests
async function apiRequest<T>(endpoint: string, method = 'GET', data: any = null): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-ID': localStorage.getItem('userId') || 'anonymous' // In production, use proper auth token
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

// Video preferences
export const getVideoPreferences = async (): Promise<VideoPreference[]> => {
  return apiRequest<VideoPreference[]>('/videos/preferences');
};

export const saveVideoPreference = async (categories: string[]): Promise<any> => {
  return apiRequest('/videos/preferences', 'POST', { 
    userId: localStorage.getItem('userId') || 'anonymous',
    categories 
  });
};

// Video recommendations
export const getVideoRecommendations = async (
  emotion?: string,
  limit = 5
): Promise<VideoRecommendation[]> => {
  try {
    // Use reliable working videos in development mode
    if (window.location.hostname === 'localhost') {
      console.log('Development mode: Using reliable video recommendations');
      return [
        {
          id: "86m4RC_ADEY",
          title: "Calming Nature Sounds",
          channelTitle: "Nature Sounds",
          thumbnailUrl: "https://img.youtube.com/vi/86m4RC_ADEY/mqdefault.jpg",
          description: "Peaceful nature sounds to calm your mind"
        },
        {
          id: "inpok4MKVLM",
          title: "5-Minute Meditation You Can Do Anywhere",
          channelTitle: "Goodful",
          thumbnailUrl: "https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg", 
          description: "In just 5 minutes you can reset your day in a positive way."
        },
        {
          id: "aEqlQvczMyo",
          title: "10 Minute Guided Meditation for Focus",
          channelTitle: "Great Meditation",
          thumbnailUrl: "https://img.youtube.com/vi/aEqlQvczMyo/mqdefault.jpg",
          description: "This guided meditation helps improve focus and concentration."
        }
      ];
    }
    
    const params = new URLSearchParams();
    if (emotion) {
      params.append('emotion', emotion);
    }
    
    // Include the user ID if available
    const userId = localStorage.getItem('userId');
    if (userId) {
      params.append('userId', userId);
    }
    
    params.append('limit', limit.toString());
    
    const url = `${API_URL}/videos/recommendations?${params.toString()}`;
    const response = await axios.get(url);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching video recommendations:', error);
    // Return empty array instead of throwing
    return [];
  }
};

// Video watch logging
export const logVideoWatch = async (data: {
  videoId: string;
  title: string;
  emotionBefore?: string;
}) => {
  try {
    // Make sure we have required data
    if (!data.videoId || !data.title) {
      console.error('Missing required video data for logging:', data);
      return false;
    }

    const userId = localStorage.getItem('userId') || 'anonymous';
    
    console.log('Logging video watch:', { 
      videoId: data.videoId, 
      title: data.title, 
      emotionBefore: data.emotionBefore,
      userId 
    });
    
    // Skip server calls in development mode
    if (window.location.hostname === 'localhost') {
      console.log('Development mode: Mock video watch logged successfully');
      return true;
    }
    
    const response = await axios.post(`${API_URL}/videos/watch`, {
      ...data,
      userId
    });
    
    if (response.status !== 200) {
      console.error('Failed to log video watch, server returned:', response.status);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error logging video watch:', error);
    // Don't fail the app if logging fails
    return false;
  }
};

// Video feedback
export const updateVideoFeedback = async (
  videoId: string, 
  feedback: 'like' | 'dislike',
  emotionAfter?: string
) => {
  try {
    const userId = localStorage.getItem('userId') || 'anonymous';
    
    // Skip server calls in development mode
    if (window.location.hostname === 'localhost') {
      console.log('Development mode: Mock feedback logged successfully', {
        videoId,
        feedback,
        emotionAfter,
        userId
      });
      return true;
    }
    
    await axios.post(`${API_URL}/videos/feedback`, {
      videoId,
      feedback,
      emotionAfter,
      userId
    });
    return true;
  } catch (error) {
    console.error('Error submitting video feedback:', error);
    return false;
  }
};

// Media assets
export const saveMediaAsset = async (promptId: string, assetData: AssetData): Promise<any> => {
  return apiRequest('/media/assets', 'POST', { promptId, ...assetData });
};

export const getLatestMediaAssetId = async (): Promise<string> => {
  const result = await apiRequest<{id: string}>('/media/assets/latest');
  return result.id;
};

// Chat messages
export const saveChatMessage = async (sessionId: string, message: any): Promise<string> => {
  const result = await apiRequest<{id: string}>('/chat/messages', 'POST', { sessionId, ...message });
  return result.id;
};

// Prompts
export const savePrompt = async (messageId: string, promptData: any): Promise<string> => {
  const result = await apiRequest<{id: string}>('/prompts', 'POST', { messageId, ...promptData });
  return result.id;
};

// Recommendations
export const saveRecommendation = async (assetId: string, recData: any): Promise<string> => {
  const result = await apiRequest<{id: string}>('/recommendations', 'POST', { assetId, ...recData });
  return result.id;
};

// Package all API methods
const api = {
  getVideoPreferences,
  saveVideoPreference,
  getVideoRecommendations,
  logVideoWatch,
  updateVideoFeedback,
  saveMediaAsset,
  getLatestMediaAssetId,
  saveChatMessage,
  savePrompt,
  saveRecommendation
};

export default api; 