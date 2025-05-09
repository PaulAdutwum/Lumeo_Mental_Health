import { useState, useEffect } from 'react';

export function useEnvironment() {
  const [youtubeApiKey, setYoutubeApiKey] = useState<string | null>(null);
  const [envLoaded, setEnvLoaded] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      
      if (!apiKey || apiKey === 'undefined' || apiKey.includes('your-youtube-api-key')) {
        console.warn('YouTube API key not properly configured in .env file');
        setHasErrors(true);
      } else {
        setYoutubeApiKey(apiKey);
        
      }
    } catch (error) {
      console.error('Error loading environment variables:', error);
      setHasErrors(true);
    } finally {
      setEnvLoaded(true);
    }
  }, []);

  return {
    youtubeApiKey,
    envLoaded,
    hasErrors
  };
} 