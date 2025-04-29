import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaSmile, FaMeh, FaFrown, FaSadTear, FaGrinBeam } from "react-icons/fa";
import { auth } from "./firebase";

interface MoodEntry {
  id: string;
  timestamp: Date;
  mood: "verySad" | "sad" | "neutral" | "happy" | "veryHappy";
  intensity: number;
  notes?: string;
}

interface MoodTrackerProps {
  onClose: () => void;
  onSave: (moodData: Omit<MoodEntry, "id">) => void;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ onClose, onSave }) => {
  const [selectedMood, setSelectedMood] = useState<MoodEntry["mood"] | null>(
    null
  );
  const [moodIntensity, setMoodIntensity] = useState(5);
  const [notes, setNotes] = useState("");
  const [gratitudePoints, setGratitudePoints] = useState(["", "", ""]);
  const [showGratitude, setShowGratitude] = useState(false);

  // Mood options with icon, label, and color
  const moodOptions = [
    {
      value: "verySad",
      icon: <FaSadTear size={28} />,
      label: "Very Sad",
      color: "bg-red-500",
    },
    {
      value: "sad",
      icon: <FaFrown size={28} />,
      label: "Sad",
      color: "bg-orange-500",
    },
    {
      value: "neutral",
      icon: <FaMeh size={28} />,
      label: "Neutral",
      color: "bg-yellow-500",
    },
    {
      value: "happy",
      icon: <FaSmile size={28} />,
      label: "Happy",
      color: "bg-green-500",
    },
    {
      value: "veryHappy",
      icon: <FaGrinBeam size={28} />,
      label: "Very Happy",
      color: "bg-blue-500",
    },
  ];

  // When positive mood is selected, show gratitude section
  useEffect(() => {
    if (selectedMood === "happy" || selectedMood === "veryHappy") {
      setShowGratitude(true);
    } else {
      setShowGratitude(false);
    }
  }, [selectedMood]);

  const handleGratitudeChange = (index: number, value: string) => {
    const newPoints = [...gratitudePoints];
    newPoints[index] = value;
    setGratitudePoints(newPoints);
  };

  const handleSubmit = () => {
    if (!selectedMood) return;

    // Format notes with gratitude points if available
    let fullNotes = notes;
    if (showGratitude && gratitudePoints.some((point) => point.trim() !== "")) {
      fullNotes += "\n\nThings I am grateful for today:\n";
      gratitudePoints.forEach((point, index) => {
        if (point.trim() !== "") {
          fullNotes += `${index + 1}. ${point}\n`;
        }
      });
    }

    // Create mood entry
    const moodEntry: Omit<MoodEntry, "id"> = {
      timestamp: new Date(),
      mood: selectedMood,
      intensity: moodIntensity,
      notes: fullNotes.trim(),
    };

    onSave(moodEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <motion.div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          How are you feeling today?
        </h2>

        {/* Mood selection */}
        <div className="flex justify-between mb-8">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedMood(option.value as MoodEntry["mood"])}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                selectedMood === option.value
                  ? `${option.color} text-white scale-110`
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <div className="mb-2">{option.icon}</div>
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <>
            {/* Intensity slider */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">
                Intensity (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={moodIntensity}
                onChange={(e) => setMoodIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-gray-400 text-sm mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            {/* Gratitude section (only for positive moods) */}
            {showGratitude && (
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Three things you're grateful for today (optional)
                </label>
                {gratitudePoints.map((point, index) => (
                  <input
                    key={index}
                    type="text"
                    value={point}
                    onChange={(e) =>
                      handleGratitudeChange(index, e.target.value)
                    }
                    placeholder={`Gratitude ${index + 1}`}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedMood}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedMood
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MoodTracker;
