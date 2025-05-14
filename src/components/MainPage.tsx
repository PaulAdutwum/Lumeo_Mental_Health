import React, { useState, useEffect } from "react";
import { auth } from "../components/firebase";
import { useNavigate } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaFilm,
  FaRobot,
  FaComment,
  FaImage,
  FaVideo,
  FaMusic,
  FaPaintBrush,
} from "react-icons/fa";
import YouTube from "react-youtube";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitter,
  faInstagram,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";
import StreakBanner from "./StreakBanner";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface Genre {
  id: number;
  name: string;
}

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const SEARCH_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const GENRE_URL = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`;
const MOVIE_BY_GENRE_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=`;
const TRENDING_MOVIES_URL = `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`;

const MainPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const handleAllMoviesClick = async () => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`
      );
      const data = await res.json();
      setMovies(data.results || []);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Error fetching all movies:", error);
    }
  };

  useEffect(() => {
    fetch(GENRE_URL)
      .then((res) => res.json())
      .then((data) => setGenres(data.genres))
      .catch((error) => console.error("Error fetching genres:", error));
  }, []);

  useEffect(() => {
    fetch(TRENDING_MOVIES_URL)
      .then((res) => res.json())
      .then((data) => setMovies(data.results))
      .catch((error) =>
        console.error("Error fetching trending movies:", error)
      );
  }, []);

  const handleGenreClick = async (genreId: number) => {
    setSelectedGenre(genreId);
    try {
      const res = await fetch(`${MOVIE_BY_GENRE_URL}${genreId}`);
      const data = await res.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error("Error fetching movies by genre:", error);
    }
  };

  const fetchTrailer = async (movieId: number) => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}`
      );
      const data = await res.json();
      const trailer = data.results.find(
        (video: any) => video.type === "Trailer"
      );

      if (trailer) {
        setTrailerKey(trailer.key);
        setIsPlayerOpen(true);
      } else {
        alert("No trailer available for this movie.");
      }
    } catch (error) {
      console.error("Error fetching trailer:", error);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim() !== "") {
      try {
        const res = await fetch(`${SEARCH_URL}${searchTerm}`);
        const data = await res.json();
        setMovies(data.results || []);
      } catch (error) {
        console.error("Error fetching movies:", error);
      }
    }
  };
  {
  }
  {
    isPlayerOpen && trailerKey && (
      <div
        className="fixed top-0 left-0 w-full h-screen flex items-center justify-center bg-black bg-opacity-80 z-50"
        onClick={() => setIsPlayerOpen(false)}
      >
        <div
          className="relative w-[90%] md:w-[70%] lg:w-[50%]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
            onClick={() => setIsPlayerOpen(false)}
          >
            <FaTimes size={20} />
          </button>
          <YouTube
            videoId={trailerKey}
            opts={{
              width: "100%",
              height: "400px",
              playerVars: { autoplay: 1 },
            }}
          />
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetch(GENRE_URL)
      .then((res) => res.json())
      .then((data) => setGenres(data.genres || [])) // Ensure genres are set
      .catch((error) => console.error("Error fetching genres:", error));
  }, []);

  useEffect(() => {
    if (searchTerm.trim() !== "") {
      fetch(`${SEARCH_URL}${searchTerm}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data.results || []))
        .catch((error) =>
          console.error("Error fetching search suggestions:", error)
        );
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate("/", { replace: true });
    });
  };

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (!API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-red-800 p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Missing TMDb API Key</h2>
          <p className="mb-2">
            Please add your TMDb API key to your <code>.env.local</code> file as{" "}
            <code>VITE_TMDB_API_KEY</code>.
          </p>
          <p className="mb-2">Then restart your development server.</p>
          <p className="text-sm text-gray-300 mt-4">
            If you don't have a TMDb API key, you can get one at{" "}
            <a
              href="https://www.themoviedb.org/settings/api"
              className="text-blue-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDb API
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StreakBanner />
      <div className="min-h-screen bg-gray-900 text-white flex">
        {isPlayerOpen && trailerKey && (
          <div className="fixed top-0 left-0 w-full h-screen flex items-center justify-center bg-black bg-opacity-80 z-50">
            <div className="relative w-[90%] md:w-[70%] lg:w-[50%]">
              <button
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                onClick={() => setIsPlayerOpen(false)}
              >
                <FaTimes size={20} />
              </button>
              <YouTube
                videoId={trailerKey}
                opts={{
                  width: "100%",
                  height: "400px",
                  playerVars: { autoplay: 1 },
                }}
              />
            </div>
          </div>
        )}

        <button
          className="md:hidden fixed top-4 left-4 bg-gray-800 text-white p-3 rounded-md z-50"
          onClick={toggleSidebar}
        >
          <FaBars size={20} />
        </button>

        <aside
          className={`fixed top-0 left-0 h-full bg-black p-4 z-40 transition-transform duration-300 md:h-auto w-64 border-r-2 border-gray-600 shadow-lg 
      ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:relative`}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <div className="text-yellow-400 text-xl font-bold">Lumeo</div>
              <button
                className="md:hidden text-white text-2xl"
                onClick={toggleSidebar}
              >
                ✖
              </button>
            </div>

            <button
              className="w-full text-left p-2 hover:text-yellow-400 transition-all"
              onClick={handleAllMoviesClick}
            >
              🎬 All Movies
            </button>

            <div className="flex flex-col space-y-2 mt-4 flex-grow overflow-y-auto">
              {Array.isArray(genres) && genres.length > 0 ? (
                genres.map((genre) => (
                  <button
                    key={genre.id}
                    className={`w-full text-left p-2 transition-all ${
                      selectedGenre === genre.id
                        ? "text-yellow-400 font-bold bg-gray-800 rounded-md"
                        : "hover:text-yellow-400"
                    }`}
                    onClick={() => handleGenreClick(genre.id)}
                  >
                    {genre.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center">
                  Loading genres...
                </p>
              )}
            </div>

            <div className="mt-6 bg-gray-800 text-white p-3 rounded-lg text-center shadow-md">
              <h3 className="text-sm font-semibold">
                🎥 Movie Pick of the Day
              </h3>
              <p className="text-xs italic text-gray-300">
                "
                {movies && movies.length > 0
                  ? movies[Math.floor(Math.random() * movies.length)].title
                  : "Loading..."}
                "
              </p>
            </div>
            <div className="mt-8">
              <Link to="/generate-movies">
                <button className="w-full text-left p-3 font-bold bg-blue-500 text-white rounded-md hover:bg-orange-600 transition-all">
                  🎥 Generate Movie List
                </button>
              </Link>
            </div>

            <button
              className="text-red-500 hover:text-red-700 transition-all mt-6"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">🎬 Explore Movies</h2>
            <button
              onClick={() => navigate("/")}
              className="text-white bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition"
            >
              🏠 Home
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex space-x-2 mb-6">
            <input
              type="text"
              className="w-full p-3 bg-gray-700 rounded-md text-white hover:"
              placeholder="Search Movies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="bg-blue-600 px-5 py-3 rounded-md hover:bg-blue-700 transition-all"
              onClick={handleSearch}
            >
              Search
            </button>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-gray-800 rounded-md mt-1 max-h-40 overflow-y-auto">
                {searchResults.map((movie) => (
                  <div
                    key={movie.id}
                    className="p-2 hover:bg-gray-700 cursor-pointer"
                    onClick={() => fetchTrailer(movie.id)}
                  >
                    {movie.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Display Movies */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.isArray(movies) && movies.length > 0 ? (
              movies.map((movie) => (
                <div
                  key={movie.id}
                  className="relative cursor-pointer group"
                  onClick={() => fetchTrailer(movie.id)}
                >
                  {/* Movie Poster */}
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    className="w-full h-64 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                    alt={movie.title}
                  />

                  {/* Movie Title - Now always visible & changes color on hover */}
                  <div className="bg-gray-800 p-2 rounded-b-lg text-center">
                    <span className="text-white font-semibold group-hover:text-yellow-400 transition duration-300">
                      {movie.title}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center col-span-2 md:col-span-4">
                No movies found. Try searching for something else!
              </p>
            )}
          </div>
          <div className="mt-8 px-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              AI Companion Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Link
                to="/chat"
                className="bg-gray-800 rounded-lg p-6 hover:bg-blue-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaRobot className="text-blue-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">AI Chat</h3>
                </div>
                <p className="text-gray-300">
                  Talk with Lumio, your AI companion for emotional support and
                  creative inspiration.
                </p>
              </Link>

              <Link
                to="/chat?tool=image"
                className="bg-gray-800 rounded-lg p-6 hover:bg-green-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaImage className="text-green-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">Image Creation</h3>
                </div>
                <p className="text-gray-300">
                  Generate beautiful images with DALL-E and Stable Diffusion
                  models.
                </p>
              </Link>

              <Link
                to="/chat?tool=video"
                className="bg-gray-800 rounded-lg p-6 hover:bg-red-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaVideo className="text-red-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">Video Tools</h3>
                </div>
                <p className="text-gray-300">
                  Create short videos and animations powered by AI.
                </p>
              </Link>

              <Link
                to="/chat?tool=music"
                className="bg-gray-800 rounded-lg p-6 hover:bg-purple-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaMusic className="text-purple-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">Music Generation</h3>
                </div>
                <p className="text-gray-300">
                  Compose unique music pieces with AI assistance.
                </p>
              </Link>

              <Link
                to="/chat?tool=canvas"
                className="bg-gray-800 rounded-lg p-6 hover:bg-yellow-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaPaintBrush className="text-yellow-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">Creative Canvas</h3>
                </div>
                <p className="text-gray-300">
                  Express yourself with AI-guided drawing tools.
                </p>
              </Link>

              <Link
                to="/chat?tool=story"
                className="bg-gray-800 rounded-lg p-6 hover:bg-pink-600 transition-colors"
              >
                <div className="flex items-center mb-3">
                  <FaComment className="text-pink-400 text-2xl mr-3" />
                  <h3 className="text-xl font-semibold">Story Creator</h3>
                </div>
                <p className="text-gray-300">
                  Craft narratives and stories with AI collaboration.
                </p>
              </Link>
            </div>
          </div>
          <footer className="w-full bg-white-80 text-white py-6 mt-24 relative z-10">
            <div className="container mx-auto flex flex-col items-center">
              <div className="flex items-center text-gray-400 text-2xl font-bold mb-4">
                <FaFilm className="mr-2" />
                <span>Lumeo</span>
              </div>

              <p className="text-gray-400 text-sm text-center mb-4">
                © {new Date().getFullYear()} Lumeo. All rights reserved.
              </p>

              {/*  Social Media Icons (Fixed Color) */}
              <div className="flex space-x-6 text-white">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition text-xl"
                >
                  <FontAwesomeIcon icon={faTwitter} />
                </a>

                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition text-xl"
                >
                  <FontAwesomeIcon icon={faFacebook} />
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-500 transition text-xl"
                >
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
              </div>
            </div>
          </footer>
        </div>

        {/* Hamburger menu for mobile */}
        <button
          className="fixed top-4 right-4 z-50 sm:hidden bg-gray-800 p-2 rounded-md"
          onClick={() => setShowMobileMenu(true)}
        >
          <FaBars className="text-white text-2xl" />
        </button>

        {showMobileMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center">
            <button
              className="absolute top-6 right-6 text-white text-3xl"
              onClick={() => setShowMobileMenu(false)}
            >
              &times;
            </button>
            <div className="flex flex-col gap-6 text-2xl text-white">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat");
                }}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat?tool=videos");
                }}
              >
                Wellness Videos
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat?tool=music");
                }}
              >
                Music
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat?tool=image");
                }}
              >
                Image Creation
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat?tool=canvas");
                }}
              >
                Creative Canvas
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate("/chat?tool=story");
                }}
              >
                Story Creator
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MainPage;
