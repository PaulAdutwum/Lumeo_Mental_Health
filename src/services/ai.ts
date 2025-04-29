import OpenAI from 'openai';
import api from './api';

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development - in production use server-side API calls
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EmotionAnalysis {
  primaryEmotion: string;
  secondaryEmotion?: string;
  intensity: number; // 0-1 scale
  sentiment: 'positive' | 'negative' | 'neutral';
  suggestedApproach?: string;
}

// Emotion categories and their related prompts
export const emotionResponses = {
  anxiety: {
    prompts: [
      "I notice you seem anxious. Would you like to try a quick breathing exercise?",
      "It sounds like you're feeling worried. Let's explore what's behind that worry.",
      "When anxiety shows up, sometimes it helps to ground ourselves. Would you like to try a simple grounding technique?"
    ],
    exercises: [
      "Let's do a quick thought record. What's the anxious thought you're having?",
      "Try this breathing pattern: Breathe in for 4 counts, hold for 2, exhale for 6. Let's do it together.",
      "Name 5 things you can see right now, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste."
    ]
  },
  sadness: {
    prompts: [
      "I'm sensing some sadness in your words. Would you like to talk about it?",
      "It's okay to feel sad. Would you like me to sit with you in this feeling, or would you prefer some gentle distraction?",
      "Sometimes sadness is telling us something important. Do you want to explore what your sadness might be communicating?"
    ],
    exercises: [
      "Can you share one small thing that brought you joy recently, even if just for a moment?",
      "Let's create a self-compassion statement together. How would you comfort a friend feeling what you're feeling now?",
      "Would you like to try a guided visualization to a peaceful place?"
    ]
  },
  anger: {
    prompts: [
      "I'm noticing some frustration. Would you like to explore healthy ways to express it?",
      "Anger often masks other emotions. Would you like to dig a bit deeper together?",
      "It's natural to feel angry sometimes. Is there a specific trigger you can identify?"
    ],
    exercises: [
      "Take a moment to rate your anger on a scale of 1-10. Has acknowledging it changed the intensity at all?",
      "Let's try a quick release technique: imagine your anger as a color, and visualize it slowly leaving your body as you exhale.",
      "Would writing a letter (that you don't have to send) help express what you're feeling?"
    ]
  },
  joy: {
    prompts: [
      "I'm delighted to hear your positive energy! Would you like to explore ways to savor this feeling?",
      "It's wonderful that you're feeling good! What contributed to this positive state?",
      "Your joy is contagious! Would you like to create something to celebrate this feeling?"
    ],
    exercises: [
      "Let's record this positive moment in detail so you can revisit it later.",
      "Would you like to create a gratitude list related to what's bringing you joy right now?",
      "How about we generate an image that captures this feeling?"
    ]
  },
  fear: {
    prompts: [
      "I hear that you're feeling afraid. Remember that you're safe right now, in this moment.",
      "Fear can be overwhelming. Would you like to work through this feeling together?",
      "It's brave of you to acknowledge your fear. What would help you feel safer right now?"
    ],
    exercises: [
      "Let's try a quick reality check: What's the worst that could happen? What's the best? What's most likely?",
      "Try placing a hand on your heart and taking three slow breaths. Notice how your body feels.",
      "Would it help to visualize yourself handling this fear successfully?"
    ]
  },
  neutral: {
    prompts: [
      "How would you like to direct our conversation today?",
      "Is there anything specific you'd like to explore or create together?",
      "What's on your mind that you'd like to discuss?"
    ],
    exercises: [
      "Would you like to set an intention for our conversation?",
      "Is there a creative project you've been wanting to try?",
      "Would you like to explore some mindfulness practices?"
    ]
  }
};

/**
 * Analyze the emotion in text using OpenAI
 * @param text Text to analyze
 * @returns Emotion analysis
 */
