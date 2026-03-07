/**
 * Collection Screen - View all owned outfits with details, upgrade with shards.
 * Sorted by pilot with filter tabs for easy browsing.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { canUpgrade, SHARD_THRESHOLDS } from "../lib/gacha";
import { summarizeOutfitKit } from "../lib/outfitKits";
import CardArt from "../components/CardArt";
import type { Outfit, OwnedOutfit, Pilot } from "../types";
import outfitsData from "../data/outfits.json";
import pilotsData from "../data/pilots.json";

const RARITY_COLORS: Record<string, string> = {
  Common: "#a8a8a8",
  Rare: "#339af0",
  SR: "#be4bdb",
  SSR: "#ffd43b",
};

const RARITY_ORDER: Record<string, number> = {
  SSR: 0,
  SR: 1,
  Rare: 2,
  Common: 3,
};

type FilterTab = "all" | string;

export default function CollectionScreen() {
  const navigate = useNavigate();
  const { save, upgradeOutfit } = useGame();
  const [previewOutfitId, setPreviewOutfitId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const allOutfits = outfitsData as Outfit[];
  const pilots = pilotsData as Pilot[];
  const pilotNameById = new Map(pilots.map((pilot) => [pilot.id, pilot.name]));
  const ownedMap = new Map<string, OwnedOutfit>();
  save.ownedOutfits.forEach((o) => ownedMap.set(o.outfitId, o));

  const ownedCount = allOutfits.filter((outfit) => ownedMap.has(outfit.id)).length;

  // Filter and sort: by pilot, then owned first, then rarity
  const filteredOutfits = useMemo(() => {
    let list = allOutfits;
    if (activeFilter !== "all") {
      list = list.filter((outfit) => outfit.pilotId === activeFilter);
    }
    return [...list].sort((a, b) => {
      const aOwned = ownedMap.has(a.id) ? 0 : 1;
      const bOwned = ownedMap.has(b.id) ? 0 : 1;
      if (aOwned !== bOwned) return aOwned - bOwned;
      const aRarity = RARITY_ORDER[a.rarity] ?? 9;
      const bRarity = RARITY_ORDER[b.rarity] ?? 9;
      return aRarity - bRarity;
    });
  }, [allOutfits, activeFilter, save.ownedOutfits]);

  const previewOutfit = previewOutfitId
    ? allOutfits.find((outfit) => outfit.id === previewOutfitId) ?? null
    : null;
  const previewOwned = previewOutfit ? ownedMap.get(previewOutfit.id) : undefined;
  const previewIsOwned = Boolean(previewOwned);
  const previewNextThreshold = previewOwned && previewOwned.stars < 5
    ? SHARD_THRESHOLDS[previewOwned.stars + 1]
    : null;
  const previewUpgradable = previewOwned ? canUpgrade(previewOwned) : false;

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    ...pilots.map((p) => ({ key: p.id, label: p.name.split(" ")[0] })),
  ];

  return (
    <div className="screen collection-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <div className="header-title-stack">
          <h2>Collection ({ownedCount}/{allOutfits.length})</h2>
          <p>Review wardrobe progression and upgrade owned pilot kits.</p>
        </div>
      </div>

      <div className="collection-filter-tabs">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            className={`collection-tab ${activeFilter === tab.key ? "active" : ""}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card-grid collection-grid">
        {filteredOutfits.map((outfit) => {
          const owned = ownedMap.get(outfit.id);
          const isOwned = Boolean(owned);
          const upgradable = owned ? canUpgrade(owned) : false;
          const nextThreshold = owned && owned.stars < 5
            ? SHARD_THRESHOLDS[owned.stars + 1]
            : null;

          return (
            <div
              key={outfit.id}
              className={`card outfit-card rarity-${outfit.rarity.toLowerCase()} ${isOwned ? "" : "card-locked"}`}
              onClick={() => setPreviewOutfitId(outfit.id)}
            >
              <CardArt
                title={outfit.name}
                artUrl={outfit.artUrl}
                artPlaceholder={outfit.artPlaceholder}
                rarity={outfit.rarity}
              />
              <div className="card-info">
                <strong className="card-title">{outfit.name}</strong>
                <span
                  className="rarity-text"
                  style={{ color: RARITY_COLORS[outfit.rarity] }}
                >
                  {outfit.rarity}{!isOwned ? " • Locked" : ""}
                </span>
                <div className="star-display">
                  {isOwned && owned
                    ? `${"★".repeat(owned.stars)}${"☆".repeat(5 - owned.stars)}`
                    : "☆☆☆☆☆"}
                </div>
                {outfit.pilotId && (
                  <div className="rarity-badge">
                    {pilotNameById.get(outfit.pilotId) ?? outfit.pilotId}
                  </div>
                )}
                <div className="perk-label">{summarizeOutfitKit(outfit)}</div>
                {nextThreshold && (
                  <div className="shard-progress">
                    Shards: {owned?.shards ?? 0}/{nextThreshold}
                  </div>
                )}
                {isOwned && upgradable && (
                  <button
                    className="btn btn-upgrade"
                    onClick={(event) => {
                      event.stopPropagation();
                      upgradeOutfit(outfit.id);
                    }}
                  >
                    ★ Upgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ownedCount === 0 && (
        <p className="empty-msg">No outfits yet. Visit the Store to pull!</p>
      )}

      {previewOutfit && (
        <div className="card-preview-overlay" onClick={() => setPreviewOutfitId(null)}>
          <div className="card-preview-modal panel-surface" onClick={(event) => event.stopPropagation()}>
            <div
              className={`card outfit-card card-preview-card rarity-${previewOutfit.rarity.toLowerCase()} ${previewIsOwned ? "" : "card-locked"}`}
            >
              <CardArt
                title={previewOutfit.name}
                artUrl={previewOutfit.artUrl}
                artPlaceholder={previewOutfit.artPlaceholder}
                rarity={previewOutfit.rarity}
                className="card-preview-art"
              />
              <div className="card-info">
                <strong className="card-title">{previewOutfit.name}</strong>
                <span
                  className="rarity-text"
                  style={{ color: RARITY_COLORS[previewOutfit.rarity] }}
                >
                  {previewOutfit.rarity}{!previewIsOwned ? " • Locked" : ""}
                </span>
                <div className="star-display">
                  {previewOwned
                    ? `${"★".repeat(previewOwned.stars)}${"☆".repeat(5 - previewOwned.stars)}`
                    : "☆☆☆☆☆"}
                </div>
                {previewOutfit.pilotId && (
                  <div className="rarity-badge">
                    {pilotNameById.get(previewOutfit.pilotId) ?? previewOutfit.pilotId}
                  </div>
                )}
                <div className="perk-label">{summarizeOutfitKit(previewOutfit)}</div>
                {previewNextThreshold && (
                  <div className="shard-progress">
                    Shards: {previewOwned?.shards ?? 0}/{previewNextThreshold}
                  </div>
                )}
                {previewIsOwned && previewUpgradable && (
                  <button
                    className="btn btn-upgrade"
                    onClick={() => upgradeOutfit(previewOutfit.id)}
                  >
                    ★ Upgrade
                  </button>
                )}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setPreviewOutfitId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
