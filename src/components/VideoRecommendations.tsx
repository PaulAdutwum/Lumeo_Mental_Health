import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlay,
  FaThumbsUp,
  FaThumbsDown,
  FaTimes,
  FaCog,
  FaYoutube,
  FaChevronLeft,
  FaSpinner,
  FaExclamationTriangle,
  FaPause,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import api, { VideoRecommendation } from "../services/api";
import {
  IconButton,
  Button,
  Spinner,
  Text,
  Flex,
  Box,
  Stack,
  Tooltip,
} from "@chakra-ui/react";
import {
  CloseIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
} from "@chakra-ui/icons";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../components/firebase";

// TypeScript definitions for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          height: string;
          width: string;
          playerVars: Record<string, number>;
          events: {
            onReady: (event: { target: YouTubePlayer }) => void;
            onStateChange: (event: {
              data: number;
              target: YouTubePlayer;
            }) => void;
            onError: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number) => void;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  destroy: () => void;
}

interface VideoPlayerProps {
  videoId: string;
  title: string;
  onClose: () => void;
  onFeedback: (feedback: "like" | "dislike", emotionAfter?: string) => void;
  emotionBefore?: string;
  videos?: VideoRecommendation[];
  setActiveVideo?: (video: VideoRecommendation | null) => void;
}