export async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an emotion analysis expert. Analyze the emotional content of the following text and respond in JSON format with these fields:
          - primaryEmotion (string): The main emotion detected (anxiety, sadness, anger, joy, fear, neutral)
          - secondaryEmotion (string, optional): A secondary emotion if present
          - intensity (number): A value between 0-1 indicating the intensity of the emotion
          - sentiment (string): Either "positive", "negative", or "neutral"
          - suggestedApproach (string, optional): A brief suggested therapeutic approach`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    return JSON.parse(content) as EmotionAnalysis;
  } catch (error) {
    console.error('Error analyzing emotion:', error);
    // Return a default neutral analysis if error occurs
    return {
      primaryEmotion: 'neutral',
      intensity: 0.5,
      sentiment: 'neutral'
    };
  }
}

/**
 * Generate a chat completion from OpenAI
 * @param messages Array of messages to send to the API
 * @returns The generated response text
 */
export async function generateChatCompletion(messages: ChatMessage[], emotionContext?: EmotionAnalysis): Promise<string> {
  try {
    // Add emotion-aware system prompt if emotion context is provided
    let systemPrompt = "You are Lumio, an empathetic AI companion focused on supporting the user.";
    
    if (emotionContext) {
      systemPrompt += ` The user appears to be feeling ${emotionContext.primaryEmotion} with an intensity of ${emotionContext.intensity}. 
      Their overall sentiment is ${emotionContext.sentiment}. 
      ${emotionContext.suggestedApproach ? `Consider this approach: ${emotionContext.suggestedApproach}` : ''}
      Respond with genuine empathy and emotional intelligence. If appropriate, offer support or gentle guidance.`;
    }
    
    // Ensure the first message is a system message
    const updatedMessages = [...messages];
    if (messages.length > 0 && messages[0].role !== 'system') {
      updatedMessages.unshift({ role: 'system', content: systemPrompt });
    } else if (messages.length > 0) {
      // Update the existing system message
      updatedMessages[0] = { role: 'system', content: systemPrompt };
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: updatedMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw error;
  }
}

/**
 * Generate a therapeutic response based on detected emotion
 * @param emotion The primary emotion detected
 * @returns A therapeutic prompt or exercise
 */
export function getTherapeuticResponse(emotion: string): string {
  // Default to neutral if emotion not found
  const emotionType = emotionResponses[emotion as keyof typeof emotionResponses] || emotionResponses.neutral;
  
  // Randomly select a prompt or exercise
  const allResponses = [...emotionType.prompts, ...emotionType.exercises];
  const randomIndex = Math.floor(Math.random() * allResponses.length);
  
  return allResponses[randomIndex];
}

/**
 * Generate an image using DALL-E 3
 * @param prompt The prompt to generate an image from
 * @param size Optional image size (default: 1024x1024)
 * @returns URL of the generated image
 */
export async function generateImage(prompt: string, size: string = "1024x1024"): Promise<string> {
  try {
    // Check if OpenAI API key is configured
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiKey || openaiKey === 'your_openai_api_key') {
      console.log("OpenAI API key not configured, trying fallback to Replicate");
      return generateImageWithReplicate(prompt, size);
    }

    // Log the prompt to database
    let messageId, promptId;
    try {
      messageId = await api.saveChatMessage('system', {
        sender: 'user',
        text: prompt,
      });
      
      promptId = await api.savePrompt(messageId, {
        prompt_text: prompt,
        prompt_type: 'draw',
      });
    } catch (dbError) {
      console.warn("Could not save prompt to database, continuing without saving:", dbError);
      // Continue with image generation even if database saving fails
    }

    // Validate size
    const validSizes = ["1024x1024", "1024x1792", "1792x1024"];
    const imageSize = validSizes.includes(size) ? size : "1024x1024";

    console.log(`Generating image with OpenAI: prompt length ${prompt.length}, size ${imageSize}`);
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: imageSize as "1024x1024" | "1024x1792" | "1792x1024",
    });

    if (response.data && response.data.length > 0 && response.data[0].url) {
      const imageUrl = response.data[0].url;
      console.log("Image generated successfully with OpenAI");
      
      // Log the generated image to database if promptId exists
      try {
        if (promptId) {
          await api.saveMediaAsset(promptId, {
            type: 'image',
            url: imageUrl,
            model_used: 'dall-e-3',
          });
        }
      } catch (saveError) {
        console.warn("Failed to save image to database:", saveError);
        // Continue even if saving fails
      }
      
      return imageUrl;
    }
    
    // If OpenAI generation fails, try Replicate as fallback
    console.log("OpenAI image generation failed (no URL in response), trying Replicate");
    return generateImageWithReplicate(prompt, size, promptId);
  } catch (error) {
    console.error('Error generating image with OpenAI:', error);
    
    // Only use Replicate as fallback if it's not an API key or authentication issue
    if (error instanceof Error && 
        (error.message.includes('API key') || 
         error.message.includes('authentication') || 
         error.message.includes('billing'))) {
      console.log("Authentication or billing issue with OpenAI, trying Replicate");
    }
    
    // Try Replicate as fallback
    return generateImageWithReplicate(prompt, size);
  }
}

/**
 * Generate an image using Replicate Stable Diffusion as fallback
 * @param prompt The prompt to generate an image from
 * @param size Optional image size (default: 1024x1024)
 * @param promptId Optional ID of an existing prompt record
 * @returns URL of the generated image
 */
async function generateImageWithReplicate(prompt: string, size: string = "1024x1024", promptId?: string): Promise<string> {
  try {
    const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
    if (!replicateToken || replicateToken === 'your_replicate_api_token_for_stable_diffusion') {
      console.error('Replicate API token not configured');
      return 'https://via.placeholder.com/512x512?text=API+Key+Not+Configured';
    }

    // If no promptId was provided, create a new prompt record
    if (!promptId) {
      try {
        const messageId = await api.saveChatMessage('system', {
          sender: 'user',
          text: prompt,
        });
        
        promptId = await api.savePrompt(messageId, {
          prompt_text: prompt,
          prompt_type: 'draw',
        });
      } catch (dbError) {
        console.warn("Failed to save prompt to database:", dbError);
        // Continue even if database access fails
      }
    }

    // Parse dimensions from size string (e.g., "1024x1024" to [1024, 1024])
    const [width, height] = size.split('x').map(dim => parseInt(dim, 10));

    console.log(`Generating image with Replicate: prompt length ${prompt.length}, size ${width}x${height}`);
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "a85ae817c98777312d6872dce6edb4371c32b5e2afd373e7b6c9ac8c2844cd8b",
        input: {
          prompt: prompt,
          width: width || 768,
          height: height || 768,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Replicate API error (${response.status}): ${errorText}`);
    }

    const prediction = await response.json();
    
    // Check if we need to poll for results
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      console.log(`Polling for Replicate result, prediction ID: ${prediction.id}`);
      const imageUrl = await pollReplicateForResult(prediction.id);
      
      // Log the generated image to database
      try {
        if (promptId) {
          await api.saveMediaAsset(promptId, {
            type: 'image',
            url: imageUrl,
            model_used: 'stable-diffusion',
          });
        }
      } catch (saveError) {
        console.warn("Failed to save image to database:", saveError);
      }
      
      return imageUrl;
    }
    
    // Return the first output URL
    if (prediction.output && prediction.output.length > 0) {
      const imageUrl = prediction.output[0];
      console.log("Image generated successfully with Replicate");
      
      // Log the generated image to database
      try {
        if (promptId) {
          await api.saveMediaAsset(promptId, {
            type: 'image',
            url: imageUrl,
            model_used: 'stable-diffusion',
          });
        }
      } catch (saveError) {
        console.warn("Failed to save image to database:", saveError);
      }
      
      return imageUrl;
    }
    
    throw new Error('No image was generated from Replicate');
  } catch (error) {
    console.error('Error generating image with Replicate:', error);
    // Return a placeholder image if all generation methods fail
    const placeholderUrl = 'https://via.placeholder.com/512x512?text=Image+Generation+Failed';
    
    // If we have a promptId, log the failure
    try {
      if (promptId) {
        await api.saveMediaAsset(promptId, {
          type: 'image',
          url: placeholderUrl,
          model_used: 'placeholder',
        });
      }
    } catch (saveError) {
      console.warn("Failed to save placeholder image to database:", saveError);
    }
    
    return placeholderUrl;
  }
}

