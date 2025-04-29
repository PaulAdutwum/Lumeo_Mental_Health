import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaTimes,
  FaChartLine,
  FaSadTear,
  FaFrown,
  FaMeh,
  FaSmile,
  FaGrinBeam,
} from "react-icons/fa";
import { getRecentMoodEntries, getMoodStats } from "../services/moodTracking";
import type { MoodEntry } from "../services/moodTracking";

interface MoodHistoryProps {
  onClose: () => void;
}

const MoodHistory: React.FC<MoodHistoryProps> = ({ onClose }) => {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [stats, setStats] = useState<{
    mostFrequentMood: string;
    averageIntensity: number;
    moodCounts: Record<string, number>;
    moodTrend: "improving" | "worsening" | "stable";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  // Load mood data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get entries and stats
        const entries = await getRecentMoodEntries(50);

        let days = 7;
        if (timeRange === "month") days = 30;
        if (timeRange === "year") days = 365;

        const moodStats = await getMoodStats(days);

        setMoodEntries(entries);
        setStats(moodStats);
      } catch (error) {
        console.error("Error fetching mood data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  // Get mood icon
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "verySad":
        return <FaSadTear className="text-red-500" />;
      case "sad":
        return <FaFrown className="text-orange-500" />;
      case "neutral":
        return <FaMeh className="text-yellow-500" />;
      case "happy":
        return <FaSmile className="text-green-500" />;
      case "veryHappy":
        return <FaGrinBeam className="text-blue-500" />;
      default:
        return <FaMeh className="text-gray-500" />;
    }
  };

  // Format mood name for display
  const formatMoodName = (mood: string): string => {
    const nameMap: Record<string, string> = {
      verySad: "Very Sad",
      sad: "Sad",
      neutral: "Neutral",
      happy: "Happy",
      veryHappy: "Very Happy",
    };

    return nameMap[mood] || mood;
  };

  // Get color for mood trend
  const getTrendColor = () => {
    if (!stats) return "text-gray-400";

    switch (stats.moodTrend) {
      case "improving":
        return "text-green-500";
      case "worsening":
        return "text-red-500";
      default:
        return "text-blue-400";
    }
  };

  // Get descriptive text for mood trend
  const getTrendText = () => {
    if (!stats) return "Not enough data";

    switch (stats.moodTrend) {
      case "improving":
        return "Your mood appears to be improving";
      case "worsening":
        return "Your mood appears to be declining";
      default:
        return "Your mood appears stable";
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <motion.div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <FaChartLine className="mr-2" />
            Mood History
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FaTimes className="text-gray-400" />
          </button>
        </div>

        {/* Time range selector */}
        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            className={`flex-1 py-2 rounded-md transition-colors ${
              timeRange === "week"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => setTimeRange("week")}
          >
            Week
          </button>
          <button
            className={`flex-1 py-2 rounded-md transition-colors ${
              timeRange === "month"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => setTimeRange("month")}
          >
            Month
          </button>
          <button
            className={`flex-1 py-2 rounded-md transition-colors ${
              timeRange === "year"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => setTimeRange("year")}
          >
            Year
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Mood summary */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-gray-400 text-sm mb-1">
                    Most Common Mood
                  </h3>
                  <div className="flex items-center text-lg font-semibold">
                    {getMoodIcon(stats.mostFrequentMood)}
                    <span className="ml-2">
                      {formatMoodName(stats.mostFrequentMood)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-gray-400 text-sm mb-1">
                    Average Intensity
                  </h3>
                  <div className="text-lg font-semibold">
                    {stats.averageIntensity.toFixed(1)}/10
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-gray-400 text-sm mb-1">Trend</h3>
                  <div className={`text-lg font-semibold ${getTrendColor()}`}>
                    {getTrendText()}
                  </div>
                </div>
              </div>
            )}

            {/* Mood distribution */}
            {stats &&
              stats.moodCounts &&
              Object.keys(stats.moodCounts).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Mood Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.moodCounts)
                      .sort(([moodA], [moodB]) => {
                        const moodOrder = [
                          "verySad",
                          "sad",
                          "neutral",
                          "happy",
                          "veryHappy",
                        ];
                        return (
                          moodOrder.indexOf(moodA) - moodOrder.indexOf(moodB)
                        );
                      })
                      .map(([mood, count]) => {
                        const total = Object.values(stats.moodCounts).reduce(
                          (sum, c) => sum + c,
                          0
                        );
                        const percentage = Math.round((count / total) * 100);

                        let barColor = "bg-gray-500";
                        if (mood === "verySad") barColor = "bg-red-500";
                        if (mood === "sad") barColor = "bg-orange-500";
                        if (mood === "neutral") barColor = "bg-yellow-500";
                        if (mood === "happy") barColor = "bg-green-500";
                        if (mood === "veryHappy") barColor = "bg-blue-500";

                        return (
                          <div key={mood}>
                            <div className="flex justify-between mb-1">
                              <div className="flex items-center">
                                {getMoodIcon(mood)}
                                <span className="ml-2 text-gray-300">
                                  {formatMoodName(mood)}
                                </span>
                              </div>
                              <span className="text-gray-400">
                                {count} entries ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`${barColor} h-2.5 rounded-full`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Recent entries */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Recent Entries
              </h3>

              {moodEntries.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No mood entries yet. Start tracking your mood to see your
                  history here.
                </p>
              ) : (
                <div className="space-y-4">
                  {moodEntries.map((entry) => (
                    <div key={entry.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          {getMoodIcon(entry.mood)}
                          <div className="ml-3">
                            <h4 className="font-medium text-white">
                              {formatMoodName(entry.mood)}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              Intensity: {entry.intensity}/10
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">
                          {entry.timestamp.toLocaleDateString()} at{" "}
                          {entry.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {entry.notes && (
                        <div className="mt-3 pl-8">
                          <p className="text-gray-300 whitespace-pre-line">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default MoodHistory;
