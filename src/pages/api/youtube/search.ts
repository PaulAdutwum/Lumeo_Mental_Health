import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, emotion, categories } = req.query;

  try {
    // Map emotions to search queries
    const emotionToQueryMap: Record<string, string> = {
      anxiety: "calming anxiety relief meditation",
      stress: "stress reduction relaxation techniques",
      sadness: "uplifting mood boosting positive thinking",
      anger: "anger management calm breathing exercises",
      joy: "mindfulness gratitude practice",
      fear: "overcoming fear guided meditation",
      neutral: "mindfulness meditation practice"
    };

    // Build search query
    let searchQuery = emotionToQueryMap[emotion as string] || "therapeutic mindfulness";
    
    if (categories) {
      const categoryList = Array.isArray(categories) ? categories : [categories];
      searchQuery += " " + categoryList.join(" ");
    }

    // Call YouTube API
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        maxResults: 6,
        q: searchQuery,
        type: 'video',
        videoEmbeddable: true,
        videoDuration: 'medium',
        videoCategoryId: '26',
        key: process.env.YOUTUBE_API_KEY
      }
    });

    // Format the response
    const videos = response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      description: item.snippet.description || "No description available"
    }));

    res.status(200).json(videos);
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    res.status(500).json({ error: 'Failed to search YouTube videos' });
  }
} 