const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { Pool } = require('pg');

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Configure API routes
const mediaGenRoutes = require('./api/media-gen/image');
const canvasSuggestRoutes = require('./api/canvas/suggest');

app.use('/api/media-gen/image', mediaGenRoutes);
app.use('/api/canvas/suggest', canvasSuggestRoutes);

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Listen for user messages about the canvas
  socket.on('user-message', async (data) => {
    try {
      console.log('Received message from user:', data.text);
      
      // Process with OpenAI if API key is available
      if (process.env.OPENAI_API_KEY) {
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

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Verify database connection
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now });
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 