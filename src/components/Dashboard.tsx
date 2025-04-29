import React, { useState, useEffect } from "react";
import {
  FaChartBar,
  FaImage,
  FaComment,
  FaCalendarAlt,
  FaSmile,
  FaHeart,
} from "react-icons/fa";
import db from "../services/database";
import { useNavigate } from "react-router-dom";

// Define types for chat messages, media assets, and mood entries
interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  emotion?: string;
  timestamp: any; // Firestore timestamp
}

interface MediaAsset {
  id: string;
  user_id: string;
  url: string;
  type: string;
  emotion?: string;
  created_at: any; // Firestore timestamp
}

interface MoodEntry {
  id: string;
  user_id: string;
  emotion: string;
  entry_time: any; // Firestore timestamp
}

interface AnalyticsData {
  totalImages: number;
  totalChats: number;
  totalMoodEntries: number;
  mostFrequentEmotion: string;
  mostLikedMediaType: string;
  usageByDate: {
    dates: string[];
    counts: number[];
  };
  emotionDistribution: {
    labels: string[];
    data: number[];
  };
}

const Dashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalImages: 0,
    totalChats: 0,
    totalMoodEntries: 0,
    mostFrequentEmotion: "",
    mostLikedMediaType: "therapeutic",
    usageByDate: {
      dates: [],
      counts: [],
    },
    emotionDistribution: {
      labels: [],
      data: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);

        // Fetch data from our database service
        const chatMessages: ChatMessage[] = await db.getUserChatMessages();
        const mediaAssets: MediaAsset[] = await db.getUserMediaAssets();
        const moodEntries: MoodEntry[] = await db.getUserMoodEntries();

        // Count emotions from chat messages
        const emotionCounts: Record<string, number> = {};
        chatMessages.forEach((msg: ChatMessage) => {
          if (msg.emotion) {
            emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
          }
        });

        // Find most frequent emotion
        let mostFrequentEmotion = "";
        let maxCount = 0;

        Object.entries(emotionCounts).forEach(([emotion, count]) => {
          if (count > maxCount) {
            mostFrequentEmotion = emotion;
            maxCount = count;
          }
        });

        // Calculate usage by date (last 7 days)
        const last7Days: Date[] = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const formattedDates: string[] = last7Days.map((date) => {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        });

        const activityByDate: Record<string, number> = {};
        formattedDates.forEach((date) => {
          activityByDate[date] = 0;
        });

        // Count activities by date
        const allActivities = [
          ...chatMessages.map((msg) => ({ date: msg.timestamp, type: "chat" })),
          ...mediaAssets.map((asset) => ({
            date: asset.created_at,
            type: "media",
          })),
          ...moodEntries.map((entry) => ({
            date: entry.entry_time,
            type: "mood",
          })),
        ];

        allActivities.forEach((activity) => {
          if (activity.date) {
            const activityDate = activity.date.toDate
              ? activity.date.toDate()
              : new Date(activity.date);
            const formattedDate = activityDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            if (activityByDate[formattedDate] !== undefined) {
              activityByDate[formattedDate]++;
            }
          }
        });

        // Prepare data for the analytics state
        setAnalytics({
          totalImages: mediaAssets.length,
          totalChats: chatMessages.length,
          totalMoodEntries: moodEntries.length,
          mostFrequentEmotion,
          mostLikedMediaType: "therapeutic", // Default or calculate from feedback
          usageByDate: {
            dates: Object.keys(activityByDate),
            counts: Object.values(activityByDate),
          },
          emotionDistribution: {
            labels: Object.keys(emotionCounts),
            data: Object.values(emotionCounts),
          },
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        setError("Failed to load analytics. Please try again later.");
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Generate chart data for emotions
  const renderEmotionChart = () => {
    const emotions = analytics.emotionDistribution;
    const totalEmotions = Object.values(emotions.data).reduce(
      (sum, count) => sum + count,
      0
    );

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Emotion Distribution</h3>
        <div className="bg-gray-800 rounded-lg p-4">
          {emotions.labels.map((emotion, index) => {
            const percentage = totalEmotions
              ? Math.round((emotions.data[index] / totalEmotions) * 100)
              : 0;
            const getEmotionColor = (emotion: string) => {
              const colorMap: Record<string, string> = {
                joy: "bg-green-500",
                anxiety: "bg-yellow-500",
                sadness: "bg-blue-500",
                anger: "bg-red-500",
                fear: "bg-purple-500",
                neutral: "bg-gray-500",
              };
              return colorMap[emotion.toLowerCase()] || "bg-gray-500";
            };

            return (
              <div key={emotion} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{emotion}</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getEmotionColor(emotion)}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Generate chart for usage by date
  const renderUsageChart = () => {
    // Get last 7 days
    const dates: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const dateString = date.toISOString().split("T")[0];

      dates.push(formattedDate);
      data.push(analytics.usageByDate.counts[i] || 0);
    }

    const maxValue = Math.max(...data, 1);

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Activity Last 7 Days</h3>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-end justify-between h-32">
            {data.map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex-1 w-10 flex items-end">
                  <div
                    className="w-6 bg-blue-500 rounded-t"
                    style={{
                      height: `${(value / maxValue) * 100}%`,
                      minHeight: value > 0 ? "4px" : "0",
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{dates[index]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg text-white">
            {error}
          </div>
          <button
            onClick={() => navigate("/chat")}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <button
            onClick={() => navigate("/chat")}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            Back to Chat
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`py-2 px-4 ${
              activeTab === "overview"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === "emotions"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("emotions")}
          >
            Emotions
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === "usage"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("usage")}
          >
            Usage
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaComment className="text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold">Chat Messages</h3>
                </div>
                <p className="text-3xl">{analytics.totalChats}</p>
                <p className="text-gray-400 text-sm mt-1">Total interactions</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaImage className="text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold">Images Created</h3>
                </div>
                <p className="text-3xl">{analytics.totalImages}</p>
                <p className="text-gray-400 text-sm mt-1">Generated images</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaSmile className="text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold">Mood Entries</h3>
                </div>
                <p className="text-3xl">{analytics.totalMoodEntries}</p>
                <p className="text-gray-400 text-sm mt-1">Logged moods</p>
              </div>
            </div>

            {/* Emotion Distribution Chart */}
            {renderEmotionChart()}

            {/* Usage Chart */}
            {renderUsageChart()}
          </>
        )}

        {/* Emotions Tab */}
        {activeTab === "emotions" && (
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Emotional Insights</h3>
              <p className="text-gray-300">
                Your most frequent emotion:{" "}
                <span className="font-semibold capitalize">
                  {analytics.mostFrequentEmotion}
                </span>
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Based on{" "}
                {Object.values(analytics.emotionDistribution.data).reduce(
                  (sum, count) => sum + count,
                  0
                )}{" "}
                emotional data points
              </p>
            </div>

            {renderEmotionChart()}

            <div className="bg-gray-800 rounded-lg p-4 mt-6">
              <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
              <div className="border-l-2 border-blue-500 pl-4">
                <p className="text-gray-300">
                  {analytics.mostFrequentEmotion === "anxiety" &&
                    "Based on your emotion patterns, you might benefit from more breathing exercises and calming visualization."}
                  {analytics.mostFrequentEmotion === "sadness" &&
                    "Your emotional patterns show more sadness. Consider trying mood-boosting activities and hopeful visualizations."}
                  {analytics.mostFrequentEmotion === "anger" &&
                    "Your patterns show more anger. Try cooling visualizations and emotion processing through journaling."}
                  {analytics.mostFrequentEmotion === "joy" &&
                    "Your emotional patterns indicate frequent joy. That's wonderful! Continue with activities that maintain this positivity."}
                  {analytics.mostFrequentEmotion === "neutral" ||
                    (!analytics.mostFrequentEmotion &&
                      "Your emotions appear balanced. Continue monitoring your mood to gain more insights.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === "usage" && (
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Your Activity</h3>
              <p className="text-gray-300">
                You've created{" "}
                <span className="font-semibold">{analytics.totalImages}</span>{" "}
                images and had{" "}
                <span className="font-semibold">{analytics.totalChats}</span>{" "}
                chat interactions.
              </p>
            </div>

            {renderUsageChart()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Most Used Features
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Chat</span>
                    <span>
                      {Math.round(
                        (analytics.totalChats /
                          (analytics.totalChats +
                            analytics.totalImages +
                            analytics.totalMoodEntries)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Image Generation</span>
                    <span>
                      {Math.round(
                        (analytics.totalImages /
                          (analytics.totalChats +
                            analytics.totalImages +
                            analytics.totalMoodEntries)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mood Tracking</span>
                    <span>
                      {Math.round(
                        (analytics.totalMoodEntries /
                          (analytics.totalChats +
                            analytics.totalImages +
                            analytics.totalMoodEntries)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">
                  Most Liked Content
                </h3>
                <p className="text-gray-300">
                  You've shown the most interest in{" "}
                  <span className="font-semibold">
                    {analytics.mostLikedMediaType}
                  </span>{" "}
                  content.
                </p>
                <p className="text-gray-400 text-sm mt-4">
                  Continue using the app to generate more personalized insights.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
