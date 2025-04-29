import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

interface BreathingExerciseProps {
  settings: {
    inhale: number;
    hold: number;
    exhale: number;
    holdAfterExhale: number;
    cycles: number;
  };
  onComplete: () => void;
  onClose?: () => void;
}

// Breathing pattern names
const BREATHING_TECHNIQUES = {
  1: "Calm Breathing",
  2: "Relaxed Breathing",
  3: "Box Breathing",
  4: "4-7-8 Technique",
  5: "Extended Exhale",
};

// Ambient sounds
const AMBIENT_SOUNDS = [
  "/sounds/gentle-waves.mp3", // This would need to exist in public/sounds folder
  "/sounds/forest-ambience.mp3",
  "/sounds/soft-rain.mp3",
];

const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  settings,
  onComplete,
  onClose,
}) => {
  const [phase, setPhase] = useState<
    "inhale" | "hold" | "exhale" | "holdAfterExhale"
  >("inhale");
  const [secondsLeft, setSecondsLeft] = useState(settings.inhale);
  const [cyclesLeft, setCyclesLeft] = useState(settings.cycles);
  const [instruction, setInstruction] = useState("Breathe in...");
  const [detailedInstruction, setDetailedInstruction] = useState(
    "Breathe in deeply through your nose, filling your lungs completely."
  );
  const [isActive, setIsActive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState(0);

  const timer = useRef<number | null>(null);
  const phaseTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine the breathing technique name based on settings
  const getTechniqueName = () => {
    if (settings.hold === 7 && settings.exhale === 8) {
      return "4-7-8 Technique";
    } else if (
      settings.inhale === settings.hold &&
      settings.hold === settings.exhale
    ) {
      return "Box Breathing";
    } else if (settings.exhale > settings.inhale) {
      return "Extended Exhale";
    } else {
      return "Calm Breathing";
    }
  };

  // Handle the breathing animation sequence
  useEffect(() => {
    if (!isActive) return;

    // Set detailed instruction based on current phase
    switch (phase) {
      case "inhale":
        setInstruction("Breathe in...");
        setDetailedInstruction(
          "Breathe in deeply through your nose, filling your lungs completely."
        );
        break;
      case "hold":
        setInstruction("Hold...");
        setDetailedInstruction(
          "Hold your breath gently. Notice the sensation of fullness in your chest."
        );
        break;
      case "exhale":
        setInstruction("Breathe out...");
        setDetailedInstruction(
          "Exhale slowly through your mouth, releasing all tension from your body."
        );
        break;
      case "holdAfterExhale":
        setInstruction("Hold...");
        setDetailedInstruction(
          "Pause before inhaling again. Feel the calm emptiness."
        );
        break;
    }

    // Clear any existing timer
    if (timer.current) {
      window.clearInterval(timer.current);
    }

    // Calculate total phase duration for progress bar
    const phaseDuration =
      phase === "inhale"
        ? settings.inhale
        : phase === "hold"
        ? settings.hold
        : phase === "exhale"
        ? settings.exhale
        : settings.holdAfterExhale;

    // Reset progress at start of phase
    setProgress(0);

    // Set up progress timer to update more frequently
    if (phaseTimer.current) {
      window.clearInterval(phaseTimer.current);
    }

    phaseTimer.current = window.setInterval(() => {
      setProgress((prev) => {
        const increment = 1 / (phaseDuration * 10);
        return Math.min(prev + increment, 1);
      });
    }, 100);

    // Start the timer for the current phase
    timer.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Move to the next phase when timer reaches 0
          switch (phase) {
            case "inhale":
              setPhase("hold");
              return settings.hold;
            case "hold":
              setPhase("exhale");
              return settings.exhale;
            case "exhale":
              if (settings.holdAfterExhale > 0) {
                setPhase("holdAfterExhale");
                return settings.holdAfterExhale;
              }
              // If no hold after exhale, start a new cycle or finish
              setCyclesLeft((prev) => {
                if (prev <= 1) {
                  setIsActive(false);
                  return 0;
                }
                setPhase("inhale");
                return prev - 1;
              });
              return settings.inhale;
            case "holdAfterExhale":
              // Start a new cycle or finish
              setCyclesLeft((prev) => {
                if (prev <= 1) {
                  setIsActive(false);
                  return 0;
                }
                setPhase("inhale");
                return prev - 1;
              });
              return settings.inhale;
            default:
              return prev;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
      }
      if (phaseTimer.current) {
        window.clearInterval(phaseTimer.current);
      }
    };
  }, [phase, isActive, settings]);

  // Call onComplete when exercise finishes
  useEffect(() => {
    if (cyclesLeft === 0) {
      onComplete();
    }
  }, [cyclesLeft, onComplete]);

  // Manage audio
  useEffect(() => {
    // This would play the ambient sound if the files were available
    // In a real app, you'd include these audio files in the public directory
    if (!isMuted && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current
        .play()
        .catch((err) => console.log("Audio playback prevented:", err));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isMuted, selectedBackground]);

  // Calculate the circle size based on the phase
  const circleVariants = {
    inhale: {
      scale: 1.5,
      opacity: 0.8,
      boxShadow: "0 0 30px rgba(66, 153, 225, 0.7)",
      transition: { duration: settings.inhale, ease: "easeInOut" },
    },
    hold: {
      scale: 1.5,
      opacity: 0.8,
      boxShadow: "0 0 30px rgba(66, 153, 225, 0.7)",
      transition: { duration: settings.hold, ease: "linear" },
    },
    exhale: {
      scale: 1,
      opacity: 0.6,
      boxShadow: "0 0 15px rgba(66, 153, 225, 0.3)",
      transition: { duration: settings.exhale, ease: "easeInOut" },
    },
    holdAfterExhale: {
      scale: 1,
      opacity: 0.6,
      boxShadow: "0 0 15px rgba(66, 153, 225, 0.3)",
      transition: { duration: settings.holdAfterExhale, ease: "linear" },
    },
  };

  const handleSkip = () => {
    setIsActive(false);
    if (onClose) {
      onClose();
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <audio ref={audioRef} src={AMBIENT_SOUNDS[selectedBackground]} loop />

      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-8 max-w-md w-full flex flex-col items-center shadow-2xl">
        <div className="flex justify-between w-full mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Breathing Exercise
            </h2>
            <div className="text-blue-300 text-sm">{getTechniqueName()}</div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>

            {onClose && (
              <button
                onClick={() => {
                  setIsActive(false);
                  onClose();
                }}
                className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-center mb-8">
          {/* Outer static circle */}
          <div className="absolute w-64 h-64 rounded-full border-2 border-blue-400 opacity-30"></div>

          {/* Progress indicator */}
          <svg className="absolute w-64 h-64" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(66, 153, 225, 0.2)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(66, 153, 225, 0.8)"
              strokeWidth="3"
              strokeDasharray="301.6"
              strokeDashoffset={301.6 * (1 - progress)}
              transform="rotate(-90 50 50)"
            />
          </svg>

          {/* Animated breathing circle */}
          <motion.div
            className="w-48 h-48 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center"
            variants={circleVariants}
            animate={phase}
          >
            <div className="text-white text-2xl font-medium">{secondsLeft}</div>
          </motion.div>
        </div>

        <div className="text-xl text-white mb-2 font-bold">{instruction}</div>
        <div className="text-gray-300 text-center mb-6 px-4">
          {detailedInstruction}
        </div>

        <div className="flex items-center bg-gray-800 rounded-lg p-3 mb-5">
          <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse mr-3"></div>
          <div>
            <div className="text-white">Cycles remaining: {cyclesLeft}</div>
            <div className="text-xs text-gray-400">
              Pattern: {settings.inhale}-{settings.hold}-{settings.exhale}
              {settings.holdAfterExhale > 0
                ? `-${settings.holdAfterExhale}`
                : ""}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSkip}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => {
              // In a real app, you'd cycle through available sounds
              setSelectedBackground(
                (selectedBackground + 1) % AMBIENT_SOUNDS.length
              );
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Change Sound
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreathingExercise;