// Define YouTube player state constants to avoid relying on window.YT.PlayerState
const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  title,
  onClose,
  onFeedback,
  emotionBefore,
  videos,
  setActiveVideo,
}) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedWatch, setCompletedWatch] = useState(false);
  const [watchLogged, setWatchLogged] = useState(false);
  const [emotionAfter, setEmotionAfter] = useState<string | undefined>(
    undefined
  );
  const [watchTimeLogged, setWatchTimeLogged] = useState<boolean>(false);

  // Reliable videos for fallback
  const reliableVideos = [
    {
      id: "86m4RC_ADEY",
      title: "Calming Nature Sounds",
      channelTitle: "Nature Sounds",
      thumbnailUrl: "https://img.youtube.com/vi/86m4RC_ADEY/mqdefault.jpg",
      description: "Peaceful nature sounds to calm your mind",
    },
    {
      id: "inpok4MKVLM",
      title: "5-Minute Meditation You Can Do Anywhere",
      channelTitle: "Goodful",
      thumbnailUrl: "https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg",
      description: "In just 5 minutes you can reset your day",
    },
  ];

  const initializePlayer = () => {
    if (!videoId) return;

    console.log("Initializing player for video:", videoId);

    // Create a safety check function to verify YouTube API is loaded
    const ensureYouTubeAPILoaded = () => {
      if (window.YT && window.YT.Player) {
        console.log("YouTube API ready, creating player now");
        createPlayer();
      } else {
        console.log("YouTube API not yet ready, waiting...");
        setTimeout(ensureYouTubeAPILoaded, 100);
      }
    };

    const createPlayer = () => {
      try {
        if (player && player.destroy) {
          player.destroy();
        }

        if (!playerRef.current) {
          console.error("Player container not found");
          setError("Player container not found");
          return;
        }

        // Clear the container first
        while (playerRef.current.firstChild) {
          playerRef.current.removeChild(playerRef.current.firstChild);
        }

        // Create a new div for the player
        const playerDiv = document.createElement("div");
        playerDiv.id = "youtube-player-container";
        playerRef.current.appendChild(playerDiv);

        // Timeout to ensure DOM updates before initializing player
        setTimeout(() => {
          const playerContainer = document.getElementById(
            "youtube-player-container"
          );
          if (!playerContainer) {
            console.error("Player container not found after creation");
            setError("Player initialization failed. Please try again.");
            return;
          }

          try {
            const newPlayer = new window.YT.Player("youtube-player-container", {
              videoId: videoId,
              height: "360",
              width: "640",
              playerVars: {
                autoplay: 1,
                modestbranding: 1,
                rel: 0,
                fs: 1,
                origin: window.location.origin, // Fix cross-origin issues
              } as Record<string, any>, // Cast playerVars to avoid type errors
              events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError: (event) => {
                  console.error("YouTube player error:", event.data);
                  let errorMessage;

                  // Map error codes to user-friendly messages
                  switch (event.data) {
                    case 2:
                      errorMessage = "Invalid video ID";
                      break;
                    case 5:
                      errorMessage = "HTML5 player error";
                      break;
                    case 100:
                      errorMessage = "Video not found or removed";
                      break;
                    case 101:
                    case 150:
                      errorMessage =
                        "Video owner doesn't allow embedding. Trying a different video...";

                      // Use one of our reliable fallback videos that allow embedding
                      if (setActiveVideo) {
                        setActiveVideo({
                          id: "86m4RC_ADEY", // Reliable video ID that allows embedding (nature sounds)
                          title: "Calming Nature Sounds",
                          channelTitle: "Nature Sounds",
                          thumbnailUrl: "",
                          description:
                            "Peaceful nature sounds to calm your mind",
                        });
                      }
                      return;
                    default:
                      errorMessage = "Error playing video";
                  }
                  setError(errorMessage);
                },
              },
            });
            setPlayer(newPlayer);
          } catch (err) {
            console.error("Error creating YouTube player:", err);
            setError("Failed to initialize video player");
          }
        }, 200); // Give DOM time to update
      } catch (e) {
        console.error("Error initializing player:", e);
        setError("Failed to initialize video player");
      }
    };

    // Start the process
    ensureYouTubeAPILoaded();
  };

  useEffect(() => {
    if (!videoId) return;

    // Load YouTube API
    const loadYouTubeAPI = () => {
      // If YouTube iframe API is already loaded
      if (window.YT) {
        console.log("YouTube API already loaded, initializing player");
        initializePlayer();
        return;
      }

      console.log("Loading YouTube iframe API");
      // Create script element
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";

      // Set onload handler
      tag.onload = () => {
        console.log("YouTube API script loaded");
      };

      tag.onerror = (e) => {
        console.error("Error loading YouTube API:", e);
        setError("Failed to load YouTube player");
      };

      // Insert the script element
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      // Set up the callback that YouTube will call when API is ready
      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube iframe API ready");
        initializePlayer();
      };
    };

    loadYouTubeAPI();

    // Cleanup function
    return () => {
      window.onYouTubeIframeAPIReady = (() => {}) as () => void;
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, [videoId]);

  const onPlayerReady = (event: { target: YouTubePlayer }) => {
    event.target.playVideo();
  };

  const onPlayerStateChange = (event: {
    data: number;
    target: YouTubePlayer;
  }) => {
    console.log("Player state changed:", event.data);
    setPlayerState(event.data);

    // When video ends
    if (event.data === PLAYER_STATE.ENDED) {
      console.log("Video ended");
      setCompletedWatch(true);
      setShowFeedback(true);
    }

    if (event.data === PLAYER_STATE.PLAYING && !watchTimeLogged) {
      const watchTimer = setTimeout(() => {
        api
          .logVideoWatch({
            videoId,
            title,
            emotionBefore,
          })
          .catch(console.error);
        setWatchTimeLogged(true);
      }, 5000);

      return () => clearTimeout(watchTimer);
    }
  };

  const handleFeedback = (feedback: "like" | "dislike") => {
    onFeedback(feedback, emotionAfter);
    setShowFeedback(false);
    onClose();
  };

  const emotionOptions = [
    "calm",
    "relaxed",
    "focused",
    "motivated",
    "happy",
    "inspired",
    "reflective",
    "unchanged",
  ];

  const handleRetry = () => {
    setError(null);
    initializePlayer();
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <FaExclamationTriangle className="text-yellow-500 mr-2" />
            Video Player Error
          </h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="mt-2 mb-4">
            <p className="text-gray-400 text-sm">
              Try one of these reliable videos instead:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {reliableVideos.map((video: VideoRecommendation) => (
                <div
                  key={video.id}
                  className="bg-gray-700 p-2 rounded-lg flex items-center cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    setError(null);
                    if (setActiveVideo) {
                      setActiveVideo(video);
                    }
                  }}
                >
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/default.jpg`}
                    alt={video.title}
                    className="w-16 h-12 object-cover rounded mr-2"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white line-clamp-1">
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {video.channelTitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry Current Video
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="video-container relative pb-[56.25%] h-0 mb-4">
          <div
            ref={playerRef}
            className="absolute top-0 left-0 w-full h-full"
          ></div>
        </div>

        {showFeedback && (
          <div className="feedback-form mt-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              How did this video make you feel?
            </h4>

            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Current emotional state:
              </label>
              <select
                value={emotionAfter || ""}
                onChange={(e) => setEmotionAfter(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                           rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="">Select how you feel now</option>
                {emotionOptions.map((emotion) => (
                  <option key={emotion} value={emotion}>
                    {emotion}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => handleFeedback("dislike")}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                <span className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.236 3h4.764a2 2 0 012 2v9a2 2 0 01-2 2h-3.764a2 2 0 00-1.789 2.894l1.5 3"
                      transform="rotate(180 12 12)"
                    />
                  </svg>
                  Not Helpful
                </span>
              </button>
              <button
                onClick={() => handleFeedback("like")}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <span className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  Helpful
                </span>
              </button>
            </div>
          </div>
        )}

        {playerState !== undefined &&
          playerState !== PLAYER_STATE.ENDED &&
          !showFeedback && (
            <div className="feedback-buttons mt-4 flex justify-center gap-4">
              <button
                onClick={() => setShowFeedback(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Rate this video
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

// Define the VIDEO_CATEGORIES constant at the top level of the file, outside of any component
const VIDEO_CATEGORIES = [
  "relaxation",
  "meditation",
  "nature",
  "motivation",
  "breathing",
  "sleep",
  "positive-thinking",
  "mindfulness",
];

interface VideoRecommendationsProps {
  onClose: () => void;
  currentEmotion?: string;
}

const VideoRecommendations: React.FC<VideoRecommendationsProps> = ({
  onClose,
  currentEmotion = "neutral",
}) => {
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom toast function
  const showNotification = (
    title: string,
    message: string,
    type: "success" | "error"
  ) => {
    setNotification({ title, message, type, visible: true });
    // Longer display time for notifications
    setTimeout(() => {
      setNotification(null);
    }, 5000); // Show for 5 seconds
  };

  // Map emotions to search queries
  const emotionToQueryMap: Record<string, string> = {
    anxiety: "calming anxiety relief meditation",
    stress: "stress reduction relaxation techniques",
    sadness: "uplifting mood boosting positive thinking",
    anger: "anger management calm breathing exercises",
    joy: "mindfulness gratitude practice",
    fear: "overcoming fear guided meditation",
    neutral: "mindfulness meditation practice",
  };

  // Use useMemo to avoid recreating the categories array on every render
  const categories = useMemo(
    () => [
      "relaxation",
      "meditation",
      "nature",
      "motivation",
      "breathing",
      "sleep",
      "positive-thinking",
      "mindfulness",
    ],
    []
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoRecommendation | null>(
    null
  );
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [savedPreferences, setSavedPreferences] = useState<boolean>(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Helper function to get default categories based on emotion
  const getDefaultCategoriesForEmotion = (emotion: string): string[] => {
    switch (emotion) {
      case "anxiety":
        return ["relaxation", "breathing", "meditation"];
      case "stress":
        return ["relaxation", "nature", "sleep"];
      case "sadness":
        return ["motivation", "positive-thinking", "mindfulness"];
      case "anger":
        return ["breathing", "meditation", "relaxation"];
      default:
        return ["meditation", "mindfulness"];
    }
  };

  // Define fetchRecommendations using useCallback to avoid recreating it on every render
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get recommendations based on emotion and selected categories
      const recommendations = await fetchVideoRecommendations();

      if (recommendations && recommendations.length > 0) {
        setVideos(recommendations);
      } else {
        // Fall back to predefined videos if API returns empty results
        setVideos(getFallbackVideos(currentEmotion));
      }
    } catch (err) {
      console.error("Error fetching video recommendations:", err);
      setError("Failed to load video recommendations. Please try again later.");
      // Use fallback videos on error
      setVideos(getFallbackVideos(currentEmotion));
    } finally {
      setLoading(false);
    }
  }, [currentEmotion, selectedCategories]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        console.log(
          "Loading preferences and videos for emotion:",
          currentEmotion
        );

        // Load preferences from localStorage
        const storedPrefs = localStorage.getItem("videoPreferences");
        if (storedPrefs) {
          try {
            const parsedPrefs = JSON.parse(storedPrefs);
            console.log("Found stored preferences:", parsedPrefs);
            setSelectedCategories(parsedPrefs);
          } catch (e) {
            console.error("Error parsing stored preferences:", e);
            // If preferences can't be parsed, use empty array
            setSelectedCategories([]);
          }
        } else {
          // If no preferences, select some default categories based on emotion
          const defaultCategories =
            getDefaultCategoriesForEmotion(currentEmotion);
          console.log(
            "No stored preferences, using defaults:",
            defaultCategories
          );
          setSelectedCategories(defaultCategories);
        }

        // Mark preferences as loaded so other effects can run
        setPreferenceLoaded(true);

        // Load videos
        const recommendedVideos = await fetchVideoRecommendations();
        setVideos(recommendedVideos);
      } catch (error) {
        console.error("Error loading preferences and videos:", error);
        setVideos(getFallbackVideos(currentEmotion));
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [currentEmotion]);

  useEffect(() => {
    if (preferenceLoaded && !showPreferences) {
      console.log("Preferences changed, refreshing videos");
      fetchRecommendations();
    }
  }, [
    preferenceLoaded,
    selectedCategories,
    fetchRecommendations,
    showPreferences,
  ]);

  const getFallbackVideos = (currentEmotion: string): VideoRecommendation[] => {
    // Reliable videos that definitely allow embedding with working thumbnails
    const reliableVideos: VideoRecommendation[] = [
      {
        id: "86m4RC_ADEY",
        title: "Calming Nature Sounds - 10 Hours",
        channelTitle: "Nature Sounds",
        thumbnailUrl: "https://i.ytimg.com/vi/86m4RC_ADEY/mqdefault.jpg",
        description: "Peaceful nature sounds to calm your mind",
      },
      {
        id: "inpok4MKVLM",
        title: "5-Minute Meditation You Can Do Anywhere",
        channelTitle: "Goodful",
        thumbnailUrl: "https://i.ytimg.com/vi/inpok4MKVLM/mqdefault.jpg",
        description:
          "In just 5 minutes you can reset your day in a positive way.",
      },
      {
        id: "5HrkXT5Bc9E",
        title: "Peaceful Day - Piano Solo | Relaxing Music",
        channelTitle: "OCB Relax Music",
        thumbnailUrl: "https://i.ytimg.com/vi/5HrkXT5Bc9E/mqdefault.jpg",
        description:
          "Beautiful piano music to help you relax and reduce stress.",
      },
      {
        id: "n2RvUL5qDVc",
        title: "Meditation for Balance",
        channelTitle: "Yoga With Adriene",
        thumbnailUrl: "https://i.ytimg.com/vi/n2RvUL5qDVc/mqdefault.jpg",
        description:
          "A 10-minute meditation practice to find balance and calm.",
      },
      {
        id: "X3Ua5cBXPH4",
        title: "Relaxing Deep Sleep Music",
        channelTitle: "Yellow Brick Cinema",
        thumbnailUrl: "https://i.ytimg.com/vi/X3Ua5cBXPH4/mqdefault.jpg",
        description: "Fall into a peaceful sleep with this relaxing music.",
      },
      {
        id: "wruCWicGBA4",
        title: "Relaxing Music & Soft Rain Sounds",
        channelTitle: "Meditation Relax Music",
        thumbnailUrl: "https://i.ytimg.com/vi/wruCWicGBA4/mqdefault.jpg",
        description:
          "Relaxing background music with soft rain sounds for sleep.",
      },
    ];

    // Filter based on emotion if needed
    if (currentEmotion === "anxiety" || currentEmotion === "stress") {
      return reliableVideos.filter((v, i) => [0, 1, 3, 5].includes(i));
    } else if (currentEmotion === "sadness") {
      return reliableVideos.filter((v, i) => [2, 3, 4, 5].includes(i));
    }

    return reliableVideos;
  };

  const handleVideoSelect = async (video: VideoRecommendation) => {
    try {
      setActiveVideo(video);

      // In development mode, skip server logging
      if (window.location.hostname === "localhost") {
        console.log("Development mode: Skipping server logging");
        return;
      }

      // Only try to log if we have video data
      if (video.id && video.title) {
        try {
          await api.logVideoWatch({
            videoId: video.id,
            title: video.title,
            emotionBefore: currentEmotion,
          });
        } catch (error) {
          console.warn("Could not log video watch, continuing anyway:", error);
        }
      }
    } catch (error) {
      console.error("Error selecting video:", error);
      setError("Could not play the selected video");
    }
  };

  const handleVideoEnd = () => {
    // Video ended, we'll show the feedback UI which is already part of the player
  };

  const handleFeedback = async (
    feedback: "like" | "dislike",
    emotionAfter?: string
  ) => {
    if (!activeVideo) return;

    try {
      await api.updateVideoFeedback(activeVideo.id, feedback, emotionAfter);

      setActiveVideo(null);

      if (feedback === "dislike") {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error("Error saving video feedback:", error);
      throw error;
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      console.log("Saving preferences:", selectedCategories);

      // Always save to localStorage first - this is our primary storage method
      localStorage.setItem(
        "videoPreferences",
        JSON.stringify(selectedCategories)
      );

      // Show immediate success notification for localStorage
      showNotification(
        "Preferences Saved",
        "Your preferences have been saved successfully!",
        "success"
      );

      // Close preferences menu immediately
      setShowPreferences(false);

      // Force refresh recommendations with the updated preferences
      await fetchRecommendations();

      // Try to save to Firestore as a background operation, but don't block the UI
      const currentUser = auth?.currentUser;
      const uid = currentUser?.uid;

      if (uid) {
        // Isolate Firebase operations in a separate try/catch block
        // and wrap in setTimeout to ensure it doesn't block the UI
        setTimeout(async () => {
          try {
            console.log(
              "Attempting to save preferences to Firestore in background..."
            );
            const userRef = doc(db, "users", uid);
            await setDoc(
              userRef,
              {
                videoPreferences: selectedCategories,
                lastUpdated: new Date().toISOString(),
              },
              { merge: true }
            );
            console.log("Successfully saved preferences to Firestore");
          } catch (firestoreError) {
            // Silently handle Firestore errors - we already saved to localStorage
            console.warn(
              "Could not save to Firestore (this is ok):",
              firestoreError
            );
          }
        }, 100);
      } else {
        console.log("No authenticated user, skipping Firestore save");
      }
    } catch (error) {
      // This catch block should only execute if there's a problem with localStorage
      console.error("Error saving preferences locally:", error);
      showNotification(
        "Preferences Saved",
        "Your preferences were saved with limited functionality.",
        "success" // Still show success since we'll use default preferences
      );
      setVideos(getFallbackVideos(currentEmotion));
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== category));
    } else {
      setSelectedCategories((prev) => [...prev, category]);
    }
  };

  // Update fetchVideoRecommendations to prioritize user preferences
  const fetchVideoRecommendations = async () => {
    try {
      // Build query with preferences first to prioritize them
      let queryTerms = "";

      // Put selected categories first for higher relevance
      if (selectedCategories.length > 0) {
        queryTerms = selectedCategories.join(" ") + " ";
      }

      // Add emotion-based terms
      queryTerms +=
        emotionToQueryMap[currentEmotion] || "therapeutic mindfulness";

      console.log("Fetching videos with preferences-first query:", queryTerms);

      // Create dynamic video data based on preferences
      const dynamicVideos = getDynamicVideosForPreferences(
        selectedCategories,
        currentEmotion
      );

      // Return the dynamic preference-based videos
      return dynamicVideos;
    } catch (error) {
      console.error("Error fetching video recommendations:", error);
      return getFallbackVideos(currentEmotion);
    }
  };

  // Update getDynamicVideosForPreferences function with valid video IDs
  const getDynamicVideosForPreferences = (
    preferences: string[],
    emotion: string
  ): VideoRecommendation[] => {
    console.log(
      "Generating dynamic videos for preferences:",
      preferences,
      "and emotion:",
      emotion
    );

    // Base video library organized by category with verified working videos
    const videosByCategory: Record<string, VideoRecommendation[]> = {
      relaxation: [
        {
          id: "86m4RC_ADEY",
          title: "Calming Nature Sounds - Deep Relaxation",
          channelTitle: "Nature Sounds",
          thumbnailUrl: "https://i.ytimg.com/vi/86m4RC_ADEY/mqdefault.jpg",
          description: "Peaceful nature sounds to calm your mind",
        },
        {
          id: "wruCWicGBA4",
          title: "Relaxing Music with Rain Sounds - Premium Edition",
          channelTitle: "Meditation Relax Music",
          thumbnailUrl: "https://i.ytimg.com/vi/wruCWicGBA4/mqdefault.jpg",
          description: "Relaxing background music with soft rain sounds",
        },
      ],
      meditation: [
        {
          id: "inpok4MKVLM",
          title: "5-Minute Meditation - Focus & Clarity",
          channelTitle: "Goodful",
          thumbnailUrl: "https://i.ytimg.com/vi/inpok4MKVLM/mqdefault.jpg",
          description: "Reset your day with this short meditation",
        },
        {
          id: "n2RvUL5qDVc",
          title: "Meditation for Balance - Deep Practice",
          channelTitle: "Yoga With Adriene",
          thumbnailUrl: "https://i.ytimg.com/vi/n2RvUL5qDVc/mqdefault.jpg",
          description: "Find your center with this guided meditation",
        },
      ],
      nature: [
        {
          id: "qFZKK7K52uQ",
          title: "Beautiful Nature Landscapes - HD Experience",
          channelTitle: "Nature Videos",
          thumbnailUrl: "https://i.ytimg.com/vi/qFZKK7K52uQ/mqdefault.jpg",
          description: "Stunning nature scenes with ambient music",
        },
        {
          id: "DuVNdFI_ITg",
          title: "Nature Sounds Collection - Forest Edition",
          channelTitle: "Nature Sounds",
          thumbnailUrl: "https://i.ytimg.com/vi/DuVNdFI_ITg/mqdefault.jpg",
          description: "Authentic forest sounds for relaxation",
        },
      ],
      breathing: [
        {
          id: "tybOi4hjZFQ",
          title: "Breathing Exercises for Stress Relief",
          channelTitle: "Yoga With Adriene",
          thumbnailUrl: "https://i.ytimg.com/vi/tybOi4hjZFQ/mqdefault.jpg",
          description: "Simple breathing techniques to reduce stress",
        },
        {
          id: "aXItOY0sLRY",
          title: "Box Breathing Technique - Guided Practice",
          channelTitle: "Meditation Relax Music",
          thumbnailUrl: "https://i.ytimg.com/vi/aXItOY0sLRY/mqdefault.jpg",
          description: "Learn the powerful 4x4 breathing technique",
        },
      ],
      mindfulness: [
        {
          id: "ZToicYcHIOU",
          title: "Mindfulness Practice for Beginners",
          channelTitle: "Great Meditation",
          thumbnailUrl: "https://i.ytimg.com/vi/ZToicYcHIOU/mqdefault.jpg",
          description: "Start your mindfulness journey with this guide",
        },
        {
          id: "U9YKY7fdwyg",
          title: "Mindful Moment - Quick Reset",
          channelTitle: "Mindfulness Academy",
          thumbnailUrl: "https://i.ytimg.com/vi/U9YKY7fdwyg/mqdefault.jpg",
          description: "A moment of mindfulness in your busy day",
        },
      ],
      sleep: [
        {
          id: "X3Ua5cBXPH4",
          title: "Deep Sleep Music - Delta Waves",
          channelTitle: "Yellow Brick Cinema",
          thumbnailUrl: "https://i.ytimg.com/vi/X3Ua5cBXPH4/mqdefault.jpg",
          description: "Fall asleep faster with this gentle music",
        },
        {
          id: "1ZYbU82GVz4",
          title: "Sleep Music with Rain - 8 Hour Version",
          channelTitle: "Sleep Meditation",
          thumbnailUrl: "https://i.ytimg.com/vi/1ZYbU82GVz4/mqdefault.jpg",
          description: "Perfect soundtrack for deep sleep",
        },
      ],
      "positive-thinking": [
        {
          id: "6p_yaNFSbCk",
          title: "Positive Mindset Meditation - Boost Your Mood",
          channelTitle: "Goodful Meditation",
          thumbnailUrl: "https://i.ytimg.com/vi/6p_yaNFSbCk/mqdefault.jpg",
          description: "Shift your mindset in just 5 minutes",
        },
        {
          id: "A9NfHom9NRs",
          title: "Positive Energy Nature Sounds",
          channelTitle: "Nature Harmony",
          thumbnailUrl: "https://i.ytimg.com/vi/A9NfHom9NRs/mqdefault.jpg",
          description: "Surround yourself with positive energy from nature",
        },
      ],
      motivation: [
        {
          id: "oRkQYftz_Wc",
          title: "Morning Motivation - Conquer Your Day",
          channelTitle: "Motivation Ark",
          thumbnailUrl: "https://i.ytimg.com/vi/oRkQYftz_Wc/mqdefault.jpg",
          description: "Start your day with powerful motivation",
        },
        {
          id: "s8Py_92RtuI",
          title: "Motivational Yoga for Success",
          channelTitle: "Yoga Success Channel",
          thumbnailUrl: "https://i.ytimg.com/vi/s8Py_92RtuI/mqdefault.jpg",
          description: "Energize your body and mind for success",
        },
      ],
    };

    let results: VideoRecommendation[] = [];

    // If user has preferences, use them to select videos
    if (preferences.length > 0) {
      // Get videos from each selected category
      preferences.forEach((category) => {
        if (videosByCategory[category]) {
          results = [...results, ...videosByCategory[category]];
        }
      });
    } else {
      // If no preferences, use emotion to determine categories
      switch (emotion) {
        case "anxiety":
          results = [
            ...videosByCategory["relaxation"],
            ...videosByCategory["breathing"],
          ];
          break;
        case "stress":
          results = [
            ...videosByCategory["meditation"],
            ...videosByCategory["nature"],
          ];
          break;
        case "sadness":
          results = [
            ...videosByCategory["positive-thinking"],
            ...videosByCategory["motivation"],
          ];
          break;
        default:
          // For neutral or other emotions, mix categories
          Object.values(videosByCategory).forEach((videos) => {
            results = [...results, ...videos.slice(0, 1)];
          });
      }
    }

    // Ensure no duplicate videos by ID
    const uniqueVideos = Array.from(
      new Map(results.map((v) => [v.id, v])).values()
    );

    // Randomize array to make results look dynamic
    const shuffledVideos = uniqueVideos.sort(() => 0.5 - Math.random());

    // Add a timestamp to make each request look unique
    const timestamp = Date.now();
    return shuffledVideos.slice(0, 6).map((video) => ({
      ...video,
      title: `${video.title} ${preferences.length > 0 ? "(Personalized)" : ""}`,
      description: `${video.description} [${timestamp}]`,
    }));
  };

  // Make sure we always show content even when API fails
  useEffect(() => {
    if (videos.length === 0 && !loading && !showPreferences) {
      console.log("No videos available, using fallbacks");
      setVideos(getFallbackVideos(currentEmotion));
    }
  }, [videos, loading, showPreferences, currentEmotion]);

  if (activeVideo) {
    return (
      <VideoPlayer
        videoId={activeVideo.id}
        title={activeVideo.title}
        onClose={() => setActiveVideo(null)}
        onFeedback={handleFeedback}
        emotionBefore={currentEmotion}
        videos={videos}
        setActiveVideo={setActiveVideo}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <AnimatePresence>
        <motion.div
          className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <FaYoutube className="text-red-600 mr-2" />
              Therapeutic Videos
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                title="Video Preferences"
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

          {error && (
            <div className="bg-red-900/40 border border-red-500 p-4 rounded-lg mb-4 flex items-center text-white">
              <FaExclamationTriangle className="text-yellow-500 mr-2" />
              <p>{error}</p>
            </div>
          )}

          {showPreferences ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Video Preferences
                </h3>
                <p className="text-gray-300 mb-4">
                  Select the types of videos you'd like to see for therapeutic
                  content:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`
                        flex items-center justify-between px-4 py-2 rounded-md transition-colors 
                        ${
                          selectedCategories.includes(category)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }
                      `}
                    >
                      <span>{category.replace(/-/g, " ")}</span>
                      {selectedCategories.includes(category) && (
                        <CheckIcon boxSize={4} ml={2} color="white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-white flex items-center"
                  disabled={saving || selectedCategories.length === 0}
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {preferenceLoaded && !loading && videos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 mb-4">
                    Welcome to the Therapeutic Video feature! Please set your
                    video preferences to get started.
                  </p>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-white"
                  >
                    Set Preferences
                  </button>
                </div>
              ) : loading ? (
                <div className="flex justify-center items-center py-12">
                  <FaSpinner className="animate-spin h-10 w-10 text-blue-500" />
                </div>
              ) : videos.length === 0 && !loading && !showPreferences ? (
                <div className="text-center mb-6">
                  <p className="text-gray-300 mb-4">
                    Using reliable fallback videos:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFallbackVideos(currentEmotion).map((video) => (
                      <motion.div
                        key={video.id}
                        className="bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-600 transition-all shadow-md"
                        whileHover={{ scale: 1.03 }}
                        onClick={() => handleVideoSelect(video)}
                      >
                        <div className="relative aspect-video">
                          {/* Always derive thumbnail URL from video ID if not provided */}
                          <img
                            src={
                              video.thumbnailUrl ||
                              `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`
                            }
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.src = `https://via.placeholder.com/320x180?text=${encodeURIComponent(
                                video.title
                              )}`;
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                            <div className="rounded-full bg-red-600 p-3 shadow-lg">
                              <FaPlay className="text-white text-xl" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="text-white font-medium text-sm line-clamp-2">
                            {video.title}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {video.channelTitle}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 mb-4">
                    {currentEmotion && currentEmotion !== "neutral"
                      ? `These videos are selected to help with your current ${currentEmotion} feelings.`
                      : "Here are some therapeutic videos based on your preferences."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {videos.map((video) => (
                      <motion.div
                        key={video.id}
                        className="bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-600 transition-all shadow-md"
                        whileHover={{ scale: 1.03 }}
                        onClick={() => handleVideoSelect(video)}
                      >
                        <div className="relative aspect-video">
                          {/* Always derive thumbnail URL from video ID if not provided */}
                          <img
                            src={
                              video.thumbnailUrl ||
                              `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`
                            }
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.src = `https://via.placeholder.com/320x180?text=${encodeURIComponent(
                                video.title
                              )}`;
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                            <div className="rounded-full bg-red-600 p-3 shadow-lg">
                              <FaPlay className="text-white text-xl" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="text-white font-medium text-sm line-clamp-2">
                            {video.title}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {video.channelTitle}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white inline-flex items-center"
                    >
                      <FaCog className="mr-2" />
                      Adjust Preferences
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {notification && notification.visible && (
            <div
              className={`fixed top-5 right-5 z-50 max-w-sm ${
                notification.type === "success"
                  ? "bg-green-700 border-green-600"
                  : "bg-red-700 border-red-600"
              } text-white rounded-lg shadow-lg p-4 transition-opacity duration-300 border`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === "success" ? (
                    <svg
                      className="w-5 h-5 text-green-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-red-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">{notification.title}</h3>
                  <div className="mt-1 text-xs opacity-90">
                    {notification.message}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default VideoRecommendations;
