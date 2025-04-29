import { Pool } from 'pg';
import AWS from 'aws-sdk';
import axios from 'axios';

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
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

// Export the pool for use in API routes
export { pool };

// Database collections mapping to our schema
export const TABLES = {
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

// User methods
export async function createUser(userData: any) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.USERS} 
       (id, email, oauth_provider, created_at, is_anonymous, prefs_json) 
       VALUES ($1, $2, $3, NOW(), $4, $5) 
       RETURNING id`,
      [
        user.uid,
        user.email,
        user.providerData[0]?.providerId || "email",
        user.isAnonymous,
        JSON.stringify(userData.prefs || {})
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Helper function to get current user - replace Firebase auth with Cognito
function getCurrentUser() {
  // In a real implementation, this would use Cognito or another auth provider
  // For now, we'll return mock data
  const authData = localStorage.getItem('auth');
  if (!authData) return null;
  
  try {
    return JSON.parse(authData);
  } catch (e) {
    return null;
  }
}

export async function getUserData(userId?: string) {
  try {
    const user = userId ? { uid: userId } : getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT * FROM ${TABLES.USERS} WHERE id = $1`,
      [user.uid]
    );

    if (result.rows.length > 0) {
      return { id: result.rows[0].id, ...result.rows[0] };
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
}

// Session methods
export async function createSession() {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.SESSIONS} 
       (user_id, started_at, last_active_at, jwt_token, is_active) 
       VALUES ($1, NOW(), NOW(), $2, true) 
       RETURNING id`,
      [user.uid, "mock-jwt-token"]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

export async function updateSessionActivity(sessionId: string) {
  try {
    await pool.query(
      `UPDATE ${TABLES.SESSIONS} SET last_active_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  } catch (error) {
    console.error("Error updating session activity:", error);
    throw error;
  }
}

// Chat message methods
export async function saveChatMessage(sessionId: string, message: {
  sender: 'user' | 'bot',
  text: string,
  sentiment_score?: number,
  emotion_label?: string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.CHAT_MESSAGES} 
       (session_id, user_id, sender, text, timestamp, sentiment_score, emotion_label) 
       VALUES ($1, $2, $3, $4, NOW(), $5, $6) 
       RETURNING id`,
      [
        sessionId,
        user.uid,
        message.sender,
        message.text,
        message.sentiment_score || 0,
        message.emotion_label || "neutral"
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
}

export async function getSessionMessages(sessionId: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM ${TABLES.CHAT_MESSAGES} 
       WHERE session_id = $1 
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting session messages:", error);
    throw error;
  }
}

// Media assets methods
export async function saveMediaAsset(promptId: string, assetData: {
  type: 'image' | 'video' | 'gif',
  url: string,
  model_used: string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.MEDIA_ASSETS} 
       (user_id, prompt_id, type, url, model_used, usage_count, created_at) 
       VALUES ($1, $2, $3, $4, $5, 1, NOW()) 
       RETURNING id`,
      [
        user.uid,
        promptId,
        assetData.type,
        assetData.url,
        assetData.model_used
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving media asset:", error);
    throw error;
  }
}

export async function incrementAssetUsage(assetId: string) {
  try {
    await pool.query(
      `UPDATE ${TABLES.MEDIA_ASSETS} 
       SET usage_count = usage_count + 1 
       WHERE id = $1`,
      [assetId]
    );
  } catch (error) {
    console.error("Error incrementing asset usage:", error);
    throw error;
  }
}

