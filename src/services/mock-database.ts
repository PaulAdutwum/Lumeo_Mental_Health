// src/services/mock-database.ts
// Mock implementation that doesn't depend on pg or aws-sdk

interface VideoPreference {
  category: string;
  weight: number;
}

// Mock data storage
const mockStorage = {
  videoPreferences: [] as VideoPreference[],
  videoHistory: [] as any[],
  mediaAssets: [] as any[],
  chatMessages: [] as any[],
  prompts: [] as any[]
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
  getVideoPreferences: async (): Promise<VideoPreference[]> => {
    return mockStorage.videoPreferences;
  },
  
  saveVideoPreference: async (category: string, weight: number = 1.0) => {
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
  
  logVideoWatch: async ({ videoId, title, emotionBefore }: { videoId: string, title: string, emotionBefore?: string }) => {
    console.log(`Video watched: ${title} (${videoId}), emotion before: ${emotionBefore || 'unknown'}`);
    mockStorage.videoHistory.push({
      videoId,
      title, 
      emotionBefore,
      timestamp: new Date().toISOString()
    });
    return true;
  },
  
  updateVideoFeedback: async (videoId: string, feedback: 'like' | 'dislike', emotionAfter?: string) => {
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
  saveMediaAsset: async (promptId: string, assetData: any) => {
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
  
  saveChatMessage: async (sessionId: string, message: any) => {
    const messageId = `msg-${Date.now()}`;
    mockStorage.chatMessages.push({
      id: messageId,
      sessionId,
      ...message,
      timestamp: new Date().toISOString()
    });
    return messageId;
  },
  
  savePrompt: async (messageId: string, promptData: any) => {
    const promptId = `prompt-${Date.now()}`;
    mockStorage.prompts.push({
      id: promptId,
      messageId,
      ...promptData,
      created_at: new Date().toISOString()
    });
    return promptId;
  },
  
  saveRecommendation: async (assetId: string, recData: any) => {
    console.log(`Saving recommendation for asset ${assetId}`);
    return `rec-${Date.now()}`;
  },
  
  updateRecommendationFeedback: async (recId: string, feedback: any) => {
    console.log(`Updating recommendation feedback for ${recId}`);
    return true;
  },
  
  logBillingEvent: async () => {
    console.log('Logging billing event (mock)');
    return true;
  }
};

export default mockDb; 