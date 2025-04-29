import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../services/database';
import axios from 'axios';

interface VideoRecommendation {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  description: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emotion, userId } = req.query;
  
  if (!emotion) {
    return res.status(400).json({ error: 'Missing required parameter: emotion' });
  }
  
  try {
    // Get user preferences if userId provided
    let userPreferences: string[] = [];
    if (userId) {
      const client = await pool.connect();
      try {
        const prefsResult = await client.query(
          'SELECT category FROM video_preferences WHERE user_id = $1 ORDER BY weight DESC LIMIT 5',
          [userId]
        );
        userPreferences = prefsResult.rows.map(row => row.category);
      } finally {
        client.release();
      }
    }

    // Map emotion to search query
    const emotionToQueryMap: Record<string, string> = {
      'anxiety': 'calming anxiety relief meditation',
      'stress': 'stress reduction relaxation techniques',
      'sadness': 'uplifting mood boosting positive thinking',
      'anger': 'anger management calm breathing exercises',
      'joy': 'mindfulness gratitude practice',
      'fear': 'overcoming fear guided meditation',
      'neutral': 'mindfulness meditation practice'
    };
    
    // Generate search query
    let searchQuery = emotionToQueryMap[emotion as string] || 'therapeutic mindfulness meditation';
    
    // Add preferences to query if available
    if (userPreferences.length > 0) {
      searchQuery += ' ' + userPreferences.slice(0, 2).join(' ');
    }
    
    // Call YouTube API
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        maxResults: 5,
        q: searchQuery,
        type: 'video',
        videoDuration: 'medium', // Medium length videos
        videoEmbeddable: true,
        key: process.env.YOUTUBE_API_KEY
      }
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'No videos found' });
    }
    
    // Format the response
    const recommendations: VideoRecommendation[] = response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      description: item.snippet.description
    }));
    
    // If user is logged in, save this recommendation session
    if (userId) {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO recommendations 
           (user_id, emotion, items_json, created_at) 
           VALUES ($1, $2, $3, NOW())`,
          [userId, emotion, JSON.stringify(recommendations)]
        );
      } finally {
        client.release();
      }
    }
    
    return res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error generating video recommendations:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
} 