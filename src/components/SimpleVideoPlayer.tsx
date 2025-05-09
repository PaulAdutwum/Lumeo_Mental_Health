import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlay,
  FaTimes,
  FaYoutube,
  FaSpinner,
  FaThumbsUp,
  FaThumbsDown,
  FaExclamationTriangle,
  FaRandom,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useEnvironment } from "../hooks/useEnvironment";

interface VideoCategory {
  id: string;
  name: string;
  description: string;
}

interface Video {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  description: string;
}

interface SimpleVideoPlayerProps {
  onClose?: () => void;
}

// A simpler video player focused on wellbeing videos without emotion-based recommendations
const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({ onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("mindfulness");
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const navigate = useNavigate();
  const { youtubeApiKey, envLoaded, hasErrors } = useEnvironment();

  // Define video categories
  const categories: VideoCategory[] = [
    {
      id: "mindfulness",
      name: "Mindfulness",
      description: "Mindfulness and meditation videos",
    },
    {
      id: "motivation",
      name: "Motivation",
      description: "Motivational and uplifting content",
    },
    {
      id: "relaxation",
      name: "Relaxation",
      description: "Relaxing videos for stress relief",
    },
    {
      id: "nature",
      name: "Nature",
      description: "Peaceful nature scenes and sounds",
    },
    {
      id: "sleep",
      name: "Sleep",
      description: "Videos to help with sleep and rest",
    },
    {
      id: "positivity",
      name: "Positivity",
      description: "Positive thinking and affirmations",
    },
  ];

  // Fetch videos for the active category
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setVideos([]);
      setError(null);

      try {
        if (!youtubeApiKey) {
          console.warn("YouTube API key not available, using fallback videos");
          setVideos(getFallbackVideos());
          return;
        }

        // Construct search query based on category
        let searchQuery = "";
        switch (activeCategory) {
          case "mindfulness":
            searchQuery = "guided meditation mindfulness practice";
            break;
          case "motivation":
            searchQuery = "motivational wellness inspiration mental health";
            break;
          case "relaxation":
            searchQuery = "relaxation techniques stress relief";
            break;
          case "nature":
            searchQuery = "calming nature scenes sounds for meditation";
            break;
          case "sleep":
            searchQuery = "deep sleep music relaxation insomnia help";
            break;
          case "positivity":
            searchQuery = "positive thinking affirmations mental wellness";
            break;
          default:
            searchQuery = "mindfulness meditation wellness";
        }

        console.log("Fetching videos for query:", searchQuery);

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(
            searchQuery
          )}&type=video&videoEmbeddable=true&key=${youtubeApiKey}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("YouTube API error response:", errorText);
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("API response received:", data);

        if (data.items && data.items.length > 0) {
          const fetchedVideos: Video[] = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.medium.url,
            description: item.snippet.description,
          }));

          console.log("Processed videos:", fetchedVideos);
          setVideos(fetchedVideos);
        } else {
          console.log("No videos returned from API, using fallbacks");
          setVideos(getFallbackVideos());
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
        setError(
          `Failed to fetch videos: ${
            error instanceof Error ? error.message : "Unknown error"
          }. Showing default recommendations.`
        );
        setVideos(getFallbackVideos());
      } finally {
        setLoading(false);
      }
    };

    if (envLoaded) {
      fetchVideos();
    }
  }, [activeCategory, youtubeApiKey, envLoaded]);

  // Load YouTube API script when a video is selected
  useEffect(() => {
    if (selectedVideo) {
      // Clear any existing iframe to prevent conflicts
      if (playerRef.current) {
        // Clear the container first
        while (playerRef.current.firstChild) {
          playerRef.current.removeChild(playerRef.current.firstChild);
        }
      }

      if (!window.YT) {
        console.log("Loading YouTube IFrame API");
        // Create a new div for the player
        const playerDiv = document.createElement("div");
        playerDiv.id = "youtube-player-container";
        if (playerRef.current) {
          playerRef.current.appendChild(playerDiv);
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        tag.onload = () => console.log("YouTube API script loaded");
        tag.onerror = (e) => {
          console.error("Error loading YouTube API script:", e);
          setError("Failed to load YouTube player. Please try again later.");
        };

        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = () => {
          console.log("YouTube API ready");
          initializePlayer();
        };

        return () => {
          window.onYouTubeIframeAPIReady = () => {};
        };
      } else if (window.YT && window.YT.Player) {
        console.log("YouTube API already loaded, initializing player");
        // Create a new div for the player
        const playerDiv = document.createElement("div");
        playerDiv.id = "youtube-player-container";
        if (playerRef.current) {
          playerRef.current.appendChild(playerDiv);
        }
        initializePlayer();
      }
    }
  }, [selectedVideo]);

  // Initialize the YouTube player
  const initializePlayer = () => {
    if (!selectedVideo) return;

    if (!window.YT || !window.YT.Player) {
      console.error("YouTube API not loaded");
      setError("YouTube player failed to load. Please try again later.");
      return;
    }

    const playerContainer = document.getElementById("youtube-player-container");
    if (!playerContainer) {
      console.error("Player container not found");
      setError("Error initializing video player.");
      return;
    }

    console.log("Initializing YouTube player for video:", selectedVideo.id);

    try {
      // Destroy previous player if exists
      if (player && player.destroy) {
        player.destroy();
      }

      // Create a new DIV for the player (YouTube can sometimes have issues when reusing containers)
      if (playerRef.current) {
        while (playerRef.current.firstChild) {
          playerRef.current.removeChild(playerRef.current.firstChild);
        }

        const newPlayerDiv = document.createElement("div");
        newPlayerDiv.id = "youtube-player-container";
        playerRef.current.appendChild(newPlayerDiv);
      }

      const newPlayer = new window.YT.Player("youtube-player-container", {
        videoId: selectedVideo.id,
        height: "360",
        width: "640",
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1 as number, // Cast to number to satisfy TypeScript
        },
        events: {
          onReady: (event) => {
            console.log("Player ready");
            event.target.playVideo();
          },
          onStateChange: (event) => {
            console.log("Player state changed:", event.data);
            // If video ended
            if (event.data === 0) {
              console.log("Video ended");
            }
          },
          onError: (event) => {
            console.error("YouTube player error:", event.data);
            let errorMessage = "Error playing video. Please try another one.";

            // Add more descriptive errors based on error code
            switch (event.data) {
              case 2:
                errorMessage = "Invalid video ID. Please try another video.";
                break;
              case 5:
                errorMessage = "Error with HTML5 player. Please try again.";
                break;
              case 100:
                errorMessage =
                  "Video not found or removed. Please try another video.";
                break;
              case 101:
              case 150:
                errorMessage =
                  "Video owner doesn't allow embedding. Please try another video.";
                break;
            }

            setError(errorMessage);
          },
        },
      });

      setPlayer(newPlayer);
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
      setError("Failed to play video. Please try again.");
    }
  };

  // Get fallback videos if API fails
  const getFallbackVideos = (): Video[] => {
    return [
      {
        id: "9FiEji_fzvk",
        title: "10-Minute Meditation For Anxiety",
        channelTitle: "Goodful",
        thumbnailUrl: "https://i.ytimg.com/vi/9FiEji_fzvk/mqdefault.jpg",
        description:
          "Meditating for just 10 minutes a day can help you reduce stress and anxiety.",
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
        id: "O-6f5wQXSu8",
        title: "Guided Sleep Meditation: The Haven of Peace",
        channelTitle: "The Honest Guys - Meditations - Relaxation",
        thumbnailUrl: "https://i.ytimg.com/vi/O-6f5wQXSu8/mqdefault.jpg",
        description: "A guided meditation to help you sleep.",
      },
      {
        id: "aEqlQvczMyo",
        title: "10 Minute Guided Meditation for Focus",
        channelTitle: "Great Meditation",
        thumbnailUrl: "https://i.ytimg.com/vi/aEqlQvczMyo/mqdefault.jpg",
        description:
          "This guided meditation helps improve focus and concentration.",
      },
      {
        id: "QETHXW8Wtsg",
        title: "3-Minute Mindfulness Breathing Exercise",
        channelTitle: "Mark Williams",
        thumbnailUrl: "https://i.ytimg.com/vi/QETHXW8Wtsg/mqdefault.jpg",
        description:
          "A short mindfulness breathing exercise to help you relax.",
      },
      {
        id: "z6X5oEIg6Ak",
        title: "Positive Affirmations - Reprogram Your Mind",
        channelTitle: "Jason Stephenson",
        thumbnailUrl: "https://i.ytimg.com/vi/z6X5oEIg6Ak/mqdefault.jpg",
        description:
          "Positive affirmations to help reprogram your mind for success and happiness.",
      },
    ];
  };

  // Handle video selection
  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  // Handle closing based on context (modal or standalone page)
  const handleClose = () => {
    if (onClose) {
      // Used as modal
      onClose();
    } else {
      // Used as standalone page
      navigate("/main");
    }
  };

  // Close the video player and return to the list
  const handleClosePlayer = () => {
    setSelectedVideo(null);
    if (player && player.destroy) {
      player.destroy();
      setPlayer(null);
    }

    // Clear any error when returning to video selection
    setError(null);
  };

  // Select a random category
  const selectRandomCategory = () => {
    const randomIndex = Math.floor(Math.random() * categories.length);
    setActiveCategory(categories[randomIndex].id);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <motion.div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <FaYoutube className="text-red-600 mr-2" />
            Wellness Videos
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FaTimes className="text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-800 rounded-lg text-red-200 flex items-start">
            <FaExclamationTriangle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {selectedVideo ? (
          <div className="mb-6">
            <div className="relative aspect-video">
              <div
                ref={playerRef}
                className="w-full h-full rounded-lg overflow-hidden bg-gray-800"
              />
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-900/40 border border-red-800 rounded-lg text-red-200 flex items-start">
                <FaExclamationTriangle className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error Playing Video</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-white">
                {selectedVideo.title}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {selectedVideo.channelTitle}
              </p>
              <p className="text-gray-300 mt-2">{selectedVideo.description}</p>
              <div className="mt-4 flex justify-between">
                <button
                  onClick={handleClosePlayer}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <FaTimes className="mr-2 inline" /> Back to videos
                </button>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                    <FaThumbsUp className="mr-2 inline" /> Helpful
                  </button>
                  <button className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                    <FaThumbsDown className="mr-2 inline" /> Not helpful
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Select a category of videos to help with your mental wellbeing:
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-3 py-2 rounded-lg ${
                      activeCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                    title={category.description}
                  >
                    {category.name}
                  </button>
                ))}

                <button
                  onClick={selectRandomCategory}
                  className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  title="Select a random category"
                >
                  <FaRandom className="mr-1 inline" /> Random
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <FaSpinner className="animate-spin text-3xl text-blue-500" />
                <span className="ml-2 text-gray-300">Loading videos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleVideoSelect(video)}
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
                        <FaPlay className="text-white text-4xl" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3
                        className="text-white font-medium line-clamp-2"
                        title={video.title}
                      >
                        {video.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {video.channelTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default SimpleVideoPlayer;