/**
 * Poll Replicate API for generation result
 * @param predictionId The prediction ID to poll for
 * @returns URL of the generated image
 */
async function pollReplicateForResult(predictionId: string): Promise<string> {
  const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
    
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      attempts++;
      continue;
    }
    
    const prediction = await response.json();
    
    if (prediction.status === 'succeeded') {
      if (prediction.output && prediction.output.length > 0) {
        return prediction.output[0];
      }
      break;
    } else if (prediction.status === 'failed') {
      break;
    }
    
    attempts++;
  }
  
  throw new Error('Timed out waiting for Replicate image generation');
}

/**
 * Generate a therapeutic image based on emotion and style
 */
export async function generateTherapeuticImage(emotion: string, size: string = "1024x1024", imageStyle?: string): Promise<string> {
  try {
    // First, log the emotion-based request
    let messageId, promptId;
    try {
      messageId = await api.saveChatMessage('system', {
        sender: 'user',
        text: `Generate therapeutic image for ${emotion}${imageStyle ? ` in ${imageStyle} style` : ''}`,
        emotion_label: emotion, // Just use the pure emotion
      });
    } catch (dbError) {
      console.warn("Could not save message to database, continuing without saving:", dbError);
      // Continue with image generation even if database saving fails
    }
    
    // Use the provided emotion and style separately instead of parsing them
    let baseEmotion = emotion.toLowerCase();
    let style = imageStyle || ""; // Use the provided imageStyle if available

    const emotionPrompts = {
      anxiety: "A calming, serene landscape with gentle flowing water and soft blue tones, creating a sense of peace and tranquility. Therapeutic art style.",
      sadness: "A gradually brightening sky after rain with a rainbow emerging, warm golden light breaking through clouds. Artistic style that evokes hope.",
      anger: "A peaceful forest clearing with a gentle stream and autumn leaves, cool blues and greens dominating the palette. Therapeutic art style.",
      fear: "A cozy, safe indoor space with warm lighting, comfortable textures, and gentle, protective elements. Artistic style that conveys security.",
      joy: "A vibrant, colorful meadow full of wildflowers under a clear blue sky with soft, fluffy clouds. Uplifting artistic style.",
      neutral: "A balanced natural scene with harmonious elements of earth, water, and sky in soft, pleasant colors. Artistic therapeutic style."
    };

    // Find the closest matching emotion if not exact
    let promptKey = Object.keys(emotionPrompts).find(key => 
      baseEmotion.includes(key)
    ) as keyof typeof emotionPrompts;
    
    // Default to neutral if no match
    if (!promptKey) promptKey = "neutral";
    
    let prompt = emotionPrompts[promptKey];
    
    // Add style if specified
    if (style && style !== "photorealistic") {
      prompt += ` In ${style} style.`;
    }
    
    console.log(`Generating therapeutic image for emotion: ${baseEmotion}, prompt: "${prompt}"`);
    
    // Save the therapeutic prompt
    try {
      if (messageId) {
        promptId = await api.savePrompt(messageId, {
          prompt_text: prompt,
          prompt_type: 'therapeutic-image',
        });
      }
    } catch (dbError) {
      console.warn("Could not save prompt to database, continuing without saving:", dbError);
    }
    
    // Generate the image with the full prompt
    const finalPrompt = prompt + " Make this image suitable for therapeutic purposes, with no text or people.";
    const imageUrl = await generateImage(finalPrompt, size);
    
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error("Failed to generate a valid image URL");
    }
    
    // Store the media asset in the database
    try {
      if (promptId) {
        await api.saveMediaAsset(promptId, {
          type: 'image',
          url: imageUrl,
          model_used: 'stable-diffusion',
        });
      }
    } catch (dbError) {
      console.warn("Could not save media asset to database:", dbError);
    }
    
    // Log a recommendation
    try {
      if (promptId) {
        const assetId = await api.getLatestMediaAssetId();
        await api.saveRecommendation(assetId, {
          source: 'self-gen',
        });
      }
    } catch (error) {
      console.error('Error saving recommendation:', error);
      // Continue even if saving recommendation fails
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error generating therapeutic image:', error);
    
    // Return a placeholder if all fails
    return 'https://via.placeholder.com/512x512?text=Therapeutic+Image+Generation+Failed';
  }
}

