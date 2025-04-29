import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../services/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, userId, rating, emotionAfter, feedback } = req.body;

  if (!videoId || rating === undefined) {
    return res.status(400).json({ error: 'Missing required fields: videoId and rating' });
  }

  try {
    const client = await pool.connect();
    try {
      // Save feedback in feedback_logs
      await client.query(
        `INSERT INTO feedback_logs 
         (user_id, content_id, content_type, rating, emotion_after, feedback_text, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId || 'anonymous', videoId, 'video', rating, emotionAfter || null, feedback || null]
      );
      
      // If rating is high, add to preferences
      if (rating >= 4) {
        const videoResult = await client.query(
          'SELECT title FROM video_history WHERE video_id = $1 ORDER BY watched_at DESC LIMIT 1',
          [videoId]
        );
        
        if (videoResult.rows.length > 0) {
          const title = videoResult.rows[0].title;
          // Extract keywords from title and add to preferences
          const keywords = extractKeywords(title);
          
          for (const keyword of keywords) {
            await client.query(
              `INSERT INTO video_preferences (user_id, category, weight) 
               VALUES ($1, $2, 1) 
               ON CONFLICT (user_id, category) 
               DO UPDATE SET weight = video_preferences.weight + 1`,
              [userId || 'anonymous', keyword]
            );
          }
        }
      }
      
      return res.status(200).json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving video feedback:', error);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
}

// Simple function to extract potential keywords from video title
function extractKeywords(title: string): string[] {
  const commonTherapeuticTerms = [
    'meditation', 'mindfulness', 'relaxation', 'breathing', 
    'sleep', 'calm', 'anxiety', 'stress', 'healing', 'therapy',
    'nature', 'music', 'guided', 'yoga', 'exercise',
    'positive', 'affirmation', 'motivation'
  ];
  
  const words = title.toLowerCase().split(/\s+/);
  return commonTherapeuticTerms.filter(term => 
    words.some(word => word.includes(term))
  );
} 