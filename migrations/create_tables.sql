-- Create database tables for Lumeo application
-- Execute this script to set up the PostgreSQL schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  oauth_provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_anonymous BOOLEAN DEFAULT FALSE,
  prefs_json JSONB
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  jwt_token TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  user_id VARCHAR(255) REFERENCES users(id),
  sender VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sentiment_score FLOAT DEFAULT 0,
  emotion_label VARCHAR(50) DEFAULT 'neutral'
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  message_id INTEGER REFERENCES chat_messages(id),
  prompt_text TEXT NOT NULL,
  prompt_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  prompt_id INTEGER REFERENCES prompts(id),
  type VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  model_used VARCHAR(50),
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  asset_id INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  feedback VARCHAR(10),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mood entries table
CREATE TABLE IF NOT EXISTS mood_entries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  mood_label VARCHAR(50) NOT NULL,
  mood_score FLOAT NOT NULL,
  notes TEXT,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback logs table
CREATE TABLE IF NOT EXISTS feedback_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  feature VARCHAR(50) NOT NULL,
  feedback_type VARCHAR(50) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video preferences table
CREATE TABLE IF NOT EXISTS video_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, category)
);

-- Video history table
CREATE TABLE IF NOT EXISTS video_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  video_id VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  watch_duration INTEGER DEFAULT 0,
  emotion_before VARCHAR(50),
  emotion_after VARCHAR(50),
  feedback VARCHAR(10),
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_video_preferences_user_id ON video_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_video_history_user_id ON video_history(user_id);

-- Create a function to update last_active_at timestamp
CREATE OR REPLACE FUNCTION update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update session activity
CREATE TRIGGER update_session_activity
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE PROCEDURE update_last_active_at();

-- Insert default categories for video preferences
INSERT INTO video_preferences (user_id, category, weight)
VALUES 
  ('system', 'relaxation', 1.0),
  ('system', 'meditation', 1.0),
  ('system', 'mindfulness', 1.0),
  ('system', 'anxiety relief', 1.0),
  ('system', 'sleep', 1.0),
  ('system', 'nature sounds', 1.0),
  ('system', 'breathing exercises', 1.0)
ON CONFLICT (user_id, category) DO NOTHING; 