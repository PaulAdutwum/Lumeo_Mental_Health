import React, { useEffect, useState } from "react";

const streakMessages = [
  "Welcome! Start your wellness journey today.",
  "Great job! 2 days in a row!",
  "Amazing! 3 days of consistency!",
  "You're on fire! 4 days streak!",
  "Incredible! 5 days and counting!",
  "Legendary! Keep it going!",
];

function getStreakMessage(streak: number) {
  if (streak <= 0) return streakMessages[0];
  if (streak < streakMessages.length) return streakMessages[streak];
  return `🔥 ${streak} day streak! You're unstoppable!`;
}

const StreakBanner: React.FC = () => {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastActive = localStorage.getItem("lastActiveDate");
    let currentStreak = Number(localStorage.getItem("streak") || 0);

    if (lastActive !== today) {
      // If last active was yesterday, increment streak
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastActive === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // Reset streak
      }
      localStorage.setItem("streak", String(currentStreak));
      localStorage.setItem("lastActiveDate", today);
    }
    setStreak(currentStreak);
  }, []);

  return (
    <div
      style={{
        margin: "1rem 0",
        padding: "1rem",
        background: "#f0f4ff",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <h2>
        Streak: {streak} {streak === 1 ? "day" : "days"}
      </h2>
      <p>{getStreakMessage(streak)}</p>
    </div>
  );
};

export default StreakBanner;
