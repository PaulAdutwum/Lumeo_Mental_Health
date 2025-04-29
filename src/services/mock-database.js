// src/services/mock-database.js
// Mock implementation that doesn't depend on pg or aws-sdk

// Mock data storage
const mockStorage = {
  videoPreferences: [],
  videoHistory: [],
  mediaAssets: [],
  chatMessages: [],
  prompts: []
};

// Initialize with sample data
if (typeof localStorage !== 'undefined') {
  const storedPrefs = localStorage.getItem('video_preferences');
  if (storedPrefs) {
    mockStorage.videoPreferences = JSON.parse(storedPrefs);
  }
}

const mockDb = {
  // Video preferences methods
  getVideoPreferences: async () => {
    return mockStorage.videoPreferences;
  },
  
  saveVideoPreference: async (category, weight = 1.0) => {
    const existing = mockStorage.videoPreferences.findIndex(p => p.category === category);
    if (existing >= 0) {
      mockStorage.videoPreferences[existing].weight = weight;
    } else {
      mockStorage.videoPreferences.push({ category, weight });
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('video_preferences', JSON.stringify(mockStorage.videoPreferences));
    }
    return true;
  },
  
  // Video recommendations methods
  getVideoRecommendations: async () => {
    return [
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Guided Meditation for Anxiety Relief',
        thumbnailUrl: 'https://via.placeholder.com/320x180?text=Meditation',
        description: 'A calming meditation to help reduce anxiety and stress.'
      },
      {
        videoId: 'hHW1oY26kxQ',
        title: 'Relaxing Nature Sounds',
        thumbnailUrl: 'https://via.placeholder.com/320x180?text=Nature+Sounds',
        description: 'Peaceful nature sounds to help you relax and focus.'
      }
    ];
  },
  
  logVideoWatch: async ({ videoId, title, emotionBefore }) => {
    console.log(`Video watched: ${title} (${videoId}), emotion before: ${emotionBefore || 'unknown'}`);
    mockStorage.videoHistory.push({
      videoId,
      title, 
      emotionBefore,
      timestamp: new Date().toISOString()
    });
    return true;
  },
  
  updateVideoFeedback: async (videoId, feedback, emotionAfter) => {
    console.log(`Feedback for ${videoId}: ${feedback}, emotion after: ${emotionAfter || 'unknown'}`);
    // Find the most recent watch record for this video and update it
    const recentWatchIndex = [...mockStorage.videoHistory].reverse().findIndex(h => h.videoId === videoId);
    if (recentWatchIndex >= 0) {
      const actualIndex = mockStorage.videoHistory.length - 1 - recentWatchIndex;
      mockStorage.videoHistory[actualIndex].feedback = feedback;
      mockStorage.videoHistory[actualIndex].emotionAfter = emotionAfter;
    }
    return true;
  },
  
  // Other methods required by the app
  saveMediaAsset: async (promptId, assetData) => {
    console.log(`Saving media asset for prompt ${promptId}`);
    const assetId = `asset-${Date.now()}`;
    mockStorage.mediaAssets.push({
      id: assetId,
      promptId,
      ...assetData,
      created_at: new Date().toISOString()
    });
    return assetId;
  },
  
  getLatestMediaAssetId: async () => {
    if (mockStorage.mediaAssets.length === 0) {
      return "asset-default";
    }
    return mockStorage.mediaAssets[mockStorage.mediaAssets.length - 1].id;
  },
  
  saveChatMessage: async (sessionId, message) => {
    const messageId = `msg-${Date.now()}`;
    mockStorage.chatMessages.push({
      id: messageId,
      sessionId,
      ...message,
      timestamp: new Date().toISOString()
    });
    return messageId;
  },
  
  savePrompt: async (messageId, promptData) => {
    const promptId = `prompt-${Date.now()}`;
    mockStorage.prompts.push({
      id: promptId,
      messageId,
      ...promptData,
      created_at: new Date().toISOString()
    });
    return promptId;
  },
  
  saveRecommendation: async (assetId, recData) => {
    console.log(`Saving recommendation for asset ${assetId}`);
    return `rec-${Date.now()}`;
  },
  
  updateRecommendationFeedback: async (recId, feedback) => {
    console.log(`Updating recommendation feedback for ${recId}`);
    return true;
  },
  
  logBillingEvent: async () => {
    console.log('Logging billing event (mock)');
    return true;
  }
};

export default mockDb; 