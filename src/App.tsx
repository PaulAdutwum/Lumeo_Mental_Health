import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Login from "./components/Login";
import Signup from "./components/Signup";
import MainPage from "./components/MainPage";
import MovieGenerator from "./components/MovieGenerator";
import Chat from "./components/Chat";
import MusicPage from "./components/MusicPage";
import SimpleVideoPlayer from "./components/SimpleVideoPlayer"; // ← your search page
import "./index.css";

// “Canvas coming soon” stub
const CanvasComingSoon = () => {
  const navigate = useNavigate();
  useEffect(() => {
    alert(
      "Drawing Canvas coming soon! This feature is currently under development."
    );
    navigate("/main");
  }, [navigate]);
  return null;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public/Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main SPA routes */}
      <Route path="/main" element={<Chat />} />
      <Route path="/movies" element={<MainPage />} />
      <Route path="/music" element={<MusicPage />} />
      <Route path="/wellness-videos" element={<SimpleVideoPlayer />} />
      <Route path="/generate-movies" element={<MovieGenerator />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/canvas" element={<CanvasComingSoon />} />

      {/* Catch-all: redirect anything else to /main */}
      <Route path="*" element={<Navigate to="/main" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
