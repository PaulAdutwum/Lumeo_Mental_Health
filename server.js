// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const axios = require('axios');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize S3
const s3 = new AWS.S3();

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

// Database tables
const TABLES = {
  USERS: "users",
  SESSIONS: "sessions",
  CHAT_MESSAGES: "chat_messages",
  MEMORIES: "memories",
  PROMPTS: "prompts",
  MEDIA_ASSETS: "media_assets",
  RECOMMENDATIONS: "recommendations",
  MOOD_ENTRIES: "mood_entries",
  FEEDBACK_LOGS: "feedback_logs",
  BILLING_RECORDS: "billing_records",
  VIDEO_PREFERENCES: "video_preferences",
  VIDEO_HISTORY: "video_history"
};

// Helper function to call YouTube API
async function fetchYouTubeVideos(query, maxResults = 6) {
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      console.warn('YouTube API key not configured, using fallback data');
      return getFallbackVideos();
    }
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: YOUTUBE_API_KEY,
        q: query,
        part: 'snippet',
        maxResults: maxResults,
        type: 'video',
        videoEmbeddable: true,
        videoDuration: 'medium', // 4-20 minutes
        relevanceLanguage: 'en',
        safeSearch: 'strict'
      }
    });
    
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      return getFallbackVideos();
    }
    
    return response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      description: item.snippet.description
    }));
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return getFallbackVideos();
  }
}

// Fallback videos if YouTube API fails
function getFallbackVideos() {
  return [
    {
      videoId: 'O-6f5wQXSu8',
      title: 'Guided Meditation for Anxiety & Stress Relief',
      thumbnailUrl: 'https://img.youtube.com/vi/O-6f5wQXSu8/mqdefault.jpg',
      description: 'A calming meditation to help reduce anxiety and stress.'
    },
    {
      videoId: 'aXItOY0sLRY',
      title: 'Relaxing Nature Sounds - Forest Birds Singing',
      thumbnailUrl: 'https://img.youtube.com/vi/aXItOY0sLRY/mqdefault.jpg',
      description: 'Peaceful nature sounds to help you relax and focus.'
    },
    {
      videoId: 'inpok4MKVLM',
      title: '5-Minute Meditation You Can Do Anywhere',
      thumbnailUrl: 'https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg',
      description: 'Quick meditation practice for busy days.'
    }
  ];
}

// API Routes

// Video preferences
app.get('/api/video/preferences', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, weight FROM ${TABLES.VIDEO_PREFERENCES} 
       WHERE user_id = $1 
       ORDER BY weight DESC`,
      [req.headers['user-id'] || 'anonymous'] // In production, get from auth token
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting video preferences:', error);
    res.status(500).json({ error: 'Failed to fetch video preferences' });
  }
});

app.post('/api/video/preferences', async (req, res) => {
  try {
    const { category, weight = 1.0 } = req.body;
    const userId = req.headers['user-id'] || 'anonymous'; // In production, get from auth token

    // Check if preference already exists
    const existingResult = await pool.query(
      `SELECT id FROM ${TABLES.VIDEO_PREFERENCES} 
       WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing preference
      result = await pool.query(
        `UPDATE ${TABLES.VIDEO_PREFERENCES} 
         SET weight = $1 
         WHERE id = $2
         RETURNING id`,
        [weight, existingResult.rows[0].id]
      );
    } else {
      // Create new preference
      result = await pool.query(
        `INSERT INTO ${TABLES.VIDEO_PREFERENCES} 
         (user_id, category, weight, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING id`,
        [userId, category, weight]
      );
    }
    
    res.json({ id: result.rows[0].id, success: true });
  } catch (error) {
    console.error('Error saving video preference:', error);
    res.status(500).json({ error: 'Failed to save video preference' });
  }
});

// Video recommendations
app.get('/api/video/recommendations', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous';
    const emotionOverride = req.query.emotion; // Allow overriding based on current emotion
    
    let searchTerms = 'therapeutic meditation relaxation'; // Default
    
    if (emotionOverride) {
      // Map emotions to relevant search terms
      const emotionMap = {
        anxiety: 'meditation for anxiety relief breathing exercises',
        sadness: 'uplifting meditation positive affirmations guided imagery',
        anger: 'calming meditation stress reduction mindfulness',
        fear: 'anxiety relief guided meditation safe space visualization',
        joy: 'positive meditation mindfulness gratitude practice',
        neutral: 'meditation mindfulness relaxation techniques'
      };
      
      searchTerms = emotionMap[emotionOverride.toLowerCase()] || searchTerms;
    } else {
      // Get user preferences
      const prefsResult = await pool.query(
        `SELECT category, weight FROM ${TABLES.VIDEO_PREFERENCES} 
         WHERE user_id = $1 
         ORDER BY weight DESC 
         LIMIT 5`,
        [userId]
      );
      
      if (prefsResult.rows.length > 0) {
        searchTerms = prefsResult.rows.map(p => p.category).join(' ');
      }
    }
    
    // Add 'therapeutic' to ensure videos are suitable
    if (!searchTerms.includes('therapeutic')) {
      searchTerms = 'therapeutic ' + searchTerms;
    }
    
    // Fetch videos from YouTube API
    const videos = await fetchYouTubeVideos(searchTerms);
    
    // Cache video history to avoid recommending recently watched videos
    const historyResult = await pool.query(
      `SELECT video_id FROM ${TABLES.VIDEO_HISTORY} 
       WHERE user_id = $1 
       ORDER BY watched_at DESC 
       LIMIT 10`,
      [userId]
    );
    
    const recentVideoIds = historyResult.rows.map(row => row.video_id);
    
    // Filter out recently watched videos if possible
    let filteredVideos = videos.filter(video => !recentVideoIds.includes(video.videoId));
    
    // If filtering leaves too few videos, add some back
    if (filteredVideos.length < 3 && videos.length > 3) {
      filteredVideos = [
        ...filteredVideos,
        ...videos.filter(video => !filteredVideos.some(v => v.videoId === video.videoId)).slice(0, 3 - filteredVideos.length)
      ];
    }
    
    res.json(filteredVideos.length > 0 ? filteredVideos : videos);
  } catch (error) {
    console.error('Error getting video recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch video recommendations' });
  }
});

