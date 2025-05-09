import React, { useState, useEffect } from "react";
import { FaMusic, FaPlay, FaPause, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEnvironment } from "../hooks/useEnvironment";

interface MusicPageProps {
  onClose?: () => void;
}

const MUSIC_CATEGORIES = [
  { key: "relaxing", label: "Relaxing" },
  { key: "focus", label: "Focus" },
  { key: "uplifting", label: "Uplifting" },
  { key: "sleep", label: "Sleep" },
  { key: "nature", label: "Nature" },
];

const fallbackVideos = [
  {
    id: "DWcJFNfaw9c",
    title: "Beautiful Relaxing Music for Stress Relief",
    thumbnail: "https://i.ytimg.com/vi/DWcJFNfaw9c/mqdefault.jpg",
    channelTitle: "Meditation Relaxation Music",
  },
  {
    id: "1ZYbU82GVz4",
    title: "Relaxing Music for Deep Sleep",
    thumbnail: "https://i.ytimg.com/vi/1ZYbU82GVz4/mqdefault.jpg",
    channelTitle: "Yellow Brick Cinema",
  },
  {
    id: "77ZozI0rw7w",
    title: "Relaxing Piano Music for Stress Relief",
    thumbnail: "https://i.ytimg.com/vi/77ZozI0rw7w/mqdefault.jpg",
    channelTitle: "Meditation Relaxation Music",
  },
  {
    id: "XjgwRzCwlzM",
    title: "Study Music - Improve Concentration and Focus",
    thumbnail: "https://i.ytimg.com/vi/XjgwRzCwlzM/mqdefault.jpg",
    channelTitle: "Study Music",
  },
];

const MusicPage: React.FC<MusicPageProps> = ({ onClose }) => {
  const [category, setCategory] = useState("relaxing");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const navigate = useNavigate();
  const { youtubeApiKey, envLoaded } = useEnvironment();

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

  useEffect(() => {
    if (envLoaded) {
      fetchMusicVideos(category);
    }
    // eslint-disable-next-line
  }, [category, envLoaded, youtubeApiKey]);

  const fetchMusicVideos = async (cat: string) => {
    setLoading(true);
    setError("");
    setVideos([]);
    try {
      if (!youtubeApiKey) {
        console.warn("YouTube API key not available, using fallback videos");
        setVideos(fallbackVideos);
        return;
      }

      const searchQuery = `${cat} music for relaxation`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(
          searchQuery
        )}&type=video&videoEmbeddable=true&key=${youtubeApiKey}`
      );
      if (!response.ok) throw new Error("YouTube API error");
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setVideos(
          data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
          }))
        );
      } else {
        setVideos(fallbackVideos);
      }
    } catch (err) {
      setError("Could not load music videos. Showing fallback.");
      setVideos(fallbackVideos);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <motion.div
        className="bg-gray-900 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaMusic className="text-yellow-400" />
            Relaxing Music Player
          </h1>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FaTimes className="text-gray-400" />
          </button>
        </div>

        <div className="mb-6 flex gap-3 flex-wrap">
          {MUSIC_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                category === cat.key
                  ? "bg-yellow-500 text-white shadow"
                  : "bg-gray-700 text-gray-200 hover:bg-yellow-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin mr-2">
              <FaMusic className="text-yellow-400" />
            </div>
            <span>Loading music...</span>
          </div>
        ) : error ? (
          <div className="bg-red-900/40 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition cursor-pointer flex flex-col"
                onClick={() => setActiveVideo(video)}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {video.channelTitle}
                    </p>
                  </div>
                  <button className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center font-bold hover:bg-yellow-600 transition">
                    <FaPlay /> Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full relative">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
              >
                <FaTimes />
              </button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FaMusic className="text-yellow-400" /> {activeVideo.title}
              </h2>
              <div className="aspect-video mb-4">
                <iframe
                  width="100%"
                  height="360"
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">
                  {activeVideo.channelTitle}
                </span>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
                >
                  <FaPause /> Close
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MusicPage;
