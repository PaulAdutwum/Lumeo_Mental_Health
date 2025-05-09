import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local first
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const router = express.Router();

// Image generation API endpoint
router.post('/', async (req, res) => {
  try {
    const { prompt, area } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }
    
    console.log(`Generating image with prompt: "${prompt}"`);
    
    // Determine the best size for the image based on the area
    const aspectRatio = area ? area.width / area.height : 1;
    let imageSize = '1024x1024'; // Default square
    
    if (aspectRatio > 1.3) {
      imageSize = '1792x1024'; // Landscape
    } else if (aspectRatio < 0.7) {
      imageSize = '1024x1792'; // Portrait
    }
    
    // Use OpenAI API for image generation
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: imageSize,
        quality: 'standard',
        response_format: 'url'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const imageUrl = response.data.data[0].url;
      
      // Optional: Save the generated image to your database
      // This can be useful for tracking usage and for future reference
      
      return res.status(200).json({ 
        imageUrl,
        prompt,
        size: imageSize
      });
    } else {
      return res.status(500).json({ error: 'Failed to generate image' });
    }
  } catch (error) {
    console.error('Error generating image:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({ error: 'Invalid prompt. Please try a different prompt.' });
    }
    
    return res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Placeholder fallback endpoint if real API fails
router.get('/fallback', (req, res) => {
  const placeholderImages = [
    'https://via.placeholder.com/1024x1024?text=AI+Image+Generation',
    'https://via.placeholder.com/1024x1024?text=Drawing+Assistant',
    'https://via.placeholder.com/1024x1024?text=Creative+AI'
  ];
  
  const randomIndex = Math.floor(Math.random() * placeholderImages.length);
  
  res.status(200).json({
    imageUrl: placeholderImages[randomIndex],
    prompt: req.query.prompt || 'placeholder',
    size: '1024x1024'
  });
});

export default router; 