// Prompts methods
export async function savePrompt(messageId: string, promptData: {
  prompt_text: string,
  prompt_type: 'draw' | 'story' | 'movie-rec' | string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.PROMPTS} 
       (user_id, message_id, prompt_text, prompt_type, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [
        user.uid,
        messageId,
        promptData.prompt_text,
        promptData.prompt_type
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving prompt:", error);
    throw error;
  }
}

// Mood entries methods
export async function saveMoodEntryExtended(moodData: {
  mood_label: string,
  mood_score: number,
  notes?: string,
  session_id?: string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.MOOD_ENTRIES} 
       (user_id, session_id, mood_label, mood_score, notes, entry_time) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      [
        user.uid,
        moodData.session_id || null,
        moodData.mood_label,
        moodData.mood_score,
        moodData.notes || null
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving mood entry:", error);
    throw error;
  }
}

// Feedback logs methods
export async function saveFeedback(sessionId: string, feedbackData: {
  feature: 'chat' | 'draw' | 'game' | string,
  feedback_type: string,
  details?: string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.FEEDBACK_LOGS} 
       (user_id, session_id, feature, feedback_type, details, timestamp) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id`,
      [
        user.uid,
        sessionId,
        feedbackData.feature,
        feedbackData.feedback_type,
        feedbackData.details || null
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving feedback:", error);
    throw error;
  }
}

// Recommendations methods
export async function saveRecommendation(assetId: string, recommendationData: {
  source: 'TMDB' | 'self-gen' | string,
  feedback?: 'like' | 'dislike' | null
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.RECOMMENDATIONS} 
       (user_id, asset_id, source, feedback, timestamp) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [
        user.uid,
        assetId,
        recommendationData.source,
        recommendationData.feedback || null
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error saving recommendation:", error);
    throw error;
  }
}

export async function updateRecommendationFeedback(recId: string, feedback: 'like' | 'dislike' | null) {
  try {
    await pool.query(
      `UPDATE ${TABLES.RECOMMENDATIONS} 
       SET feedback = $1 
       WHERE id = $2`,
      [feedback, recId]
    );
  } catch (error) {
    console.error("Error updating recommendation feedback:", error);
    throw error;
  }
}

export async function getLatestMediaAssetId(): Promise<string> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT id FROM ${TABLES.MEDIA_ASSETS} 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [user.uid]
    );
    
    if (result.rows.length === 0) {
      throw new Error("No media assets found");
    }

    return result.rows[0].id;
  } catch (error) {
    console.error("Error getting latest media asset ID:", error);
    throw error;
  }
}

// Analytics methods
export async function getUserChatMessages(): Promise<any[]> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT * FROM ${TABLES.CHAT_MESSAGES} 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      [user.uid]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting user chat messages:", error);
    return [];
  }
}

export async function getUserMediaAssets(): Promise<any[]> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT * FROM ${TABLES.MEDIA_ASSETS} 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [user.uid]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting user media assets:", error);
    return [];
  }
}

export async function getUserMoodEntries(): Promise<any[]> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT * FROM ${TABLES.MOOD_ENTRIES} 
       WHERE user_id = $1 
       ORDER BY entry_time DESC 
       LIMIT 100`,
      [user.uid]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting user mood entries:", error);
    return [];
  }
}

