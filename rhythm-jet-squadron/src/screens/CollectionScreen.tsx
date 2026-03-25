/**
 * Collection Screen - View all owned outfits with details, upgrade with shards.
 * Sorted by pilot with filter tabs for easy browsing.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useWallet } from "../context/WalletContext";
import { canUpgrade, SHARD_THRESHOLDS } from "../lib/gacha";
import { summarizeOutfitKit } from "../lib/outfitKits";
import { fetchGalleryImages } from "../lib/havnApi";
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
type ViewTab = "collection" | "gallery";

interface GalleryImage {
  id: string;
  imageUrl: string;
  pilotId: string;
  context: string;
  createdAt: string;
}

export default function CollectionScreen() {
  const navigate = useNavigate();
  const { save, upgradeOutfit } = useGame();
  const wallet = useWallet();
  const [previewOutfitId, setPreviewOutfitId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("collection");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    if (viewTab === "gallery" && wallet.address) {
      setGalleryLoading(true);
      fetchGalleryImages(wallet.address)
        .then((data) => setGalleryImages(data.images))
        .finally(() => setGalleryLoading(false));
    }
  }, [viewTab, wallet.address]);

  const allOutfits = outfitsData as Outfit[];
  const pilots = pilotsData as Pilot[];
  const pilotNameById = new Map(pilots.map((pilot) => [pilot.id, pilot.name]));
  const ownedMap = new Map<string, OwnedOutfit>();
  save.ownedOutfits.forEach((o) => ownedMap.set(o.outfitId, o));

  const ownedCount = allOutfits.filter((outfit) => ownedMap.has(outfit.id)).length;

  // Group outfits by pilot, sorted: owned first, then rarity
  const sortOutfits = (list: Outfit[]) =>
    [...list].sort((a, b) => {
      const aOwned = ownedMap.has(a.id) ? 0 : 1;
      const bOwned = ownedMap.has(b.id) ? 0 : 1;
      if (aOwned !== bOwned) return aOwned - bOwned;
      const aRarity = RARITY_ORDER[a.rarity] ?? 9;
      const bRarity = RARITY_ORDER[b.rarity] ?? 9;
      return aRarity - bRarity;
    });

  const pilotSections = useMemo(() => {
    const visiblePilots = activeFilter === "all"
      ? pilots
      : pilots.filter((p) => p.id === activeFilter);
    return visiblePilots.map((pilot) => ({
      pilot,
      outfits: sortOutfits(allOutfits.filter((o) => o.pilotId === pilot.id)),
    }));
  }, [allOutfits, activeFilter, pilots, save.ownedOutfits]);

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
          <h2>{viewTab === "collection" ? `Collection (${ownedCount}/${allOutfits.length})` : "Gallery"}</h2>
          <p>{viewTab === "collection" ? "Review wardrobe progression and upgrade owned pilot kits." : "Your earned reward images."}</p>
        </div>
      </div>

      {/* Top-level view tabs */}
      <div className="collection-filter-tabs" style={{ marginBottom: "4px" }}>
        <button
          className={`collection-tab ${viewTab === "collection" ? "active" : ""}`}
          onClick={() => setViewTab("collection")}
        >
          COLLECTION
        </button>
        <button
          className={`collection-tab ${viewTab === "gallery" ? "active" : ""}`}
          onClick={() => setViewTab("gallery")}
        >
          GALLERY
        </button>
      </div>

      {viewTab === "gallery" && (
        <section className="collection-pilot-section">
          {galleryLoading ? (
            <p className="empty-msg">Loading gallery...</p>
          ) : galleryImages.length === 0 ? (
            <p className="empty-msg">No reward images yet. Earn images by completing missions!</p>
          ) : (
            <div className="collection-scroll-row">
              {galleryImages.map((img) => (
                <div key={img.id} className="card outfit-card" style={{ cursor: "pointer" }}>
                  <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", borderRadius: "6px 6px 0 0" }}>
                    <img
                      src={img.imageUrl}
                      alt={img.context}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div className="card-info">
                    <strong className="card-title">{img.context || "Reward Image"}</strong>
                    <span className="rarity-text" style={{ color: "#66d9ef" }}>
                      {img.pilotId}
                    </span>
                    <div className="perk-label">
                      {new Date(img.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {viewTab === "collection" && <>
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

      {pilotSections.map(({ pilot, outfits }) => (
        <section key={pilot.id} className="collection-pilot-section">
          <h3 className="collection-pilot-heading">{pilot.name}</h3>
          <div className="collection-scroll-row">
            {outfits.map((outfit) => {
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
                    artUrl={outfit.cutsceneArtUrl ?? outfit.artUrl}
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
        </section>
      ))}

      {ownedCount === 0 && (
        <p className="empty-msg">No outfits yet. Visit the Store to pull!</p>
      )}
      </>}

      {previewOutfit && (
        <div className="card-preview-overlay" onClick={() => setPreviewOutfitId(null)}>
          <div className="card-preview-modal panel-surface" onClick={(event) => event.stopPropagation()}>
            <div
              className={`card outfit-card card-preview-card rarity-${previewOutfit.rarity.toLowerCase()} ${previewIsOwned ? "" : "card-locked"}`}
            >
              <CardArt
                title={previewOutfit.name}
                artUrl={previewOutfit.cutsceneArtUrl ?? previewOutfit.artUrl}
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
