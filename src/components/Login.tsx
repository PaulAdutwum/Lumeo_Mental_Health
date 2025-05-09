import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaFilm,
  FaMicrophone,
  FaPencilAlt,
  FaRobot,
  FaImage,
  FaVideo,
  FaComment,
  FaHeart,
  FaSmile,
  FaLeaf,
  FaBrain,
  FaChevronRight,
  FaChevronLeft,
  FaBars,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
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

// Mental wellness background images
const wellnessBackgrounds = [
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1498673394965-85cb14905c89?auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&q=80",
];

const Login = () => {
  const [user, setUser] = useState<User | null>(null);
  const [welcomePopup, setWelcomePopup] = useState(false);
  const [background, setBackground] = useState<string | null>(null);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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

  // Rotate through wellness background images
  useEffect(() => {
    let currentIndex = 0;
    setBackground(wellnessBackgrounds[currentIndex]);

    const rotateBackgrounds = setInterval(() => {
      currentIndex = (currentIndex + 1) % wellnessBackgrounds.length;
      setBackground(wellnessBackgrounds[currentIndex]);
    }, 10000); // Change every 10 seconds

    return () => clearInterval(rotateBackgrounds);
  }, []);

  // How to use guide steps
  const guideSteps = [
    {
      title: "Express How You Feel",
      description:
        "Start with a chat about your day or current feelings. Lumeo listens and provides supportive responses.",
      icon: <FaComment className="text-blue-400 text-3xl mb-3" />,
    },
    {
      title: "Get Personalized Recommendations",
      description:
        "Receive tailored therapeutic content like videos, music, and activities based on your emotional state.",
      icon: <FaHeart className="text-red-500 text-3xl mb-3" />,
    },
    {
      title: "Creative Expression Tools",
      description:
        "Use our drawing canvas to express emotions visually when words aren't enough.",
      icon: <FaPencilAlt className="text-purple-500 text-3xl mb-3" />,
    },
    {
      title: "Mindfulness Exercises",
      description:
        "Access guided breathing exercises and meditation tools to help manage stress and anxiety.",
      icon: <FaLeaf className="text-green-500 text-3xl mb-3" />,
    },
  ];

  const nextGuideStep = () => {
    setCurrentGuideStep((prev) => (prev + 1) % guideSteps.length);
  };

  const prevGuideStep = () => {
    setCurrentGuideStep(
      (prev) => (prev - 1 + guideSteps.length) % guideSteps.length
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative bg-gray-900"
      style={{
        backgroundImage: background ? `url(${background})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transition: "background 1.5s ease-in-out",
      }}
    >
      {welcomePopup && (
        <motion.div
          className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white p-4 rounded-lg shadow-lg text-center w-fit mx-auto mt-6 z-50"
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3 }}
        >
          🎉 Hi {user?.displayName || "User"}, Welcome to Lumeo AI!
        </motion.div>
      )}

      {/* Dark Overlay for Better Readability */}
      <div className="absolute inset-0 bg-black bg-opacity-70"></div>

      {/* Lumeo Logo (Positioned at the Top Left) */}
      <div className="absolute top-5 left-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center text-white text-2xl z-10 gap-2 sm:gap-0">
        <FaRobot className="text-blue-400 mr-2 hover:text-blue-300 transition" />
        <span className="font-bold mt-2 sm:mt-0">Lumeo AI</span>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center justify-center mt-20 gap-12 px-4 mb-32 sm:mb-0">
        {/* Header Content */}
        <div className="w-full text-white text-center mt-20 sm:mt-0">
          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text mt-10 text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Welcome to Lumeo
          </motion.h1>

          <motion.p
            className="text-xl mb-8 leading-relaxed max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Your personal AI companion for mental wellbeing, emotional support,
            and creative expression — here for you, anytime you need it.
          </motion.p>
        </div>

        {/* Features and Button Section */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-10">
          {/* Left Content - Features */}
          <motion.div
            className="w-full md:w-1/2 text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-6 text-blue-300">
              What Lumeo Offers
            </h2>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="flex flex-col bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                <FaComment className="text-blue-400 mb-3" />
                <span className="font-medium">Supportive Conversation</span>
                <span className="text-sm text-gray-300 mt-1">
                  24/7 confidential companion
                </span>
              </div>
              <div className="flex flex-col bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                <FaBrain className="text-green-400 mb-3" />
                <span className="font-medium">Cognitive Support</span>
                <span className="text-sm text-gray-300 mt-1">
                  CBT-inspired techniques
                </span>
              </div>
              <div className="flex flex-col bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                <FaFilm className="text-red-400 mb-3" />
                <span className="font-medium">Therapeutic Media</span>
                <span className="text-sm text-gray-300 mt-1">
                  Personalized recommendations
                </span>
              </div>
              <div className="flex flex-col bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                <FaPencilAlt className="text-purple-400 mb-3" />
                <span className="font-medium">Creative Expression</span>
                <span className="text-sm text-gray-300 mt-1">
                  Art therapy tools
                </span>
              </div>
            </div>

            <motion.button
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-10 rounded-lg text-xl shadow-lg transition mb-6 w-full"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/chat")}
            >
              Start Your Wellness Journey
            </motion.button>
          </motion.div>

          {/* Right Content - How to use guide */}
          <motion.div
            className="w-full md:w-1/2 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-4 text-white text-center">
                How to Use Lumeo
              </h2>

              {/* Guide carousel */}
              <div className="relative">
                <motion.div
                  key={currentGuideStep}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-gray-800 bg-opacity-50 p-6 rounded-lg min-h-[220px] flex flex-col items-center text-center"
                >
                  {guideSteps[currentGuideStep].icon}
                  <h3 className="text-xl font-medium text-white mb-3">
                    {guideSteps[currentGuideStep].title}
                  </h3>
                  <p className="text-gray-200">
                    {guideSteps[currentGuideStep].description}
                  </p>
                </motion.div>

                {/* Navigation dots */}
                <div className="flex justify-center mt-4 space-x-2">
                  {guideSteps.map((_, index) => (
                    <button
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        index === currentGuideStep
                          ? "bg-blue-500"
                          : "bg-gray-500"
                      }`}
                      onClick={() => setCurrentGuideStep(index)}
                    />
                  ))}
                </div>

                {/* Navigation arrows */}
                <button
                  className="absolute top-1/2 left-0 -translate-y-1/2 -ml-3 bg-gray-800 bg-opacity-70 rounded-full p-2 text-white"
                  onClick={prevGuideStep}
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="absolute top-1/2 right-0 -translate-y-1/2 -mr-3 bg-gray-800 bg-opacity-70 rounded-full p-2 text-white"
                  onClick={nextGuideStep}
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 w-full flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 text-gray-400 z-10">
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

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center">
          <button
            className="absolute top-6 right-6 text-white text-3xl"
            onClick={() => setShowMobileMenu(false)}
          >
            &times;
          </button>
          <div className="flex flex-col gap-6 text-2xl text-white">
            <button onClick={() => navigate("/chat")}>Chat</button>
            <button onClick={() => navigate("/chat?tool=videos")}>
              Wellness Videos
            </button>
            <button onClick={() => navigate("/chat?tool=music")}>Music</button>
            <button onClick={() => navigate("/chat?tool=image")}>
              Image Creation
            </button>
            <button onClick={() => navigate("/chat?tool=canvas")}>
              Creative Canvas
            </button>
            <button onClick={() => navigate("/chat?tool=story")}>
              Story Creator
            </button>
          </div>
        </div>
      )}
      <button
        className="fixed top-4 right-4 z-50 sm:hidden bg-gray-800 p-2 rounded-md"
        onClick={() => setShowMobileMenu(true)}
      >
        <FaBars className="text-white text-2xl" />
      </button>
    </div>
  );
};

export default Login;
