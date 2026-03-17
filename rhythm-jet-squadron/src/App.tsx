/**
 * App root - sets up React Router and GameProvider.
 */

import { BrowserRouter, HashRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { GameProvider, useGame } from "./context/GameContext";
import { WalletProvider } from "./context/WalletContext";
import HomeScreen from "./screens/HomeScreen";
import HangarScreen from "./screens/HangarScreen";
import ShmupPlayScreen from "./screens/ShmupPlayScreen";
import ShmupResultsScreen from "./screens/ShmupResultsScreen";
import ShopScreen from "./screens/ShopScreen";
import CollectionScreen from "./screens/CollectionScreen";
import SettingsScreen from "./screens/SettingsScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import AchievementToast from "./components/AchievementToast";

function AchievementLayer() {
  const { pendingAchievement, dismissAchievement } = useGame();
  const location = useLocation();

  // Suppress achievement toasts during active gameplay — they're distracting
  // and pop up repeatedly. Achievements still unlock; toast shows after the run.
  if (location.pathname === "/shmup") return null;

  if (!pendingAchievement) return null;
  return (
    <AchievementToast
      key={pendingAchievement.id}
      achievement={pendingAchievement}
      onDone={dismissAchievement}
    />
  );
}

export default function App() {
  const Router = typeof window !== "undefined" && window.location.protocol === "file:"
    ? HashRouter
    : BrowserRouter;

  return (
    <WalletProvider>
    <GameProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/hangar" element={<HangarScreen />} />
            <Route path="/shmup" element={<ShmupPlayScreen />} />
            <Route path="/shmup-results" element={<ShmupResultsScreen />} />
            <Route path="/shop" element={<ShopScreen />} />
            <Route path="/collection" element={<CollectionScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/leaderboard" element={<LeaderboardScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AchievementLayer />
        </div>
      </Router>
    </GameProvider>
    </WalletProvider>
  );
}