// Video watch logging
app.post('/api/video/watch', async (req, res) => {
  try {
    const { videoId, title, emotionBefore } = req.body;
    const userId = req.headers['user-id'] || 'anonymous';

    const result = await pool.query(
      `INSERT INTO ${TABLES.VIDEO_HISTORY} 
       (user_id, video_id, title, emotion_before, watched_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [userId, videoId, title, emotionBefore || null]
    );

    res.json({ id: result.rows[0].id, success: true });
  } catch (error) {
    console.error('Error logging video watch:', error);
    res.status(500).json({ error: 'Failed to log video watch' });
  }
});

// Video feedback
app.post('/api/video/feedback', async (req, res) => {
  try {
    const { videoId, feedback, emotionAfter } = req.body;
    const userId = req.headers['user-id'] || 'anonymous';

    await pool.query(
      `UPDATE ${TABLES.VIDEO_HISTORY} 
       SET feedback = $1, emotion_after = $2 
       WHERE user_id = $3 AND video_id = $4 
       ORDER BY watched_at DESC 
       LIMIT 1`,
      [feedback, emotionAfter || null, userId, videoId]
    );

    // If positive feedback, boost preference weights
    if (feedback === 'like') {
      const historyResult = await pool.query(
        `SELECT v.title FROM ${TABLES.VIDEO_HISTORY} v 
         WHERE v.user_id = $1 AND v.video_id = $2 
         ORDER BY v.watched_at DESC 
         LIMIT 1`,
        [userId, videoId]
      );
      
      if (historyResult.rows.length > 0) {
        // Extract keywords from title and boost their categories
        const title = historyResult.rows[0].title.toLowerCase();
        const categories = ['relaxation', 'meditation', 'anxiety', 'stress', 'sleep', 'mindfulness'];
        
        for (const category of categories) {
          if (title.includes(category)) {
            // Check if preference exists
            const existingPrefQuery = await pool.query(
              `SELECT id, weight FROM ${TABLES.VIDEO_PREFERENCES} 
               WHERE user_id = $1 AND category = $2`,
              [userId, category]
            );
            
            if (existingPrefQuery.rows.length > 0) {
              // Update existing preference
              const currentWeight = existingPrefQuery.rows[0].weight;
              await pool.query(
                `UPDATE ${TABLES.VIDEO_PREFERENCES} 
                 SET weight = $1 
                 WHERE id = $2`,
                [currentWeight * 1.2, existingPrefQuery.rows[0].id]
              );
            } else {
              // Create new preference
              await pool.query(
                `INSERT INTO ${TABLES.VIDEO_PREFERENCES} 
                 (user_id, category, weight, created_at) 
                 VALUES ($1, $2, $3, NOW())`,
                [userId, category, 1.0]
              );
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video feedback:', error);
    res.status(500).json({ error: 'Failed to update video feedback' });
  }
});

// Media assets
app.post('/api/media/assets', async (req, res) => {
  try {
    const { promptId, type, url, model_used } = req.body;
    const userId = req.headers['user-id'] || 'anonymous'; // In production, get from auth token

    const result = await pool.query(
      `INSERT INTO ${TABLES.MEDIA_ASSETS} 
       (user_id, prompt_id, type, url, model_used, usage_count, created_at) 
       VALUES ($1, $2, $3, $4, $5, 1, NOW()) 
       RETURNING id`,
      [userId, promptId, type, url, model_used]
    );

    res.json({ id: result.rows[0].id, success: true });
  } catch (error) {
    console.error('Error saving media asset:', error);
    res.status(500).json({ error: 'Failed to save media asset' });
  }
});

app.get('/api/media/assets/latest', async (req, res) => {
  try {
    const userId = req.headers['user-id'] || 'anonymous'; // In production, get from auth token

    const result = await pool.query(
      `SELECT id FROM ${TABLES.MEDIA_ASSETS} 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No media assets found" });
    }

    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error getting latest media asset ID:', error);
    res.status(500).json({ error: 'Failed to get latest media asset' });
  }
});

// Handle all other database interactions needed by the application...
// Additional endpoints would be needed for chat messages, prompts, etc.

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 