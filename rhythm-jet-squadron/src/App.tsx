/**
 * App root - sets up React Router and GameProvider.
 */

import { BrowserRouter, HashRouter, Navigate, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import HomeScreen from "./screens/HomeScreen";
import HangarScreen from "./screens/HangarScreen";
import ShmupPlayScreen from "./screens/ShmupPlayScreen";
import ShmupResultsScreen from "./screens/ShmupResultsScreen";
import ShopScreen from "./screens/ShopScreen";
import CollectionScreen from "./screens/CollectionScreen";
import SettingsScreen from "./screens/SettingsScreen";

export default function App() {
  const Router = typeof window !== "undefined" && window.location.protocol === "file:"
    ? HashRouter
    : BrowserRouter;

  return (
    <GameProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/hangar" element={<HangarScreen />} />
            <Route path="/tracks" element={<Navigate to="/hangar" replace />} />
            <Route path="/play/:trackId" element={<Navigate to="/hangar" replace />} />
            <Route path="/shmup" element={<ShmupPlayScreen />} />
            <Route path="/shmup-results" element={<ShmupResultsScreen />} />
            <Route path="/results" element={<Navigate to="/hangar" replace />} />
            <Route path="/shop" element={<ShopScreen />} />
            <Route path="/collection" element={<CollectionScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  );
}
