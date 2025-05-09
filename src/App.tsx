import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import MainPage from "./components/MainPage";
import MovieGenerator from "./components/MovieGenerator";
import Chat from "./components/Chat";
import DrawingCanvas from "./components/DrawingCanvas";
import MusicPage from "./components/MusicPage";
import SimpleVideoPlayer from "./components/SimpleVideoPlayer";
import "./index.css";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/main" element={<Chat />} />
        <Route path="/movies" element={<MainPage />} />
        <Route path="/music" element={<MusicPage />} />
        <Route path="/wellness-videos" element={<SimpleVideoPlayer />} />
        <Route path="/generate-movies" element={<MovieGenerator />} />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/canvas"
          element={
            <DrawingCanvas onClose={() => window.location.replace("/main")} />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
