// src/services/database.js
// Mock implementation for browser compatibility
// This replaces the PostgreSQL/AWS version for development

import mockDb from './mock-database.js';

// Re-export the mock database methods
export default mockDb;

// Export individual functions to match the original API
export const {
  createUser,
  getUserData,
  createSession,
  updateSessionActivity,
  saveChatMessage,
  getSessionMessages,
  saveMediaAsset,
  incrementAssetUsage,
  savePrompt,
  saveMoodEntryExtended,
  saveFeedback,
  saveRecommendation,
  updateRecommendationFeedback,
  getLatestMediaAssetId,
  getUserChatMessages,
  getUserMediaAssets,
  getUserMoodEntries,
  saveVideoPreference,
  getVideoPreferences,
  logVideoWatch,
  updateVideoFeedback,
  getVideoRecommendations
} = mockDb; 