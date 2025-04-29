// src/components/mock-database.ts
interface VideoPreference {
  category: string;
  weight: number;
}

const mockDb = {
  // Mock video preferences
  getVideoPreferences: async (): Promise<VideoPreference[]> => {
    const prefs = localStorage.getItem('video_preferences');
    return prefs ? JSON.parse(prefs) : [];
  },
  
  // Mock video recommendations
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
  
  // Other required methods
  logVideoWatch: async ({ videoId, title, emotionBefore }: { videoId: string, title: string, emotionBefore?: string }) => {
    console.log(`Video watched: ${title} (${videoId}), emotion before: ${emotionBefore || 'unknown'}`);
    return true;
  },
  
  updateVideoFeedback: async (videoId: string, feedback: 'like' | 'dislike', emotionAfter?: string) => {
    console.log(`Feedback for ${videoId}: ${feedback}, emotion after: ${emotionAfter || 'unknown'}`);
    return true;
  },
  
  saveVideoPreference: async (category: string, weight: number = 1.0) => {
    const prefs = await mockDb.getVideoPreferences();
    const updatedPrefs = [...prefs.filter((p: VideoPreference) => p.category !== category), { category, weight }];
    localStorage.setItem('video_preferences', JSON.stringify(updatedPrefs));
    return true;
  }
};

export default mockDb; 