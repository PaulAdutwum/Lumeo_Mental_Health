import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, prompt } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'Missing imageData parameter' });
    }
    
    // Extract the base64 data from the data URL
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Load the image for basic analysis
    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Perform basic analysis to detect colors, density, and complexity
    const imageAnalysis = analyzeImage(ctx, image.width, image.height);
    
    // Generate AI suggestions using OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return res.status(200).json({ 
        suggestion: "I notice your drawing has some interesting elements. Consider adding more details or experimenting with different colors.",
        analysis: imageAnalysis
      });
    }
    
    // Prepare the prompt for OpenAI
    const defaultPrompt = "What improvements would you suggest for this drawing?";
    const enhancedPrompt = `
      Analyze this drawing and provide helpful suggestions for improvement. 
      Here's an analysis of the image:
      - Color palette: ${imageAnalysis.colorPalette.join(', ')}
      - Complexity: ${imageAnalysis.complexity}
      - Main colors: ${imageAnalysis.mainColors.join(', ')}
      - Empty space: ${imageAnalysis.emptySpacePercentage}%
      
      The user asked: "${prompt || defaultPrompt}"
      
      Provide specific, actionable suggestions to improve the drawing. If appropriate, suggest shapes, colors, or elements to add.
      Also provide JSON drawing instructions that could be applied programmatically.
    `;
    
    // Call OpenAI API for suggestions
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert art teacher and drawing assistant. You provide helpful, specific suggestions to improve drawings.' },
          { role: 'user', content: enhancedPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiResponse = response.data.choices[0].message.content;
      
      // Try to extract JSON instructions if present
      let instructions = null;
      try {
        const jsonMatch = aiResponse.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          instructions = JSON.parse(jsonMatch[1]);
        }
      } catch (error) {
        console.warn('Failed to parse JSON instructions from AI response:', error);
      }
      
      // Clean the suggestion text (remove any JSON blocks)
      const suggestion = aiResponse.replace(/```(?:json)?\s*{[\s\S]*?}\s*```/g, '')
        .trim();
      
      return res.status(200).json({
        suggestion,
        instructions,
        analysis: imageAnalysis
      });
    } else {
      // Fallback suggestion if AI fails
      return res.status(200).json({
        suggestion: "I've analyzed your drawing and noticed some interesting elements. Consider adding more contrast between elements and perhaps exploring different colors to make it pop!",
        analysis: imageAnalysis
      });
    }
  } catch (error) {
    console.error('Error analyzing canvas:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to analyze canvas',
      suggestion: "I couldn't analyze your drawing completely. Try adding more elements or different colors to make it more interesting!"
    });
  }
}

// Basic image analysis function
function analyzeImage(ctx, width, height) {
  // Sample colors from the image
  const pixelSamples = 1000;
  const colorMap = {};
  const emptyPixels = [];
  
  for (let i = 0; i < pixelSamples; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    
    // Check if this is an empty/transparent pixel
    if (pixelData[3] < 50) {
      emptyPixels.push([x, y]);
      continue;
    }
    
    // Create color key
    const colorKey = `rgb(${pixelData[0]},${pixelData[1]},${pixelData[2]})`;
    colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
  }
  
  // Calculate empty space percentage
  const emptySpacePercentage = Math.round((emptyPixels.length / pixelSamples) * 100);
  
  // Get the main colors (top 5)
  const sortedColors = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);
  
  // Simple palette detection (simple, monochrome, colorful)
  let colorPalette = ['simple'];
  if (sortedColors.length <= 2) {
    colorPalette = ['monochrome'];
  } else if (sortedColors.length >= 4) {
    colorPalette = ['colorful'];
  }
  
  // Determine complexity based on color variety and distribution
  const uniqueColors = Object.keys(colorMap).length;
  let complexity = 'simple';
  
  if (uniqueColors > 10) {
    complexity = 'complex';
  } else if (uniqueColors > 5) {
    complexity = 'moderate';
  }
  
  return {
    width,
    height,
    emptySpacePercentage,
    mainColors: sortedColors,
    colorPalette,
    complexity,
    uniqueColors
  };
} 