// Video specific methods
export async function saveVideoPreference(categories: string[] | string, weight: number = 1.0) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Handle both single category (string) and multiple categories (array)
      const categoryArray = Array.isArray(categories) ? categories : [categories];
      
      // Delete existing preferences if multiple categories are provided
      if (Array.isArray(categories)) {
        await client.query(
          `DELETE FROM ${TABLES.VIDEO_PREFERENCES} WHERE user_id = $1`,
          [user.uid]
        );
      }
      
      // Insert each category
      for (const category of categoryArray) {
        if (Array.isArray(categories)) {
          // For bulk insert, just insert with default weight
          await client.query(
            `INSERT INTO ${TABLES.VIDEO_PREFERENCES} 
             (user_id, category, weight, created_at) 
             VALUES ($1, $2, $3, NOW())`,
            [user.uid, category, weight]
          );
        } else {
          // For single category, check if it exists and update if needed
          const existingResult = await client.query(
            `SELECT id FROM ${TABLES.VIDEO_PREFERENCES} 
             WHERE user_id = $1 AND category = $2`,
            [user.uid, category]
          );
          
          if (existingResult.rows.length > 0) {
            // Update existing preference
            await client.query(
              `UPDATE ${TABLES.VIDEO_PREFERENCES} 
               SET weight = $1 
               WHERE id = $2`,
              [weight, existingResult.rows[0].id]
            );
          } else {
            // Create new preference
            await client.query(
              `INSERT INTO ${TABLES.VIDEO_PREFERENCES} 
               (user_id, category, weight, created_at) 
               VALUES ($1, $2, $3, NOW())`,
              [user.uid, category, weight]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error saving video preferences:", error);
    throw error;
  }
}

export async function getVideoPreferences() {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `SELECT category, weight FROM ${TABLES.VIDEO_PREFERENCES} 
       WHERE user_id = $1 
       ORDER BY weight DESC`,
      [user.uid]
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting video preferences:", error);
    return [];
  }
}

export async function logVideoWatch(videoData: {
  videoId: string,
  title: string,
  emotionBefore?: string
}) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    const result = await pool.query(
      `INSERT INTO ${TABLES.VIDEO_HISTORY} 
       (user_id, video_id, title, emotion_before, watched_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [
        user.uid,
        videoData.videoId,
        videoData.title,
        videoData.emotionBefore || null
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("Error logging video watch:", error);
    throw error;
  }
}

export async function updateVideoFeedback(videoId: string, feedback: 'like' | 'dislike', emotionAfter?: string) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");

    await pool.query(
      `UPDATE ${TABLES.VIDEO_HISTORY} 
       SET feedback = $1, emotion_after = $2 
       WHERE user_id = $3 AND video_id = $4 
       ORDER BY watched_at DESC 
       LIMIT 1`,
      [feedback, emotionAfter || null, user.uid, videoId]
    );

    // If positive feedback, boost preference weights
    if (feedback === 'like') {
      const historyResult = await pool.query(
        `SELECT v.title FROM ${TABLES.VIDEO_HISTORY} v 
         WHERE v.user_id = $1 AND v.video_id = $2 
         ORDER BY v.watched_at DESC 
         LIMIT 1`,
        [user.uid, videoId]
      );
      
      if (historyResult.rows.length > 0) {
        // Extract keywords from title and boost their categories
        const title = historyResult.rows[0].title.toLowerCase();
        const categories = ['relaxation', 'meditation', 'anxiety', 'stress', 'sleep', 'mindfulness'];
        
        for (const category of categories) {
          if (title.includes(category)) {
            await saveVideoPreference(category, 1.2); // Boost weight by 20%
          }
        }
      }
    }
  } catch (error) {
    console.error("Error updating video feedback:", error);
    throw error;
  }
}

export async function getVideoRecommendations(): Promise<any[]> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("No authenticated user");
    
    // Get user preferences
    const preferences = await getVideoPreferences();
    
    // Build search query based on preferences or defaults
    let searchTerms;
    if (preferences.length > 0) {
      searchTerms = preferences.map(p => p.category).join(' OR ');
    } else {
      searchTerms = 'therapeutic meditation relaxation';
    }
    
    // Call YouTube API
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: import.meta.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY,
        q: searchTerms,
        part: 'snippet',
        maxResults: 5,
        type: 'video',
        videoEmbeddable: true
      }
    });
    
    return response.data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      description: item.snippet.description
    }));
  } catch (error) {
    console.error('Error getting video recommendations:', error);
    // Return mock data if API fails
    return [
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Guided Meditation for Anxiety and Stress Relief',
        thumbnailUrl: 'https://via.placeholder.com/320x180?text=Meditation',
        description: 'A calming meditation to help reduce anxiety and stress.'
      },
      {
        videoId: 'hHW1oY26kxQ',
        title: 'Relaxing Nature Sounds - Forest Bird Song',
        thumbnailUrl: 'https://via.placeholder.com/320x180?text=Nature+Sounds',
        description: 'Peaceful nature sounds to help you relax and focus.'
      }
    ];
  }
}

export default {
  createUser,
  getUserData,
  createSession,
  updateSessionActivity,
  saveChatMessage,
  getSessionMessages,
  saveMediaAsset,
  incrementAssetUsage,
  savePrompt,
  saveMoodEntryExtended,
  saveFeedback,
  saveMemory: async () => {}, // Placeholder for memory service
  saveRecommendation,
  updateRecommendationFeedback,
  logBillingEvent: async () => {}, // Placeholder for billing service
  getLatestMediaAssetId,
  getUserChatMessages,
  getUserMediaAssets,
  getUserMoodEntries,
  saveVideoPreference,
  getVideoPreferences,
  logVideoWatch,
  updateVideoFeedback,
  getVideoRecommendations
}; 