/**
 * Collection Screen - View all owned outfits with details, upgrade with shards.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getEffectivePerkValue, canUpgrade, SHARD_THRESHOLDS } from "../lib/gacha";
import type { Outfit, OwnedOutfit } from "../types";
import outfitsData from "../data/outfits.json";

const RARITY_COLORS: Record<string, string> = {
  Common: "#a8a8a8",
  Rare: "#339af0",
  SR: "#be4bdb",
  SSR: "#ffd43b",
};

export default function CollectionScreen() {
  const navigate = useNavigate();
  const { save, upgradeOutfit } = useGame();

  const allOutfits = outfitsData as Outfit[];
  const ownedMap = new Map<string, OwnedOutfit>();
  save.ownedOutfits.forEach((o) => ownedMap.set(o.outfitId, o));

  const ownedOutfits = allOutfits
    .filter((o) => ownedMap.has(o.id))
    .map((o) => ({ outfit: o, owned: ownedMap.get(o.id)! }));

  return (
    <div className="screen collection-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Collection ({ownedOutfits.length}/{allOutfits.length})</h2>
      </div>

      <div className="card-grid">
        {ownedOutfits.map(({ outfit, owned }) => {
          const perkVal = getEffectivePerkValue(outfit, owned.stars);
          const upgradable = canUpgrade(owned);
          const nextThreshold =
            owned.stars < 5 ? SHARD_THRESHOLDS[owned.stars + 1] : null;

          return (
            <div
              key={outfit.id}
              className={`card outfit-card rarity-${outfit.rarity.toLowerCase()}`}
            >
              <div
                className="card-art"
                style={{ background: outfit.artPlaceholder }}
              >
                <span className="card-art-label">{outfit.name}</span>
              </div>
              <div className="card-info">
                <strong>{outfit.name}</strong>
                <span
                  className="rarity-text"
                  style={{ color: RARITY_COLORS[outfit.rarity] }}
                >
                  {outfit.rarity}
                </span>
                <div className="star-display">
                  {"★".repeat(owned.stars)}{"☆".repeat(5 - owned.stars)}
                </div>
                <div className="perk-label">
                  {outfit.perk.label.replace("{v}", String(perkVal))}
                </div>
                {nextThreshold && (
                  <div className="shard-progress">
                    Shards: {owned.shards}/{nextThreshold}
                  </div>
                )}
                {upgradable && (
                  <button
                    className="btn btn-upgrade"
                    onClick={() => upgradeOutfit(outfit.id)}
                  >
                    ★ Upgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ownedOutfits.length === 0 && (
        <p className="empty-msg">No outfits yet. Visit the Shop to pull!</p>
      )}
    </div>
  );
}
