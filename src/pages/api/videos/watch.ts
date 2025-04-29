import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../services/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, title, emotionBefore, userId } = req.body;

  if (!videoId || !title) {
    return res.status(400).json({ error: 'Missing required fields: videoId and title' });
  }

  try {
    const client = await pool.connect();
    try {
      // Log video watch in history
      await client.query(
        'INSERT INTO video_history (user_id, video_id, title, watched_at, emotion_before) VALUES ($1, $2, $3, NOW(), $4)',
        [userId || 'anonymous', videoId, title, emotionBefore || null]
      );
      
      return res.status(200).json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error logging video watch:', error);
    return res.status(500).json({ error: 'Failed to log video watch' });
  }
} 