/**
 * Generate a text-to-speech audio
 * @param text The text to convert to speech
 * @param emotion Optional emotion to influence voice style
 * @returns Audio data as a blob
 */
export async function generateSpeech(text: string, emotion?: string): Promise<Blob> {
  try {
    // Select voice based on emotion
    let voice = 'alloy'; // default neutral voice
    
    if (emotion) {
      // Map emotions to appropriate voices
      const voiceMap: Record<string, string> = {
        anxiety: 'nova', // calming voice
        sadness: 'echo', // warm voice
        anger: 'onyx', // steady voice
        fear: 'nova', // calming voice
        joy: 'shimmer', // upbeat voice
      };
      
      voice = voiceMap[emotion] || 'alloy';
    }
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
    });

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

/**
 * Transcribe speech to text
 * @param audioFile The audio file to transcribe
 * @returns Transcribed text
 */
export async function transcribeSpeech(audioFile: File): Promise<string> {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw error;
  }
}

/**
 * Generate breathing exercise animation data
 * @param intensity Level of anxiety (1-5)
 * @returns Animation settings for breathing exercise
 */
export function getBreathingExercise(intensity: number) {
  // Scale intensity to 1-5 range if it's on a different scale
  const scaledIntensity = Math.max(1, Math.min(5, Math.ceil(intensity * 5)));
  
  // Define breathing patterns based on anxiety intensity
  const patterns = {
    1: { inhale: 4, hold: 2, exhale: 4, holdAfterExhale: 0, cycles: 5 }, // Mild anxiety
    2: { inhale: 4, hold: 2, exhale: 6, holdAfterExhale: 0, cycles: 5 }, // Low anxiety
    3: { inhale: 4, hold: 4, exhale: 6, holdAfterExhale: 0, cycles: 6 }, // Moderate anxiety
    4: { inhale: 4, hold: 7, exhale: 8, holdAfterExhale: 0, cycles: 6 }, // High anxiety
    5: { inhale: 5, hold: 5, exhale: 8, holdAfterExhale: 2, cycles: 8 }  // Severe anxiety
  };
  
  return patterns[scaledIntensity as keyof typeof patterns];
}

export default {
  generateChatCompletion,
  generateImage,
  generateSpeech,
  transcribeSpeech,
  analyzeEmotion,
  getTherapeuticResponse,
  generateTherapeuticImage,
  getBreathingExercise
}; 