import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaTimes,
  FaImage,
  FaDownload,
  FaShare,
  FaMagic,
  FaAdjust,
  FaCog,
  FaExclamationTriangle,
} from "react-icons/fa";
import { generateTherapeuticImage, generateImage } from "../services/ai";
import db from "../services/database";

interface TherapeuticImageGeneratorProps {
  emotion?: string;
  onClose: () => void;
}

const TherapeuticImageGenerator: React.FC<TherapeuticImageGeneratorProps> = ({
  emotion = "neutral",
  onClose,
}) => {
  const [prompt, setPrompt] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [imageStyle, setImageStyle] = useState("photorealistic");
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeysConfigured, setApiKeysConfigured] = useState(true);

  // Default prompts based on emotions
  const emotionPrompts: Record<string, string> = {
    anxiety:
      "A serene Japanese zen garden with gentle flowing water and smooth stones",
    sadness:
      "A sunrise breaking through clouds after rain, with vibrant colors of hope",
    anger:
      "A peaceful forest clearing with soft sunlight filtering through leaves",
    fear: "A cozy cabin interior with warm fireplace light, surrounded by books and comfort",
    joy: "Colorful butterflies dancing around blooming wildflowers in a sunlit meadow",
    neutral:
      "A tranquil beach scene with gentle waves and soft pastel sunset colors",
  };

  // Style options for image generation
  const styleOptions = {
    photorealistic: "Photorealistic",
    painterly: "Painterly",
    watercolor: "Watercolor",
    digital: "Digital Art",
    illustrative: "Illustrative",
    abstract: "Abstract",
  };

  // Set default prompt based on emotion
  useEffect(() => {
    const defaultPrompt =
      emotionPrompts[emotion.toLowerCase()] || emotionPrompts.neutral;
    setPrompt(defaultPrompt);
  }, [emotion]);

  // Check if API keys are configured
  useEffect(() => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const replicateToken = import.meta.env.VITE_REPLICATE_API_TOKEN;

    if (
      (!openaiKey || openaiKey === "your_openai_api_key") &&
      (!replicateToken ||
        replicateToken === "your_replicate_api_token_for_stable_diffusion")
    ) {
      setApiKeysConfigured(false);
      setError(
        "Image generation requires API keys. Please configure OpenAI or Replicate API keys in your .env file."
      );
    } else {
      setApiKeysConfigured(true);
    }
  }, []);

  // Generate the image
  const handleGenerateImage = async () => {
    try {
      setIsGenerating(true);
      setError("");
      setImageUrl(""); // Clear any previous image while generating

      let result;
      const stylePrompt =
        imageStyle !== "photorealistic" ? ` in ${imageStyle} style` : "";

      if (useCustomPrompt && prompt) {
        // Use custom prompt with the general image generator
        const fullPrompt = `${prompt}${stylePrompt}. Make this image suitable for therapeutic purposes, with no text or people.`;
        console.log("Generating image with custom prompt:", fullPrompt);

        result = await generateImage(fullPrompt, imageSize);
      } else {
        // Use the emotion-based therapeutic image generator with style
        const emotionToUse = emotion.toLowerCase();
        console.log(
          `Generating therapeutic image for emotion: ${emotionToUse}, style: ${imageStyle}`
        );

        // Pass the emotion, size and style as separate parameters
        result = await generateTherapeuticImage(
          emotionToUse,
          imageSize,
          imageStyle !== "photorealistic" ? imageStyle : undefined
        );
      }

      // Validate the result
      if (!result || typeof result !== "string" || !result.startsWith("http")) {
        console.error("Invalid image URL returned:", result);
        throw new Error("Failed to generate a valid image");
      }

      console.log("Image generated successfully:", result);
      setImageUrl(result);

      // Add to history
      setGenerationHistory((prev) => [result, ...prev].slice(0, 5));
    } catch (error: any) {
      console.error("Error generating image:", error);
      setError(
        error.message ||
          "An error occurred while generating the image. Please try again later."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Download the generated image
  const handleDownload = async () => {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `therapeutic-image-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log download as positive feedback
    try {
      const mediaAssetId = await db.getLatestMediaAssetId();
      await db.saveFeedback("current", {
        feature: "image",
        feedback_type: "download",
        details: "User downloaded therapeutic image",
      });

      // Update recommendation with positive feedback
      await db.saveRecommendation(mediaAssetId, {
        source: "self-gen",
        feedback: "like",
      });

      // Increment usage counter for this image
      await db.incrementAssetUsage(mediaAssetId);
    } catch (err) {
      console.error("Error logging download feedback:", err);
    }
  };

  // Share the image (simplified)
  const handleShare = async () => {
    if (!imageUrl || !("share" in navigator)) return;

    try {
      await navigator.share({
        title: "Therapeutic Image from Lumio AI",
        text: "Here is a therapeutic image that might help you feel better",
        url: imageUrl,
      });

      // Log successful share as feedback
      try {
        const mediaAssetId = await db.getLatestMediaAssetId();
        await db.saveFeedback("current", {
          feature: "image",
          feedback_type: "share",
          details: "User shared therapeutic image",
        });

        // Increment usage counter for this image
        await db.incrementAssetUsage(mediaAssetId);
      } catch (err) {
        console.error("Error logging share feedback:", err);
      }
    } catch (error) {
      console.error("Error sharing image:", error);
    }
  };

  // Regenerate with slight variation
  const handleRegenerate = async () => {
    if (!prompt && !useCustomPrompt) return;

    const variationPrompt = useCustomPrompt
      ? `${prompt} (slightly different variation)`
      : "";

    setPrompt(variationPrompt);
    handleGenerateImage();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <motion.div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <FaImage className="mr-2" />
            Therapeutic Image Generator
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <FaCog className="text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <FaTimes className="text-gray-400" />
            </button>
          </div>
        </div>

        {!apiKeysConfigured && (
          <div className="mb-6 p-4 bg-yellow-900/40 border border-yellow-700 rounded-lg flex items-start">
            <FaExclamationTriangle className="text-yellow-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="text-yellow-200 font-medium">
                API Keys Not Configured
              </p>
              <p className="text-yellow-300/80 text-sm mt-1">
                Image generation requires either OpenAI or Replicate API keys.
                Please add your API keys to the .env file. You can still use the
                application, but image generation will return placeholders.
              </p>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-white font-semibold mb-3">Image Settings</h3>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Image Size</label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                <option value="1024x1024">1024×1024 (Standard)</option>
                <option value="1024x1792">1024×1792 (Portrait)</option>
                <option value="1792x1024">1792×1024 (Landscape)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Art Style</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(styleOptions).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setImageStyle(key)}
                    className={`p-2 rounded text-sm ${
                      imageStyle === key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="flex items-center text-gray-300 mb-2">
            <input
              type="checkbox"
              checked={useCustomPrompt}
              onChange={() => setUseCustomPrompt(!useCustomPrompt)}
              className="mr-2"
            />
            Use custom prompt instead of emotion-based generation
          </label>
        </div>

        {useCustomPrompt && (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="prompt">
              Custom Image Description
            </label>
            <textarea
              id="prompt"
              rows={3}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              placeholder="Describe the image you'd like to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-gray-400 text-sm mt-2">
              We'll create a therapeutic image based on your description.
              {imageStyle !== "photorealistic" && (
                <span>
                  {" "}
                  Using {
                    styleOptions[imageStyle as keyof typeof styleOptions]
                  }{" "}
                  style.
                </span>
              )}
            </p>
          </div>
        )}

        {!useCustomPrompt && (
          <div className="mb-6">
            <p className="text-gray-300 mb-2">
              Selected emotion: <span className="font-semibold">{emotion}</span>
            </p>
            <p className="text-gray-400 text-sm">
              We'll generate a therapeutic image designed to help with{" "}
              {emotion.toLowerCase()} emotions
              {imageStyle !== "photorealistic" && (
                <span>
                  {" "}
                  in {
                    styleOptions[imageStyle as keyof typeof styleOptions]
                  }{" "}
                  style
                </span>
              )}
              .
            </p>
          </div>
        )}

        <div className="flex justify-center mb-6 space-x-3">
          <button
            onClick={handleGenerateImage}
            disabled={
              isGenerating || (useCustomPrompt && !prompt) || !apiKeysConfigured
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            title={!apiKeysConfigured ? "API keys not configured" : undefined}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Generating...
              </>
            ) : (
              <>
                <FaMagic className="mr-2" />
                Generate Image
              </>
            )}
          </button>

          {imageUrl && (
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <FaAdjust className="mr-2" />
              Regenerate
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-800 rounded-lg text-red-200 flex items-start">
            <FaExclamationTriangle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium">Error Generating Image</p>
              <p className="mt-1 text-sm">{error}</p>
              {(!apiKeysConfigured || error.includes("API key")) && (
                <div className="mt-2 text-sm bg-red-900/30 p-2 rounded">
                  <p className="mb-1">
                    <strong>How to fix:</strong>
                  </p>
                  <ol className="list-decimal list-inside">
                    <li>
                      Add your OpenAI or Replicate API key to the .env file and
                      restart the app.
                    </li>
                    <li>
                      If you don't have an API key, you can still use the app,
                      but image generation will show a placeholder.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {!imageUrl && error && !isGenerating && (
          <div className="flex flex-col items-center justify-center mt-6">
            <img
              src="https://via.placeholder.com/512x512?text=Image+Generation+Failed"
              alt="Fallback"
              className="w-48 h-48 object-contain rounded mb-2"
            />
            <p className="text-red-300 text-sm">
              Image generation failed. Please check your API keys or try again
              later.
            </p>
          </div>
        )}

        {imageUrl && (
          <div className="mb-6">
            <div className="relative">
              <img
                src={imageUrl}
                alt="Generated therapeutic image"
                className="w-full h-auto rounded-lg shadow-lg"
                loading="eager"
              />

              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-3 bg-gray-900 bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
                  title="Download Image"
                >
                  <FaDownload className="text-white" />
                </button>

                {"share" in navigator && (
                  <button
                    onClick={handleShare}
                    className="p-3 bg-gray-900 bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
                    title="Share Image"
                  >
                    <FaShare className="text-white" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-400 text-sm mt-4 text-center">
              This image was created to help you process and navigate your{" "}
              {emotion.toLowerCase()} feelings. Take a moment to breathe and
              reflect on the imagery.
            </p>

            {/* Add feedback buttons */}
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={async () => {
                  try {
                    const mediaAssetId = await db.getLatestMediaAssetId();
                    await db.saveRecommendation(mediaAssetId, {
                      source: "self-gen",
                      feedback: "like",
                    });
                    await db.saveFeedback("current", {
                      feature: "image",
                      feedback_type: "like",
                      details: `User liked the ${emotion} therapeutic image`,
                    });
                    alert("Thank you for your feedback!");
                  } catch (err) {
                    console.error("Error saving feedback:", err);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                😊 Helpful
              </button>

              <button
                onClick={async () => {
                  try {
                    const mediaAssetId = await db.getLatestMediaAssetId();
                    await db.saveRecommendation(mediaAssetId, {
                      source: "self-gen",
                      feedback: "dislike",
                    });
                    await db.saveFeedback("current", {
                      feature: "image",
                      feedback_type: "dislike",
                      details: `User disliked the ${emotion} therapeutic image`,
                    });
                    setImageUrl(""); // Clear current image
                    handleGenerateImage(); // Generate a new one
                  } catch (err) {
                    console.error("Error saving feedback:", err);
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                😔 Not Helpful
              </button>
            </div>
          </div>
        )}

        {generationHistory.length > 1 && (
          <div className="mt-6">
            <h3 className="text-gray-300 text-sm font-semibold mb-2">
              Recent Images
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {generationHistory.slice(1).map((url, i) => (
                <div key={i} className="relative">
                  <img
                    src={url}
                    alt={`Generated image ${i}`}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImageUrl(url)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TherapeuticImageGenerator;
