import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
} 