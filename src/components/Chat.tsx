import React, { useState, useRef, useEffect } from "react";
import {
  FaMicrophone,
  FaPaperPlane,
  FaImage,
  FaVideo,
  FaMusic,
  FaPaintBrush,
  FaRobot,
  FaCog,
  FaSignOutAlt,
  FaHome,
  FaChartLine,
  FaRegSmile,
  FaBrain,
  FaChartBar,
  FaMoon,
  FaPlay,
  FaVolumeUp,
  FaVolumeMute,
  FaSpinner,
  FaYoutube,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "./firebase";
import BreathingExercise from "./BreathingExercise";
import MoodTracker from "./MoodTracker";
import aiService, { ChatMessage, EmotionAnalysis } from "../services/ai";
import { saveMoodEntry } from "../services/moodTracking";
import TherapeuticImageGenerator from "./TherapeuticImageGenerator";
import VideoRecommendations from "./VideoRecommendations";
// Keep import for future use but comment to show it's inactive
import MusicPage from "./MusicPage";
import SimpleVideoPlayer from "./SimpleVideoPlayer";

// Message type definition
interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type: "text" | "image" | "video" | "audio" | "canvas";
  mediaUrl?: string;
  emotionAnalysis?: EmotionAnalysis;
}

// Tool definition
interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I'm Lumeo, your AI companion. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    },
  ]);
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      content:
        "You are Lumeo, an empathetic AI companion focused on supporting the user.",
    },
    {
      role: "assistant",
      content: "Hello! I'm Lumeo, your AI companion. How can I help you today?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const [breathingSettings, setBreathingSettings] = useState({
    inhale: 4,
    hold: 2,
    exhale: 4,
    holdAfterExhale: 0,
    cycles: 5,
  });
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [lastEmotion, setLastEmotion] = useState<EmotionAnalysis | null>(null);
  const [showTherapeuticImage, setShowTherapeuticImage] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [therapeuticImageUrl, setTherapeuticImageUrl] = useState<string | null>(
    null
  );
  const [showVideoRecommendations, setShowVideoRecommendations] =
    useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  // Canvas state - temporarily disabled
  // const [showCanvas, setShowCanvas] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toolParam = searchParams.get("tool");

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial tool selection from URL params
  useEffect(() => {
    if (toolParam) {
      switch (toolParam) {
        case "image":
          setShowImageGenerator(true);
          break;
        case "video":
          // Show video tool when implemented
          alert("Video generation coming soon!");
          break;
        case "music":
          // Show music tool when implemented
          alert("Music generation coming soon!");
          break;
        case "canvas":
          // Show canvas tool when implemented
          alert("Creative canvas coming soon!");
          break;
        case "story":
          // Show story tool when implemented
          alert("Story creator coming soon!");
          break;
      }
    }
  }, [toolParam]);

  // Tools definition
  const tools: Tool[] = [
    {
      id: "text",
      name: "Chat",
      icon: <FaRobot className="text-blue-500" />,
      description: "Chat with Lumeo AI",
      action: () => setActiveTool("text"),
    },
    {
      id: "image",
      name: "Image",
      icon: <FaImage className="text-green-500" />,
      description: "Generate images with AI",
      action: () => {
        setActiveTool("image");
        setShowImageGenerator(true);
      },
    },
    {
      id: "videos",
      name: "Wellness Videos",
      icon: <FaVideo className="text-red-500" />,
      description: "Watch mental health & wellbeing videos",
      action: () => {
        setActiveTool("videos");
        // Show wellness video recommendations without emotion context
        setShowVideoRecommendations(true);
      },
    },
    {
      id: "music",
      name: "Music",
      icon: <FaMusic className="text-purple-500" />,
      description: "Listen to relaxing music for mindfulness",
      action: () => {
        setActiveTool("music");
        setShowMusicPlayer(true);
      },
    },
    {
      id: "canvas",
      name: "Canvas",
      icon: <FaPaintBrush className="text-yellow-500" />,
      description: "Draw with AI assistance",
      action: () => {
        setActiveTool("canvas");
        showDrawingCanvas();
      },
    },
    {
      id: "mood",
      name: "Mood",
      icon: <FaRegSmile className="text-pink-500" />,
      description: "Track your mood",
      action: () => {
        setActiveTool("mood");
        setShowMoodTracker(true);
      },
    },
    {
      id: "breathing",
      name: "Breathing",
      icon: <FaBrain className="text-teal-500" />,
      description: "Guided breathing exercise",
      action: () => {
        setActiveTool("breathing");
        startBreathingExercise();
      },
    },
  ];

  // Function to show the drawing canvas
  const showDrawingCanvas = () => {
    // Instead of showing the actual canvas, display a coming soon message
    alert(
      "Drawing Canvas coming soon! This feature is currently under development."
    );
    // Not setting showCanvas to true so the actual canvas component won't be rendered
  };

  // Start a breathing exercise
  const startBreathingExercise = (intensity?: number) => {
    if (intensity) {
      const settings = aiService.getBreathingExercise(intensity);
      setBreathingSettings(settings);
    }
    setShowBreathingExercise(true);
  };

  // Handle end of breathing exercise
  const handleBreathingComplete = () => {
    setShowBreathingExercise(false);

    // Add a message about the completed exercise
    const breathingMessage: Message = {
      id: Date.now().toString(),
      text: "Breathing exercise completed. How are you feeling now?",
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, breathingMessage]);
    setApiMessages((prev) => [
      ...prev,
      { role: "assistant", content: breathingMessage.text },
    ]);
  };

  // Handle saving mood entry
  const handleSaveMood = async (moodData: any) => {
    try {
      await saveMoodEntry(moodData);

      // Add a message about the mood entry
      const mood =
        moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1);

      const moodMessage: Message = {
        id: Date.now().toString(),
        text: `You logged your mood as: ${mood} (${moodData.intensity}/10)\n\nThank you for sharing. I'll keep track of your mood patterns to better support you.`,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, moodMessage]);
      setApiMessages((prev) => [
        ...prev,
        { role: "assistant", content: moodMessage.text },
      ]);
    } catch (error) {
      console.error("Error saving mood:", error);

      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I had trouble saving your mood. Please try again later.",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Generate a therapeutic image based on emotion
  const generateTherapeuticImage = async (emotion: string) => {
    try {
      setIsTyping(true);
      // Pass the default size "1024x1024" and undefined for imageStyle to use default style
      const imageUrl = await aiService.generateTherapeuticImage(
        emotion,
        "1024x1024"
      );
      setTherapeuticImageUrl(imageUrl);
      setShowTherapeuticImage(true);
      setIsTyping(false);

      // Add the image to the conversation
      const imageMessage: Message = {
        id: Date.now().toString(),
        text: "I created this image to help with how you're feeling right now.",
        sender: "ai",
        timestamp: new Date(),
        type: "image",
        mediaUrl: imageUrl,
      };

      setMessages((prev) => [...prev, imageMessage]);
    } catch (error) {
      console.error("Error generating therapeutic image:", error);
      setIsTyping(false);
    }
  };

  // Add these new states for voice functionality
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(false);
  const recognition = useRef<any>(null);

  // Add this function for voice recognition
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert(
        "Speech recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    if (recognition.current) {
      recognition.current.stop();
    }

    recognition.current = new (window as any).webkitSpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = "en-US";

    recognition.current.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.current.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      setInputText(currentTranscript);
    };

    recognition.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.current.onend = () => {
      setIsListening(false);
    };

    recognition.current.start();
  };

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  // Add a function to read AI responses aloud
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.error("Text-to-speech is not supported in this browser");
      return;
    }

    // Stop any current speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }

    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure the utterance
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Get available voices and select a female voice if available
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (voice) =>
        voice.name.includes("Female") ||
        voice.name.includes("Google") ||
        voice.name.includes("Samantha")
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Set listeners
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error", event);
      setIsSpeaking(false);
    };

    // Speak the text
    window.speechSynthesis.speak(utterance);
  };

  // Toggle voice feedback
  const toggleVoiceFeedback = () => {
    setVoiceFeedback(!voiceFeedback);

    // Announce the change
    if (!voiceFeedback) {
      speakText("Voice feedback is now enabled");
    }
  };

  // Update the handleVoiceInput function
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Modify the sendMessage function to clear transcript after sending
  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    // Stop listening if active
    if (isListening) {
      stopListening();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setTranscript("");
    setIsTyping(true);

    // Convert to API message format
    const userApiMessage: ChatMessage = {
      role: "user",
      content: inputText,
    };

    // Update API messages array
    const updatedApiMessages = [...apiMessages, userApiMessage];
    setApiMessages(updatedApiMessages);

    try {
      // First, analyze the emotion in the message
      const emotionAnalysis = await aiService.analyzeEmotion(inputText);

      // Store the emotion with the user message
      userMessage.emotionAnalysis = emotionAnalysis;
      setLastEmotion(emotionAnalysis);

      // Generate AI response with emotion context
      const aiResponse = await aiService.generateChatCompletion(
        updatedApiMessages,
        emotionAnalysis
      );

      // Create AI message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      // Update messages and API messages
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // Find and update the user message with emotion
        const userMsgIndex = updatedMessages.findIndex(
          (msg) => msg.id === userMessage.id
        );
        if (userMsgIndex !== -1) {
          updatedMessages[userMsgIndex] = { ...userMessage };
        }
        return [...updatedMessages, aiMessage];
      });

      setApiMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);

      // If voice feedback is enabled, read the AI response aloud
      if (voiceFeedback) {
        speakText(aiResponse);
      }

      // Handle special cases based on emotion
      if (
        emotionAnalysis.primaryEmotion === "anxiety" &&
        emotionAnalysis.intensity > 0.6
      ) {
        // Suggest breathing exercise for high anxiety
        setTimeout(() => {
          const promptMessage: Message = {
            id: Date.now().toString() + 2,
            text: "I notice you seem anxious. Would you like to try a quick breathing exercise?",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };

          setMessages((prev) => [...prev, promptMessage]);
          setApiMessages((prev) => [
            ...prev,
            { role: "assistant", content: promptMessage.text },
          ]);

          // Read this prompt too if voice feedback is enabled
          if (voiceFeedback) {
            setTimeout(() => {
              speakText(promptMessage.text);
            }, 500);
          }

          // After a short delay, offer the breathing exercise
          setTimeout(() => {
            startBreathingExercise(emotionAnalysis.intensity);
          }, 4000);
        }, 2000);
      } else if (
        (emotionAnalysis.primaryEmotion === "sadness" ||
          emotionAnalysis.primaryEmotion === "fear") &&
        emotionAnalysis.intensity > 0.5
      ) {
        // Generate a therapeutic image for sadness or fear
        setTimeout(() => {
          generateTherapeuticImage(emotionAnalysis.primaryEmotion);
        }, 3000);
      } else if (
        (emotionAnalysis.primaryEmotion === "stress" ||
          emotionAnalysis.primaryEmotion === "overwhelmed" ||
          emotionAnalysis.primaryEmotion === "depression") &&
        emotionAnalysis.intensity > 0.4
      ) {
        // Suggest calming videos for stress, being overwhelmed, or depression
        setTimeout(() => {
          const videoPromptMessage: Message = {
            id: Date.now().toString() + 3,
            text: `I think watching a short wellness video might help with your ${emotionAnalysis.primaryEmotion}. Would you like to see some recommendations?`,
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };

          setMessages((prev) => [...prev, videoPromptMessage]);

          // After a short delay, open the video recommendations
          setTimeout(() => {
            setShowVideoRecommendations(true);
          }, 3000);
        }, 2000);
      }
    } catch (error) {
      console.error("Error in AI processing:", error);

      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble processing right now. Can you try again in a moment?",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);
      setApiMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage.text },
      ]);
    }

    setIsTyping(false);
  };

  // Handle logout
  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate("/");
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-gray-800 p-4 flex flex-col">
        <div className="flex items-center justify-center md:justify-start mb-8">
          <FaRobot className="text-blue-400 text-xl md:mr-2" />
          <span className="hidden md:block font-bold text-xl">Lumeo AI</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <p className="text-gray-400 text-xs hidden md:block">TOOLS</p>
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={tool.action}
                className={`flex items-center w-full p-2 rounded-lg transition-colors ${
                  activeTool === tool.id ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
              >
                <div className="text-xl">{tool.icon}</div>
                <span className="ml-3 hidden md:block">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FaHome className="text-gray-400 text-xl" />
            <span className="ml-3 text-gray-400 hidden md:block">Home</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <FaSignOutAlt className="text-gray-400 text-xl" />
            <span className="ml-3 text-gray-400 hidden md:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">
              {activeTool
                ? tools.find((t) => t.id === activeTool)?.name || "Chat"
                : "Chat"}
            </h1>
            {lastEmotion && (
              <div className="ml-4 px-3 py-1 bg-gray-700 rounded-full text-xs">
                Mood:{" "}
                {lastEmotion.primaryEmotion.charAt(0).toUpperCase() +
                  lastEmotion.primaryEmotion.slice(1)}
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              className={`p-2 rounded-full ${
                voiceFeedback ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
              onClick={toggleVoiceFeedback}
              title={
                voiceFeedback
                  ? "Disable voice feedback"
                  : "Enable voice feedback"
              }
            >
              {voiceFeedback ? <FaVolumeUp /> : <FaVolumeMute />}
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
              onClick={() => navigate("/movies")}
            >
              Explore Movies & Videos
            </button>
            <button
              className="flex items-center p-2 rounded-full hover:bg-gray-700"
              onClick={() => setShowMoodTracker(true)}
            >
              <FaChartLine className="mr-2" />
              <span className="text-sm hidden md:inline">Track Mood</span>
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-white"
                  }`}
                >
                  {message.type === "text" && <p>{message.text}</p>}
                  {message.type === "image" && message.mediaUrl && (
                    <div className="space-y-2">
                      <p>{message.text}</p>
                      <img
                        src={message.mediaUrl}
                        alt="AI generated"
                        className="rounded-lg max-w-full h-auto"
                      />
                    </div>
                  )}
                  {message.type === "video" && message.mediaUrl && (
                    <video
                      src={message.mediaUrl}
                      controls
                      className="rounded-lg max-w-full h-auto"
                    />
                  )}
                  {message.type === "audio" && message.mediaUrl && (
                    <audio src={message.mediaUrl} controls className="w-full" />
                  )}
                  {message.type === "canvas" && message.mediaUrl && (
                    <img
                      src={message.mediaUrl}
                      alt="Canvas drawing"
                      className="rounded-lg max-w-full h-auto"
                    />
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Display emotion alongside user messages */}
                {message.sender === "user" && message.emotionAnalysis && (
                  <div className="flex flex-col justify-center ml-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          message.emotionAnalysis.primaryEmotion === "joy"
                            ? "#10B981"
                            : message.emotionAnalysis.primaryEmotion ===
                              "sadness"
                            ? "#3B82F6"
                            : message.emotionAnalysis.primaryEmotion === "anger"
                            ? "#EF4444"
                            : message.emotionAnalysis.primaryEmotion === "fear"
                            ? "#8B5CF6"
                            : message.emotionAnalysis.primaryEmotion ===
                              "anxiety"
                            ? "#F59E0B"
                            : "#6B7280",
                      }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "250ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "500ms" }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Voice transcript display */}
        {isListening && transcript && (
          <div className="bg-gray-800 p-3 border-t border-gray-700">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <p className="text-gray-300 italic">{transcript}</p>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center">
            <button
              className={`p-2 rounded-full mr-2 ${
                showToolbar ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
              onClick={() => setShowToolbar(!showToolbar)}
            >
              <FaCog />
            </button>

            <AnimatePresence>
              {showToolbar && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex space-x-2 mr-2 overflow-hidden"
                >
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={tool.action}
                      className="p-2 rounded-full hover:bg-gray-700"
                      title={tool.description}
                    >
                      {tool.icon}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 text-white rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              className={`p-2 rounded-full ml-2 ${
                isListening ? "bg-red-500" : "hover:bg-gray-700"
              }`}
              onClick={handleVoiceInput}
            >
              {isListening ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaMicrophone />
              )}
            </button>

            <button
              className="p-2 rounded-full ml-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={sendMessage}
              disabled={inputText.trim() === ""}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>

      {/* Tools and Modal Components */}
      <AnimatePresence>
        {showBreathingExercise && (
          <BreathingExercise
            settings={breathingSettings}
            onClose={() => setShowBreathingExercise(false)}
            onComplete={handleBreathingComplete}
          />
        )}

        {showMoodTracker && (
          <MoodTracker
            onClose={() => setShowMoodTracker(false)}
            onSave={handleSaveMood}
          />
        )}

        {showTherapeuticImage && therapeuticImageUrl && (
          <TherapeuticImageGenerator
            emotion={lastEmotion?.primaryEmotion || "neutral"}
            onClose={() => setShowTherapeuticImage(false)}
          />
        )}

        {showImageGenerator && (
          <TherapeuticImageGenerator
            emotion={lastEmotion?.primaryEmotion || "neutral"}
            onClose={() => setShowImageGenerator(false)}
          />
        )}

        {showVideoRecommendations && (
          <SimpleVideoPlayer
            onClose={() => setShowVideoRecommendations(false)}
          />
        )}

        {showMusicPlayer && (
          <MusicPage onClose={() => setShowMusicPlayer(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
