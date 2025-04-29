/**
 * Firebase to PostgreSQL Migration Script
 * 
 * This script migrates data from Firebase Firestore to PostgreSQL
 * Run with: node migrate-firebase-to-postgres.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-credentials.json');
const format = require('pg-format');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: process.env.VITE_DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Collection mapping
const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  CHAT_MESSAGES: 'chat_messages',
  PROMPTS: 'prompts',
  MEDIA_ASSETS: 'media_assets',
  RECOMMENDATIONS: 'recommendations',
  MOOD_ENTRIES: 'mood_entries',
  FEEDBACK_LOGS: 'feedback_logs'
};

// Helper for Firestore timestamp to PostgreSQL timestamp
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

// Migration functions
async function migrateUsers() {
  console.log('Migrating users...');
  const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
  
  if (usersSnapshot.empty) {
    console.log('No users to migrate.');
    return;
  }

  const userValues = [];
  
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    userValues.push([
      doc.id,
      userData.email || '',
      userData.oauth_provider || 'email',
      convertTimestamp(userData.created_at) || new Date(),
      userData.is_anonymous || false,
      JSON.stringify(userData.prefs_json || {})
    ]);
  });

  const query = format('INSERT INTO users (id, email, oauth_provider, created_at, is_anonymous, prefs_json) VALUES %L ON CONFLICT (id) DO NOTHING', userValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${userValues.length} users.`);
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}

async function migrateSessions() {
  console.log('Migrating sessions...');
  const sessionsSnapshot = await db.collection(COLLECTIONS.SESSIONS).get();
  
  if (sessionsSnapshot.empty) {
    console.log('No sessions to migrate.');
    return;
  }

  const sessionValues = [];
  const sessionIds = {};
  let counter = 1;
  
  sessionsSnapshot.forEach(doc => {
    const sessionData = doc.data();
    const newId = counter++;
    sessionIds[doc.id] = newId;
    
    sessionValues.push([
      newId, // Using a sequence because Postgres needs numeric IDs for foreign keys
      sessionData.user_id || '',
      convertTimestamp(sessionData.started_at) || new Date(),
      convertTimestamp(sessionData.last_active_at) || new Date(),
      sessionData.jwt_token || '',
      sessionData.is_active || true
    ]);
  });

  const query = format('INSERT INTO sessions (id, user_id, started_at, last_active_at, jwt_token, is_active) VALUES %L ON CONFLICT (id) DO NOTHING', sessionValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${sessionValues.length} sessions.`);
    
    // Store session ID mapping for later relations
    return sessionIds;
  } catch (error) {
    console.error('Error migrating sessions:', error);
    return {};
  }
}

async function migrateChatMessages(sessionIds) {
  console.log('Migrating chat messages...');
  const messagesSnapshot = await db.collection(COLLECTIONS.CHAT_MESSAGES).get();
  
  if (messagesSnapshot.empty) {
    console.log('No messages to migrate.');
    return;
  }

  const messageValues = [];
  const messageIds = {};
  let counter = 1;
  
  messagesSnapshot.forEach(doc => {
    const messageData = doc.data();
    const newId = counter++;
    messageIds[doc.id] = newId;
    
    // Convert session ID using mapping
    const sessionId = messageData.session_id ? sessionIds[messageData.session_id] : null;
    
    messageValues.push([
      newId,
      sessionId,
      messageData.user_id || '',
      messageData.sender || 'user',
      messageData.text || '',
      convertTimestamp(messageData.timestamp) || new Date(),
      messageData.sentiment_score || 0,
      messageData.emotion_label || 'neutral'
    ]);
  });

  const query = format('INSERT INTO chat_messages (id, session_id, user_id, sender, text, timestamp, sentiment_score, emotion_label) VALUES %L ON CONFLICT (id) DO NOTHING', messageValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${messageValues.length} chat messages.`);
    
    // Store message ID mapping for later relations
    return messageIds;
  } catch (error) {
    console.error('Error migrating chat messages:', error);
    return {};
  }
}

async function migratePrompts(messageIds) {
  console.log('Migrating prompts...');
  const promptsSnapshot = await db.collection(COLLECTIONS.PROMPTS).get();
  
  if (promptsSnapshot.empty) {
    console.log('No prompts to migrate.');
    return;
  }

  const promptValues = [];
  const promptIds = {};
  let counter = 1;
  
  promptsSnapshot.forEach(doc => {
    const promptData = doc.data();
    const newId = counter++;
    promptIds[doc.id] = newId;
    
    // Convert message ID using mapping
    const messageId = promptData.message_id ? messageIds[promptData.message_id] : null;
    
    promptValues.push([
      newId,
      promptData.user_id || '',
      messageId,
      promptData.prompt_text || '',
      promptData.prompt_type || 'general',
      convertTimestamp(promptData.created_at) || new Date()
    ]);
  });

  const query = format('INSERT INTO prompts (id, user_id, message_id, prompt_text, prompt_type, created_at) VALUES %L ON CONFLICT (id) DO NOTHING', promptValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${promptValues.length} prompts.`);
    
    // Store prompt ID mapping for later relations
    return promptIds;
  } catch (error) {
    console.error('Error migrating prompts:', error);
    return {};
  }
}

async function migrateMediaAssets(promptIds) {
  console.log('Migrating media assets...');
  const assetsSnapshot = await db.collection(COLLECTIONS.MEDIA_ASSETS).get();
  
  if (assetsSnapshot.empty) {
    console.log('No media assets to migrate.');
    return;
  }

  const assetValues = [];
  const assetIds = {};
  let counter = 1;
  
  assetsSnapshot.forEach(doc => {
    const assetData = doc.data();
    const newId = counter++;
    assetIds[doc.id] = newId;
    
    // Convert prompt ID using mapping
    const promptId = assetData.prompt_id ? promptIds[assetData.prompt_id] : null;
    
    assetValues.push([
      newId,
      assetData.user_id || '',
      promptId,
      assetData.type || 'image',
      assetData.url || '',
      assetData.model_used || '',
      assetData.usage_count || 1,
      convertTimestamp(assetData.created_at) || new Date()
    ]);
  });

  const query = format('INSERT INTO media_assets (id, user_id, prompt_id, type, url, model_used, usage_count, created_at) VALUES %L ON CONFLICT (id) DO NOTHING', assetValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${assetValues.length} media assets.`);
    
    // Store asset ID mapping for later relations
    return assetIds;
  } catch (error) {
    console.error('Error migrating media assets:', error);
    return {};
  }
}

async function migrateRecommendations(assetIds) {
  console.log('Migrating recommendations...');
  const recsSnapshot = await db.collection(COLLECTIONS.RECOMMENDATIONS).get();
  
  if (recsSnapshot.empty) {
    console.log('No recommendations to migrate.');
    return;
  }

  const recValues = [];
  let counter = 1;
  
  recsSnapshot.forEach(doc => {
    const recData = doc.data();
    
    // Convert asset ID using mapping
    const assetId = recData.asset_id ? assetIds[recData.asset_id] : null;
    if (!assetId) return; // Skip if no valid asset ID mapping
    
    recValues.push([
      counter++,
      recData.user_id || '',
      assetId,
      recData.source || 'system',
      recData.feedback || null,
      convertTimestamp(recData.timestamp) || new Date()
    ]);
  });

  if (recValues.length === 0) {
    console.log('No valid recommendations to migrate.');
    return;
  }

  const query = format('INSERT INTO recommendations (id, user_id, asset_id, source, feedback, timestamp) VALUES %L ON CONFLICT (id) DO NOTHING', recValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${recValues.length} recommendations.`);
  } catch (error) {
    console.error('Error migrating recommendations:', error);
  }
}

async function migrateMoodEntries(sessionIds) {
  console.log('Migrating mood entries...');
  const moodSnapshot = await db.collection(COLLECTIONS.MOOD_ENTRIES).get();
  
  if (moodSnapshot.empty) {
    console.log('No mood entries to migrate.');
    return;
  }

  const moodValues = [];
  let counter = 1;
  
  moodSnapshot.forEach(doc => {
    const moodData = doc.data();
    
    // Convert session ID using mapping
    const sessionId = moodData.session_id ? sessionIds[moodData.session_id] : null;
    
    moodValues.push([
      counter++,
      moodData.user_id || '',
      sessionId,
      moodData.mood_label || 'neutral',
      moodData.mood_score || 0,
      moodData.notes || null,
      convertTimestamp(moodData.entry_time) || new Date()
    ]);
  });

  const query = format('INSERT INTO mood_entries (id, user_id, session_id, mood_label, mood_score, notes, entry_time) VALUES %L ON CONFLICT (id) DO NOTHING', moodValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${moodValues.length} mood entries.`);
  } catch (error) {
    console.error('Error migrating mood entries:', error);
  }
}

async function migrateFeedbackLogs(sessionIds) {
  console.log('Migrating feedback logs...');
  const feedbackSnapshot = await db.collection(COLLECTIONS.FEEDBACK_LOGS).get();
  
  if (feedbackSnapshot.empty) {
    console.log('No feedback logs to migrate.');
    return;
  }

  const feedbackValues = [];
  let counter = 1;
  
  feedbackSnapshot.forEach(doc => {
    const feedbackData = doc.data();
    
    // Convert session ID using mapping
    const sessionId = feedbackData.session_id ? sessionIds[feedbackData.session_id] : null;
    
    feedbackValues.push([
      counter++,
      feedbackData.user_id || '',
      sessionId,
      feedbackData.feature || '',
      feedbackData.feedback_type || '',
      feedbackData.details || null,
      convertTimestamp(feedbackData.timestamp) || new Date()
    ]);
  });

  const query = format('INSERT INTO feedback_logs (id, user_id, session_id, feature, feedback_type, details, timestamp) VALUES %L ON CONFLICT (id) DO NOTHING', feedbackValues);
  
  try {
    await pool.query(query);
    console.log(`Migrated ${feedbackValues.length} feedback logs.`);
  } catch (error) {
    console.error('Error migrating feedback logs:', error);
  }
}

// Reset PostgreSQL sequence IDs after migration
async function resetSequences() {
  console.log('Resetting sequence IDs...');
  
  const tables = [
    'sessions', 
    'chat_messages', 
    'prompts', 
    'media_assets', 
    'recommendations', 
    'mood_entries', 
    'feedback_logs'
  ];
  
  for (const table of tables) {
    try {
      await pool.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), 
          (SELECT MAX(id) FROM ${table}), true);
      `);
    } catch (error) {
      console.error(`Error resetting sequence for ${table}:`, error);
    }
  }
  
  console.log('Sequence IDs reset.');
}

// Main migration function
async function migrateAll() {
  console.log('Starting Firebase to PostgreSQL migration...');
  
  try {
    // Migrate in order of dependencies
    await migrateUsers();
    const sessionIds = await migrateSessions();
    const messageIds = await migrateChatMessages(sessionIds);
    const promptIds = await migratePrompts(messageIds);
    const assetIds = await migrateMediaAssets(promptIds);
    await migrateRecommendations(assetIds);
    await migrateMoodEntries(sessionIds);
    await migrateFeedbackLogs(sessionIds);
    
    // Reset sequences to correct values after migration
    await resetSequences();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connections
    await pool.end();
    admin.app().delete();
  }
}

// Execute migration
migrateAll(); 