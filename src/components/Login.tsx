import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import {
  FaFilm,
  FaMicrophone,
  FaPencilAlt,
  FaRobot,
  FaImage,
  FaVideo,
  FaComment,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import TrendingMovies from "../components/TrendingMovies";
import { auth, provider } from "../components/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitter,
  faInstagram,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

const Login = () => {
  const [user, setUser] = useState<User | null>(null);
  const [welcomePopup, setWelcomePopup] = useState(false);
  const [background, setBackground] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setUser(userCredential.user);
      setWelcomePopup(true);
      setTimeout(() => navigate("/chat"), 3000);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Invalid email or password. Try again!");
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setWelcomePopup(true);
      setTimeout(() => navigate("/chat"), 2500);
    } catch (error) {
      console.error("Google Login failed:", error);
    }
  };

  // Fetch Movie Background (Runs Once on Page Load)
  useEffect(() => {
    const fetchBackground = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`
        );
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          let randomMovie;
          do {
            randomMovie =
              data.results[Math.floor(Math.random() * data.results.length)];
          } while (!randomMovie.backdrop_path);

          setBackground(BACKDROP_URL + randomMovie.backdrop_path);
        } else {
          setBackground("/default-background.jpg");
        }
      } catch (error) {
        console.error("Error fetching background:", error);
        setBackground("/default-background.jpg");
      }
    };

    fetchBackground();
  }, []);

  // Handle Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser && window.location.pathname === "/") {
        if (!welcomePopup) {
          setWelcomePopup(true);
          setTimeout(() => {
            setWelcomePopup(false);
            if (window.location.pathname === "/main") {
              navigate("/main");
            }
          }, 5000);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, welcomePopup]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative bg-gray-900"
      style={{
        backgroundImage: background ? `url(${background})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transition: "background 1s ease-in-out",
      }}
    >
      {welcomePopup && (
        <motion.div
          className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white p-4 rounded-lg shadow-lg text-center w-fit mx-auto mt-6 z-50"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3 }}
        >
          🎉 Hi {user?.displayName || "User"}, Welcome to Lumio AI!
        </motion.div>
      )}

      {/* Dark Overlay for Better Readability */}
      <div className="absolute inset-0 bg-black bg-opacity-70"></div>

      {/* Lumio Logo (Positioned at the Top Left) */}
      <div className="absolute top-5 left-5 flex items-center text-white text-2xl z-10">
        <FaRobot className="text-blue-400 mr-2 hover:text-blue-300 transition" />
        <span className="font-bold">Lumio AI</span>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 px-4">
        {/* Left Content - App Description */}
        <div className="w-full md:w-1/2 text-white">
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Lumio: Your AI Companion
          </motion.h1>

          <motion.p
            className="text-lg mb-8 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Meet your personal AI assistant, creative partner, and emotional
            support system—all in one platform.
          </motion.p>

          {/* Feature Grid */}
          <motion.div
            className="grid grid-cols-2 gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center space-x-2">
              <FaComment className="text-blue-400" />
              <span>AI Chat Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaImage className="text-green-400" />
              <span>Image Generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaVideo className="text-red-400" />
              <span>Video Creation</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaMicrophone className="text-yellow-400" />
              <span>Voice Interaction</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaPencilAlt className="text-purple-400" />
              <span>Creative Canvas</span>
            </div>
            <div className="flex items-center space-x-2">
              <FaFilm className="text-pink-400" />
              <span>Media Recommendations</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700"
          >
            <h3 className="text-xl font-semibold mb-2">Why Lumeo AI?</h3>
            <p className="mb-2">✓ 24/7 anonymous emotional support</p>
            <p className="mb-2">
              ✓ Personalized recommendations based on your preferences
            </p>
            <p className="mb-2">
              ✓ Express yourself with AI-guided creative tools
            </p>
            <p>✓ Multimodal interaction with text, voice, and vision</p>
          </motion.div>
        </div>

        {/* Right Content - Login Form */}
        <motion.div
          className="w-full md:w-5/12 bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Login to Lumeo AI
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:opacity-90 transition duration-300 font-medium"
            >
              Sign In
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <hr className="w-full border-gray-600" />
            <span className="px-3 text-gray-400 text-sm">OR</span>
            <hr className="w-full border-gray-600" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-4 bg-white text-gray-800 py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-100 transition duration-300 font-medium"
          >
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </button>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-400 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center space-x-6 text-gray-400 z-10">
        <a href="#" className="hover:text-white transition">
          <FontAwesomeIcon icon={faTwitter} size="lg" />
        </a>
        <a href="#" className="hover:text-white transition">
          <FontAwesomeIcon icon={faInstagram} size="lg" />
        </a>
        <a href="#" className="hover:text-white transition">
          <FontAwesomeIcon icon={faFacebook} size="lg" />
        </a>
      </div>
    </div>
  );
};

export default Login;
