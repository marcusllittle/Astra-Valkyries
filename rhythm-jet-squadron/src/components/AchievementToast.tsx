/**
 * AchievementToast — slides in from the top when a new achievement is unlocked.
 */

import { useEffect, useState } from "react";
import type { Achievement } from "../lib/achievements";

interface AchievementToastProps {
  achievement: Achievement;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const hideTimer = setTimeout(() => setVisible(false), 3500);
    const doneTimer = setTimeout(onDone, 4000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`achievement-toast ${visible ? "achievement-toast-visible" : ""}`}>
      <span className="achievement-toast-orbit" aria-hidden="true" />
      <span className="achievement-toast-icon">{achievement.icon}</span>
      <div className="achievement-toast-text">
        <span className="achievement-toast-kicker">Achievement Unlocked</span>
        <strong>{achievement.title}</strong>
        <span>{achievement.description}</span>
      </div>
    </div>
  );
}
