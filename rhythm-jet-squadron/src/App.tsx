/**
 * App root - sets up React Router and GameProvider.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import HomeScreen from "./screens/HomeScreen";
import HangarScreen from "./screens/HangarScreen";
import TrackSelectScreen from "./screens/TrackSelectScreen";
import PlayScreen from "./screens/PlayScreen";
import ResultsScreen from "./screens/ResultsScreen";
import ShopScreen from "./screens/ShopScreen";
import CollectionScreen from "./screens/CollectionScreen";
import SettingsScreen from "./screens/SettingsScreen";

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/hangar" element={<HangarScreen />} />
            <Route path="/tracks" element={<TrackSelectScreen />} />
            <Route path="/play/:trackId" element={<PlayScreen />} />
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="/shop" element={<ShopScreen />} />
            <Route path="/collection" element={<CollectionScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GameProvider>
  );
}
