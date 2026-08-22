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
import {
  fetchGalleryImages,
  fetchOwnedAssets,
  resolveHavnAssetUrl,
  type GalleryImage,
  type OwnedAsset,
} from "../lib/havnApi";
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
type ViewTab = "collection" | "gallery" | "owned";

const GALLERY_POLL_MS = 15000;

export default function CollectionScreen() {
  const navigate = useNavigate();
  const { save, upgradeOutfit, equipBanner } = useGame();
  const wallet = useWallet();
  const [previewOutfitId, setPreviewOutfitId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("collection");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [ownedAssets, setOwnedAssets] = useState<OwnedAsset[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedOffline, setOwnedOffline] = useState(false);

  useEffect(() => {
    if (viewTab !== "gallery" || !wallet.address) return;
    const address = wallet.address;
    let cancelled = false;
    let timer: number | undefined;

    const load = (initial: boolean) => {
      if (initial) setGalleryLoading(true);
      fetchGalleryImages(address)
        .then((data) => {
          if (cancelled) return;
          setGalleryImages(data.images);
          // Keep polling while any render is still in flight so the image
          // appears without the player having to leave and come back.
          if (data.images.some((img) => img.status === "pending")) {
            timer = window.setTimeout(() => load(false), GALLERY_POLL_MS);
          }
        })
        .finally(() => {
          if (!cancelled && initial) setGalleryLoading(false);
        });
    };

    load(true);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [viewTab, wallet.address]);

  // Assets owned on JoinHavn, usable in Astra as hangar decor and nothing
  // else. Ownership is transferable on the marketplace, so this also acts
  // as the check that retires a banner the player has since sold. An
  // offline response is treated as "unverified", not "sold" — losing your
  // connection must not strip your hangar.
  useEffect(() => {
    if (viewTab !== "owned" || !wallet.address) return;
    const address = wallet.address;
    let cancelled = false;
    setOwnedLoading(true);
    fetchOwnedAssets(address)
      .then(({ assets, offline }) => {
        if (cancelled) return;
        setOwnedAssets(assets);
        setOwnedOffline(offline);
        const equipped = save.equippedBanner;
        const isOwnedAsset = !equipped?.source || equipped.source === "owned";
        if (!offline && equipped && isOwnedAsset && !assets.some((a) => a.job_id === equipped.jobId)) {
          equipBanner(null);
        }
      })
      .finally(() => {
        if (!cancelled) setOwnedLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // save.equippedBanner is read but must not retrigger the fetch, or
    // clearing the banner below would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, wallet.address, equipBanner]);

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
          <h2>
            {viewTab === "collection"
              ? `Collection (${ownedCount}/${allOutfits.length})`
              : viewTab === "gallery"
              ? "Gallery"
              : "Owned Assets"}
          </h2>
          <p>
            {viewTab === "collection"
              ? "Review wardrobe progression and upgrade owned pilot kits."
              : viewTab === "gallery"
              ? "Your earned reward images."
              : "Assets you own on JoinHavn. Fly them as hangar decor."}
          </p>
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
        <button
          className={`collection-tab ${viewTab === "owned" ? "active" : ""}`}
          onClick={() => setViewTab("owned")}
        >
          OWNED
        </button>
      </div>

      {viewTab === "gallery" && (
        <section className="collection-pilot-section">
          {galleryLoading ? (
            <p className="empty-msg">Loading gallery...</p>
          ) : galleryImages.length === 0 ? (
            <p className="empty-msg">
              No reward art yet. Win a mission with your wallet connected and the
              HavnAI network paints your pilot&apos;s victory.
            </p>
          ) : (
            <div className="collection-scroll-row">
              {galleryImages.map((img) => {
                const pilotName = pilotNameById.get(img.pilot_id) ?? img.pilot_id;
                const imageUrl = resolveHavnAssetUrl(img.image_url ?? img.preview_url);
                return (
                  <div key={img.run_id} className="card outfit-card">
                    <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1018" }}>
                      {img.status === "completed" && imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${pilotName} reward art`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : img.status === "failed" ? (
                        <span className="empty-msg" style={{ padding: "8px", textAlign: "center" }}>
                          Render failed — this one got away
                        </span>
                      ) : (
                        <span className="empty-msg" style={{ padding: "8px", textAlign: "center" }}>
                          &#x1F3A8; Rendering on the network…
                        </span>
                      )}
                    </div>
                    <div className="card-info">
                      <strong className="card-title">{pilotName} — Grade {img.grade}</strong>
                      <span className="rarity-text" style={{ color: "#66d9ef" }}>
                        {img.map_id.replace(/-/g, " ")}
                      </span>
                      <div className="perk-label">
                        {new Date(img.created_at * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {viewTab === "owned" && (
        <section className="collection-pilot-section">
          {!wallet.address ? (
            <p className="empty-msg">
              Connect your wallet to see the assets you own on JoinHavn.
            </p>
          ) : ownedLoading ? (
            <p className="empty-msg">Checking your JoinHavn Collection...</p>
          ) : ownedOffline ? (
            <p className="empty-msg">
              Could not reach JoinHavn. Your hangar keeps whatever it was
              already flying.
            </p>
          ) : ownedAssets.length === 0 ? (
            <p className="empty-msg">
              Nothing claimed yet. Assets you claim on JoinHavn show up here
              and can be flown as hangar decor.
            </p>
          ) : (
            <>
              <p className="perk-label" style={{ padding: "0 12px 8px" }}>
                Hangar decor only — owned assets never change a stat.
              </p>
              <div className="collection-scroll-row">
                {ownedAssets.map((asset) => {
                  const url = resolveHavnAssetUrl(asset.image_url ?? asset.preview_url);
                  const isEquipped = save.equippedBanner?.jobId === asset.job_id;
                  return (
                    <div key={asset.job_id} className="card outfit-card">
                      <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1018" }}>
                        {url ? (
                          <img
                            src={url}
                            alt={asset.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span className="empty-msg" style={{ padding: "8px", textAlign: "center" }}>
                            Preview unavailable
                          </span>
                        )}
                      </div>
                      <div className="card-info">
                        <strong className="card-title">{asset.title}</strong>
                        {asset.category && (
                          <span className="rarity-text" style={{ color: "#66d9ef" }}>
                            {asset.category}
                          </span>
                        )}
                        <button
                          className="btn btn-small"
                          style={{ marginTop: "6px", width: "100%" }}
                          disabled={!url}
                          onClick={() =>
                            equipBanner(
                              isEquipped
                                ? null
                                : {
                                    jobId: asset.job_id,
                                    title: asset.title,
                                    url: url!,
                                    source: "owned",
                                  },
                            )
                          }
                        >
                          {isEquipped ? "Remove from hangar" : "Fly in hangar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
                    artUrl={outfit.artUrl}
                                        artPlaceholder={outfit.artPlaceholder}
                    rarity={outfit.rarity}
                    motionMode="never"
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
        <p className="empty-msg">No outfits yet.</p>
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
                artUrl={previewOutfit.artUrl}
                                artPlaceholder={previewOutfit.artPlaceholder}
                rarity={previewOutfit.rarity}
                className="card-preview-art"
                motionMode="never"
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
