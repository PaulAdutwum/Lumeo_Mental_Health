const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// YouTube API key from environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Categories for different emotional states
const EMOTION_CATEGORIES = {
  sad: ['guided meditation for sadness', 'uplifting music', 'mood boosting'],
  anxious: ['anxiety relief', 'calming meditation', 'stress reduction techniques'],
  angry: ['anger management techniques', 'calming music', 'peaceful nature sounds'],
  happy: ['positive affirmations', 'gratitude practice', 'joyful meditation'],
  neutral: ['mindfulness practice', 'relaxation techniques', 'therapeutic music']
};

// Default categories if user has no preferences
const DEFAULT_CATEGORIES = ['meditation', 'relaxation', 'mindfulness', 'nature sounds'];

/**
 * Get video recommendations for a user based on their emotional state and preferences
 */
async function getVideoRecommendations(userId, emotion = 'neutral', limit = 6) {
  try {
    // Get user preferences from database
    const userPrefs = await getUserVideoPreferences(userId);
    
    // Determine which categories to search for
    let searchCategories = [];
    
    if (userPrefs && userPrefs.length > 0) {
      // Use user preferences if available
      searchCategories = userPrefs;
    } else if (emotion && EMOTION_CATEGORIES[emotion]) {
      // Use emotion-based categories if available
      searchCategories = EMOTION_CATEGORIES[emotion];
    } else {
      // Fall back to default categories
      searchCategories = DEFAULT_CATEGORIES;
    }
    
    // Randomly select one or two categories to avoid repetitive results
    const selectedCategories = searchCategories.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    // Get videos from YouTube API
    const videos = await searchYouTubeVideos(selectedCategories, emotion, limit);
    
    // Filter out videos the user has already rated negatively
    const filteredVideos = await filterDislikedVideos(userId, videos);
    
    return filteredVideos;
  } catch (error) {
    console.error('Error getting video recommendations:', error);
    throw error;
  }
}

/**
 * Search YouTube API for videos matching the given categories and emotion
 */
async function searchYouTubeVideos(categories, emotion, limit) {
  try {
    // Build search query combining categories and emotion
    const query = categories.join('|') + (emotion !== 'neutral' ? ` ${emotion}` : '');
    
    // Search YouTube API
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: limit * 2, // Request more than needed to account for filtering
        videoEmbeddable: 'true',
        videoCategory: '26', // "Howto & Style" category (includes wellness content)
        videoDuration: 'medium', // Videos between 4-20 minutes
        key: YOUTUBE_API_KEY
      }
    });
    
    // Transform response to our VideoRecommendation format
    const videos = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high.url
    }));
    
    return videos.slice(0, limit);
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    // Return empty array instead of throwing to avoid breaking the entire request
    return [];
  }
}

/**
 * Filter out videos that the user has previously disliked
 */
async function filterDislikedVideos(userId, videos) {
  try {
    // Get list of video IDs the user has disliked
    const result = await pool.query(
      'SELECT video_id FROM feedback_logs WHERE user_id = $1 AND feedback = $2',
      [userId, 'dislike']
    );
    
    const dislikedVideoIds = result.rows.map(row => row.video_id);
    
    // Filter out disliked videos
    return videos.filter(video => !dislikedVideoIds.includes(video.id));
  } catch (error) {
    console.error('Error filtering disliked videos:', error);
    // Return original videos if there's an error
    return videos;
  }
}

/**
 * Get user's video category preferences
 */
async function getUserVideoPreferences(userId) {
  try {
    const result = await pool.query(
      'SELECT category FROM video_preferences WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.map(row => row.category);
  } catch (error) {
    console.error('Error getting user video preferences:', error);
    return [];
  }
}

/**
 * Save user's video preferences
 */
async function saveUserVideoPreferences(userId, categories) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing preferences
    await client.query(
      'DELETE FROM video_preferences WHERE user_id = $1',
      [userId]
    );
    
    // Insert new preferences
    for (const category of categories) {
      await client.query(
        'INSERT INTO video_preferences (user_id, category) VALUES ($1, $2)',
        [userId, category]
      );
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving user video preferences:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Log a video watch event
 */
async function logVideoWatch(userId, videoId, title, emotionBefore) {
  try {
    await pool.query(
      `INSERT INTO video_history 
       (user_id, video_id, title, watched_at, emotion_before) 
       VALUES ($1, $2, $3, NOW(), $4)`,
      [userId, videoId, title, emotionBefore]
    );
    
    return true;
  } catch (error) {
    console.error('Error logging video watch:', error);
    return false;
  }
}

/**
 * Update video feedback
 */
async function updateVideoFeedback(userId, videoId, feedback, emotionAfter) {
  try {
    await pool.query(
      `INSERT INTO feedback_logs 
       (user_id, video_id, feedback, emotion_after, created_at) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, video_id) 
       DO UPDATE SET feedback = $3, emotion_after = $4, updated_at = NOW()`,
      [userId, videoId, feedback, emotionAfter]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating video feedback:', error);
    return false;
  }
}

module.exports = {
  getVideoRecommendations,
  saveUserVideoPreferences,
  logVideoWatch,
  updateVideoFeedback
}; 