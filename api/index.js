import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create Express app
const app = express();
const server = createServer(app);

// Configure CORS
app.use(cors());

// Configure body parsers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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
  
  // Listen for user messages about the canvas
  socket.on('user-message', async (data) => {
    try {
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
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Default export for Vercel serverless function
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'API is running' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Start the server if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 