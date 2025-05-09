// Production server entry point
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

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

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

// Configure body parsers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Simple fallback for AI features
  socket.on('user-message', async (data) => {
    try {
      // Fallback response
      socket.emit('ai-message', "I notice you're working on a drawing. If you need specific suggestions, please let me know what you're trying to create.");
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('ai-message', "I'm having trouble processing your message. Please try again later.");
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Root route - always return the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start the server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}); 