/**
 * Hangar Screen - Pilot and outfit selection before playing.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getEffectivePerkValue } from "../lib/gacha";
import type { Pilot, Outfit, OwnedOutfit } from "../types";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";

export default function HangarScreen() {
  const navigate = useNavigate();
  const { save, selectPilot, selectOutfit } = useGame();

  const pilots = pilotsData as Pilot[];
  const allOutfits = outfitsData as Outfit[];

  // Only show owned outfits
  const ownedOutfitMap = new Map<string, OwnedOutfit>();
  save.ownedOutfits.forEach((o) => ownedOutfitMap.set(o.outfitId, o));

  const ownedOutfits = allOutfits.filter((o) => ownedOutfitMap.has(o.id));

  const selectedPilot = pilots.find((p) => p.id === save.selectedPilotId);
  const selectedOutfit = allOutfits.find((o) => o.id === save.selectedOutfitId);
  const selectedOwned = save.selectedOutfitId
    ? ownedOutfitMap.get(save.selectedOutfitId)
    : undefined;

  return (
    <div className="screen hangar-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Hangar</h2>
      </div>

      {/* Pilot selection */}
      <section className="hangar-section">
        <h3>Select Pilot</h3>
        <div className="card-grid">
          {pilots.map((pilot) => (
            <div
              key={pilot.id}
              className={`card pilot-card ${pilot.id === save.selectedPilotId ? "selected" : ""}`}
              onClick={() => selectPilot(pilot.id)}
            >
              {/* Placeholder art - hook for future images */}
              <div
                className="card-art"
                style={{ background: pilot.artPlaceholder }}
              >
                <span className="card-art-label">{pilot.name}</span>
              </div>
              <div className="card-info">
                <strong>{pilot.name}</strong>
                <div className="stats-row">
                  <span>ACC {pilot.stats.accuracy}</span>
                  <span>RHY {pilot.stats.rhythm}</span>
                  <span>END {pilot.stats.endurance}</span>
                </div>
                <div className="perk-label">{pilot.perk.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Outfit selection */}
      <section className="hangar-section">
        <h3>Select Outfit</h3>
        <div className="card-grid">
          {ownedOutfits.map((outfit) => {
            const owned = ownedOutfitMap.get(outfit.id)!;
            const perkVal = getEffectivePerkValue(outfit, owned.stars);
            return (
              <div
                key={outfit.id}
                className={`card outfit-card rarity-${outfit.rarity.toLowerCase()} ${
                  outfit.id === save.selectedOutfitId ? "selected" : ""
                }`}
                onClick={() => selectOutfit(outfit.id)}
              >
                <div
                  className="card-art"
                  style={{ background: outfit.artPlaceholder }}
                >
                  <span className="card-art-label">{outfit.name}</span>
                </div>
                <div className="card-info">
                  <strong>{outfit.name}</strong>
                  <div className="star-display">{"★".repeat(owned.stars)}{"☆".repeat(5 - owned.stars)}</div>
                  <div className="rarity-badge">{outfit.rarity}</div>
                  <div className="perk-label">
                    {outfit.perk.label.replace("{v}", String(perkVal))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {ownedOutfits.length === 0 && (
          <p className="empty-msg">No outfits owned. Visit the Shop!</p>
        )}
      </section>

      {/* Summary and proceed */}
      <div className="hangar-summary">
        <div className="summary-item">
          <strong>Pilot:</strong> {selectedPilot?.name ?? "None"}
        </div>
        <div className="summary-item">
          <strong>Outfit:</strong> {selectedOutfit?.name ?? "None"}
          {selectedOwned && ` (${selectedOwned.stars}★)`}
        </div>
        <button
          className="btn btn-primary btn-large"
          onClick={() => navigate("/tracks")}
          disabled={!save.selectedPilotId}
        >
          Select Track →
        </button>
      </div>
    </div>
  );
}
