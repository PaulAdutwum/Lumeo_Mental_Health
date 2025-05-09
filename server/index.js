import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import axios from 'axios';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local first, then fall back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment variables from .env.local');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('Loading environment variables from .env');
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env or .env.local file found');
  dotenv.config();
}

// Log available API keys (don't log the actual keys, just if they exist)
console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
console.log('YOUTUBE_API_KEY available:', !!(process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY));
console.log('FIREBASE_API_KEY available:', !!process.env.VITE_FIREBASE_API_KEY);

// Initialize OpenAI with fallback
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set. AI features will be limited.');
}

// Simple YouTube service implementation
const youtubeService = {
  getVideoRecommendations: async (userId, emotion, limit) => {
    try {
      const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
      
      if (!youtubeApiKey) {
        console.warn('YouTube API key not available');
        return getFallbackVideos();
      }
      
      // Map emotions to relevant search terms
      const emotionMap = {
        anxiety: 'meditation for anxiety relief breathing exercises',
        sadness: 'uplifting meditation positive affirmations guided imagery',
        anger: 'calming meditation stress reduction mindfulness',
        fear: 'anxiety relief guided meditation safe space visualization',
        joy: 'positive meditation mindfulness gratitude practice',
        neutral: 'meditation mindfulness relaxation techniques'
      };
      
      const searchTerms = emotionMap[emotion?.toLowerCase()] || 'therapeutic meditation relaxation';
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: youtubeApiKey,
          q: searchTerms,
          part: 'snippet',
          maxResults: limit || 6,
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
      console.error('Error fetching YouTube videos:', error.message);
      return getFallbackVideos();
    }
  },
  logVideoWatch: async (userId, videoId, title, emotionBefore) => {
    console.log(`User ${userId} watched video ${videoId}: ${title}`);
    return true;
  },
  updateVideoFeedback: async (userId, videoId, feedback, emotionAfter) => {
    console.log(`User ${userId} gave ${feedback} feedback for video ${videoId}`);
    return true;
  },
  saveUserVideoPreferences: async (userId, categories) => {
    console.log(`User ${userId} preferences updated: ${categories.join(', ')}`);
    return true;
  }
};

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

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Configure body parsers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Import API routes
import mediaGenRoutes from './api/media-gen/image.js';
import canvasSuggestRoutes from './api/canvas/suggest.js';

app.use('/api/media-gen/image', mediaGenRoutes);
app.use('/api/canvas/suggest', canvasSuggestRoutes);

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Listen for user messages about the canvas
  socket.on('user-message', async (data) => {
    try {
      // Process with OpenAI if API key is available
      if (openai) {
        const canvasState = data.canvasState ? `The user's canvas has these elements: ${JSON.stringify(data.canvasState.objects?.length || 0)} objects.` : '';
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an AI drawing assistant. You help users improve their drawings by providing helpful suggestions and feedback. Keep responses brief, friendly, and specific to the drawing.'
            },
            {
              role: 'user',
              content: `${data.text}\n\n${canvasState}`
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        const aiMessage = response.choices[0].message.content;
        
        // Send AI response back to client
        socket.emit('ai-message', aiMessage);
      } else {
        // Fallback if no API key
        socket.emit('ai-message', "I notice you're working on a drawing. If you need specific suggestions, please let me know what you're trying to create.");
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('ai-message', "I'm having trouble processing your message. Please try again later.");
    }
  });
  
  // Listen for canvas events
  socket.on('canvas-event', (data) => {
    console.log('Canvas event:', data.type);
    
    // Process different event types
    if (data.type === 'CREATE_OBJECT') {
      // When user creates a new object
      socket.emit('ai-message', `I see you've added a ${data.metadata?.type || 'new element'} to your drawing. Looking good!`);
    } else if (data.type === 'CLEAR') {
      // When user clears the canvas
      socket.emit('ai-message', "Starting fresh with a clean canvas? What are you planning to create?");
    }
  });
  
  // Listen for canvas analysis
  socket.on('canvas-analysis', (data) => {
    console.log('Canvas analysis:', data.objectCount, 'objects detected');
    
    if (data.objectCount > 0) {
      socket.emit('ai-message', `I've detected ${data.objectCount} objects in your drawing. If you need suggestions for what to add next, just ask!`);
    } else {
      socket.emit('ai-message', "I don't see many distinct elements in your drawing yet. Try adding some shapes or lines to get started.");
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Initialize PostgreSQL connection pool if URL exists
const pool = process.env.POSTGRES_URL ? new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
}) : null;

// Verify database connection
app.get('/api/health', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT NOW()');
      res.json({ status: 'ok', timestamp: result.rows[0].now });
    } else {
      res.json({ status: 'ok', timestamp: new Date(), db: 'not configured' });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API endpoints for video recommendations
app.get('/api/videos/recommendations', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const emotion = req.query.emotion || 'neutral';
    const limit = parseInt(req.query.limit) || 6;
    
    const videos = await youtubeService.getVideoRecommendations(userId, emotion, limit);
    res.json(videos);
  } catch (error) {
    console.error('Error fetching video recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log video watch
app.post('/api/videos/watch', async (req, res) => {
  try {
    const { userId, videoId, title, emotionBefore } = req.body;
    
    if (!userId || !videoId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const success = await youtubeService.logVideoWatch(
      userId, 
      videoId, 
      title || 'Unknown Title', 
      emotionBefore
    );
    
    res.json({ success });
  } catch (error) {
    console.error('Error logging video watch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save video feedback
app.post('/api/videos/feedback', async (req, res) => {
  try {
    const { userId, videoId, feedback, emotionAfter } = req.body;
    
    if (!userId || !videoId || !feedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const success = await youtubeService.updateVideoFeedback(
      userId, 
      videoId, 
      feedback, 
      emotionAfter
    );
    
    res.json({ success });
  } catch (error) {
    console.error('Error saving video feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save user preferences
app.post('/api/videos/preferences', async (req, res) => {
  try {
    const { userId, categories } = req.body;
    
    if (!userId || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const success = await youtubeService.saveUserVideoPreferences(userId, categories);
    res.json({ success });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;

// Check if port is in use and try another one if needed
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use, trying another one...`);
    setTimeout(() => {
      server.close();
      server.listen(0); // Let the OS assign an available port
    }, 1000);
  } else {
    console.error('Server error:', e);
  }
});

server.listen(PORT, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' ? address.port : PORT;
  console.log(`Server running on port ${actualPort}`);
}); 