/**
 * Hangar Screen - Pilot and outfit selection before playing.
 *
 * Layout: scrollable selection sections + compact sticky deploy bar at bottom.
 * On mobile: horizontal-scroll card strips, minimal footer.
 * On desktop: grid cards with 2-column summary sidebar feel.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { buildShmupLoadout, describePilotPerk, describeShipModifiers } from "../lib/loadout";
import { RUN_MODIFIERS, getScoreSwingPercent } from "../data/modifiers";
import { SHMUP_MAPS } from "../lib/shmupWaves";
import {
  isOutfitPilotLocked,
  summarizeOutfitKit,
} from "../lib/outfitKits";
import { resolveAssetUrl } from "../lib/assetUrl";
import CardArt from "../components/CardArt";
import type { Pilot, Outfit, OwnedOutfit, Ship } from "../types";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import shipsData from "../data/ships.json";

const SHOW_ALL_OUTFITS_STORAGE_KEY = "astra.showAllPilotOutfits";

type HangarTab = "pilot" | "ship" | "map" | "outfit" | "modifiers";

const HANGAR_TABS: ReadonlyArray<{ id: HangarTab; label: string }> = [
  { id: "pilot", label: "Pilot" },
  { id: "ship", label: "Ship" },
  { id: "map", label: "Map" },
  { id: "outfit", label: "Outfit" },
  { id: "modifiers", label: "Modifiers" },
];

const MAP_ART_BY_ID: Record<string, string> = {
  "nebula-runway": "/assets/maps/nebula-runway.png",
  "solar-rift": "/assets/maps/solar-rift.png",
  "abyss-crown": "/assets/maps/abyss-crown.png",
};

export default function HangarScreen() {
  const navigate = useNavigate();
  const { save, selectPilot, selectShip, selectMap, selectOutfit, setSelectedModifiers } = useGame();
  const [activeTab, setActiveTab] = useState<HangarTab>("pilot");
  const [kitWarning, setKitWarning] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAllOutfits, setShowAllOutfits] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SHOW_ALL_OUTFITS_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_ALL_OUTFITS_STORAGE_KEY, showAllOutfits ? "1" : "0");
  }, [showAllOutfits]);

  const activeModifiers = save.selectedModifiers ?? [];
  const scoreSwing = getScoreSwingPercent(activeModifiers);
  const toggleModifier = (id: string) => {
    setSelectedModifiers(
      activeModifiers.includes(id)
        ? activeModifiers.filter((active) => active !== id)
        : [...activeModifiers, id],
    );
  };

  const pilots = pilotsData as Pilot[];
  const ships = shipsData as Ship[];
  const allOutfits = outfitsData as Outfit[];
  const ownedShips = ships.filter((ship) => save.ownedShips.includes(ship.id));
  const pilotNameById = new Map(pilots.map((item) => [item.id, item.name]));

  const ownedOutfitMap = new Map<string, OwnedOutfit>();
  save.ownedOutfits.forEach((o) => ownedOutfitMap.set(o.outfitId, o));

  const ownedOutfits = allOutfits.filter((outfit) => ownedOutfitMap.has(outfit.id));

  const selectedPilot = pilots.find((p) => p.id === save.selectedPilotId);
  const selectedShip = ships.find((ship) => ship.id === save.selectedShipId);
  const selectedMap =
    SHMUP_MAPS.find((map) => map.id === save.selectedMapId) ?? SHMUP_MAPS[0];
  const selectedOutfit = allOutfits.find((o) => o.id === save.selectedOutfitId);
  const selectedOwned = save.selectedOutfitId
    ? ownedOutfitMap.get(save.selectedOutfitId)
    : undefined;
  const loadout = buildShmupLoadout(selectedPilot, selectedShip, selectedOutfit, selectedOwned);
  const selectedOutfitLocked = selectedOutfit
    ? isOutfitPilotLocked(selectedOutfit, save.selectedPilotId)
    : false;
  const kitSummary = selectedOutfit
    ? selectedOutfitLocked
      ? "Pilot-specific outfit selected: switch pilot to activate kit."
      : summarizeOutfitKit(selectedOutfit)
    : "No outfit selected";
  const selectedPilotId = save.selectedPilotId;

  const tabSummaries: Record<HangarTab, string> = {
    pilot: selectedPilot?.name ?? "Choose pilot",
    ship: selectedShip?.name ?? "Choose ship",
    map: selectedMap?.name ?? "Choose map",
    outfit: selectedOutfit?.name ?? "No outfit",
    modifiers: activeModifiers.length === 0
      ? "Standard"
      : `${scoreSwing >= 0 ? "+" : ""}${scoreSwing}% score`,
  };

  const isOutfitInDefaultView = (outfit: Outfit): boolean => {
    if (!selectedPilotId) return true;
    if (!outfit.pilotId) return true;
    if ((outfit.rarity === "SR" || outfit.rarity === "SSR") && outfit.pilotId !== selectedPilotId)
      return false;
    return outfit.pilotId === selectedPilotId;
  };

  const displayedOutfits = showAllOutfits
    ? allOutfits
    : allOutfits.filter((outfit) => isOutfitInDefaultView(outfit));

  const universalOutfits = displayedOutfits.filter((outfit) => !outfit.pilotId);
  const pilotOutfitGroups = pilots
    .map((pilot) => ({
      pilot,
      outfits: displayedOutfits.filter((outfit) => outfit.pilotId === pilot.id),
    }))
    .filter((group) => group.outfits.length > 0);

  const renderOutfitCard = (outfit: Outfit) => {
    const owned = ownedOutfitMap.get(outfit.id);
    const isOwned = Boolean(owned);
    const ownedStars = owned?.stars ?? 0;
    const isPilotLocked = isOutfitPilotLocked(outfit, save.selectedPilotId);
    const isLocked = !isOwned || isPilotLocked;
    const activateOutfit = () => {
      if (!isOwned) {
        setKitWarning(`${outfit.name} is locked. Pull in Shop to unlock.`);
        return;
      }
      if (isPilotLocked) {
        const pilotName = outfit.pilotId ? pilotNameById.get(outfit.pilotId) : null;
        setKitWarning(`${outfit.name} is Pilot-specific${pilotName ? ` for ${pilotName}` : ""}.`);
        return;
      }
      setKitWarning(null);
      selectOutfit(outfit.id);
    };

    return (
      <div
        key={outfit.id}
        className={`card outfit-card rarity-${outfit.rarity.toLowerCase()} ${
          isLocked ? "card-locked" : ""
        } ${outfit.id === save.selectedOutfitId ? "selected" : ""}`}
        role="button"
        tabIndex={0}
        data-gamepad-default={outfit.id === save.selectedOutfitId ? "true" : undefined}
        onClick={activateOutfit}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          activateOutfit();
        }}
      >
        <CardArt
          title={outfit.name}
          artUrl={outfit.artUrl}
          motionArtUrl={outfit.cutsceneArtUrl}
          artPlaceholder={outfit.artPlaceholder}
          rarity={outfit.rarity}
          motionMode={outfit.id === save.selectedOutfitId ? "hold" : "never"}
        />
        <div className="card-info">
          <strong className="card-title">{outfit.name}</strong>
          <div className="star-display">
            {isOwned
              ? `${"★".repeat(ownedStars)}${"☆".repeat(5 - ownedStars)}`
              : "☆☆☆☆☆"}
          </div>
          <div className="rarity-badge">
            {outfit.rarity}
            {!isOwned ? " • Locked" : ""}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="screen hangar-screen">
      {/* Compact top bar */}
      <div className="hangar-topbar">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2 className="hangar-title">Loadout</h2>
      </div>

      {/* A HavnAI artifact flying over the hangar. Decor only: nothing below
          reads it and it never enters the loadout or combat simulation. */}
      {save.equippedBanner && (
        <div className="hangar-banner" title={save.equippedBanner.title}>
          <img src={save.equippedBanner.url} alt={save.equippedBanner.title} />
          <span className="hangar-banner-label">{save.equippedBanner.title}</span>
        </div>
      )}

      <div className="hangar-tabs" role="tablist" aria-label="Loadout category">
        {HANGAR_TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`hangar-tab-${tab.id}`}
            className={`hangar-tab ${activeTab === tab.id ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`hangar-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const nextIndex = (index + direction + HANGAR_TABS.length) % HANGAR_TABS.length;
              const nextTab = HANGAR_TABS[nextIndex];
              setActiveTab(nextTab.id);
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(`#hangar-tab-${nextTab.id}`)
                ?.focus();
            }}
          >
            <span className="hangar-tab-label">{tab.label}</span>
            <span className="hangar-tab-summary">{tabSummaries[tab.id]}</span>
          </button>
        ))}
      </div>

      <main className="hangar-workspace">
        {activeTab === "pilot" && (
          <section
            className="hangar-panel"
            id="hangar-panel-pilot"
            role="tabpanel"
            aria-labelledby="hangar-tab-pilot"
          >
            <header className="hangar-panel-head">
              <div>
                <span className="hangar-panel-label">Pilot</span>
                <h3>{selectedPilot?.name ?? "Select Pilot"}</h3>
              </div>
              {selectedPilot && <p>{selectedPilot.description}</p>}
            </header>
            <div className="hangar-choice-grid">
              {pilots.map((pilot) => (
                <div
                  key={pilot.id}
                  className={`card pilot-card ${pilot.id === save.selectedPilotId ? "selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  data-gamepad-default={pilot.id === save.selectedPilotId ? "true" : undefined}
                  onClick={() => { setKitWarning(null); selectPilot(pilot.id); }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setKitWarning(null);
                    selectPilot(pilot.id);
                  }}
                >
                  <CardArt
                    title={pilot.name}
                    artUrl={pilot.artUrl}
                    artPlaceholder={pilot.artPlaceholder}
                  />
                  <div className="card-info">
                    <strong className="card-title">{pilot.name}</strong>
                    {(() => {
                      const line = describePilotPerk(pilot);
                      if (!line) return null;
                      return (
                        <div className="stats-row" title={line.detail}>
                          <span>{line.stat}</span>
                          <span className="stat-delta">{line.delta}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "ship" && (
          <section
            className="hangar-panel"
            id="hangar-panel-ship"
            role="tabpanel"
            aria-labelledby="hangar-tab-ship"
          >
            <header className="hangar-panel-head">
              <div className="hangar-ship-identity">
                <h3>{selectedShip?.name ?? "Select Ship"}</h3>
                {selectedShip && (
                  <div className="hangar-ship-meta">
                    <span>{selectedShip.className} frame</span>
                    <span>{selectedShip.manufacturer}</span>
                  </div>
                )}
              </div>
              {selectedShip && (
                <div className="hangar-ship-brief">
                  <strong>{selectedShip.trait.label}</strong>
                  <p>{selectedShip.description}</p>
                  <span>{selectedShip.trait.description}</span>
                </div>
              )}
            </header>
            <div className="hangar-choice-grid">
              {ownedShips.map((ship) => (
                <div
                  key={ship.id}
                  className={`card ship-card ${ship.id === save.selectedShipId ? "selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={ship.id === save.selectedShipId}
                  data-gamepad-default={ship.id === save.selectedShipId ? "true" : undefined}
                  onClick={() => selectShip(ship.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectShip(ship.id);
                  }}
                >
                  <CardArt
                    title={ship.name}
                    artUrl={ship.artUrl}
                    artPlaceholder={ship.artPlaceholder}
                    className="ship-card-art"
                  />
                  <div className="card-info">
                    <strong className="card-title">{ship.name}</strong>
                    <div className="rarity-badge">{ship.className}</div>
                    <div className="stats-row">
                      {describeShipModifiers(ship, 2).map((line) => (
                        <span key={line.stat} title={line.detail}>
                          {line.stat} <span className="stat-delta">{line.delta}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "map" && (
          <section
            className="hangar-panel"
            id="hangar-panel-map"
            role="tabpanel"
            aria-labelledby="hangar-tab-map"
          >
            <header className="hangar-panel-head">
              <div>
                <span className="hangar-panel-label">Map</span>
                <h3>{selectedMap.name}</h3>
              </div>
              <p>{selectedMap.briefing}</p>
            </header>
            <div className="hangar-map-grid">
              {SHMUP_MAPS.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className={`map-card ${selectedMap.id === map.id ? "selected" : ""}`}
                  onClick={() => selectMap(map.id)}
                  aria-pressed={selectedMap.id === map.id}
                >
                  <img
                    className="map-card-art"
                    src={resolveAssetUrl(MAP_ART_BY_ID[map.id])}
                    alt=""
                    loading="lazy"
                  />
                  <div className="map-card-info">
                    <strong className="map-card-title">{map.name}</strong>
                    <span className="map-card-meta">{map.tagline}</span>
                    <span className="map-card-boss">Boss: {map.bossName}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeTab === "outfit" && (
          <section
            className="hangar-panel hangar-outfit-panel"
            id="hangar-panel-outfit"
            role="tabpanel"
            aria-labelledby="hangar-tab-outfit"
          >
            <header className="hangar-panel-head">
              <div>
                <span className="hangar-panel-label">Outfit</span>
                <h3>{selectedOutfit?.name ?? "Select Outfit"}</h3>
              </div>
              <label className="outfit-filter-toggle">
                <input
                  type="checkbox"
                  checked={showAllOutfits}
                  onChange={(event) => setShowAllOutfits(event.currentTarget.checked)}
                />
                All pilots
              </label>
            </header>

            <div className="outfit-workspace">
              {selectedOutfit && (
                <article className={`outfit-feature rarity-${selectedOutfit.rarity.toLowerCase()}`}>
                  <CardArt
                    title={selectedOutfit.name}
                    artUrl={selectedOutfit.artUrl}
                    motionArtUrl={selectedOutfit.cutsceneArtUrl}
                    artPlaceholder={selectedOutfit.artPlaceholder}
                    rarity={selectedOutfit.rarity}
                    className="outfit-feature-art"
                    motionMode="auto"
                  />
                  <div className="outfit-feature-info">
                    <div className="outfit-feature-title-row">
                      <strong>{selectedOutfit.name}</strong>
                      <span className="rarity-badge">{selectedOutfit.rarity}</span>
                    </div>
                    <div className="star-display">
                      {selectedOwned
                        ? `${"★".repeat(selectedOwned.stars)}${"☆".repeat(5 - selectedOwned.stars)}`
                        : "☆☆☆☆☆"}
                    </div>
                    <p>{kitSummary}</p>
                  </div>
                </article>
              )}

              <div className="outfit-browser">
                {showAllOutfits ? (
                  <div className="outfit-groups">
                    {universalOutfits.length > 0 && (
                      <div className="outfit-group">
                        <div className="outfit-group-head">
                          <h4>Universal</h4>
                          <span className="outfit-group-count">{universalOutfits.length}</span>
                        </div>
                        <div className="outfit-card-grid">
                          {universalOutfits.map(renderOutfitCard)}
                        </div>
                      </div>
                    )}
                    {pilotOutfitGroups.map((group) => (
                      <div key={group.pilot.id} className="outfit-group">
                        <div className="outfit-group-head">
                          <h4>{group.pilot.name}</h4>
                          <span className="outfit-group-count">{group.outfits.length}</span>
                        </div>
                        <div className="outfit-card-grid">
                          {group.outfits.map(renderOutfitCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="outfit-card-grid">
                    {displayedOutfits.map(renderOutfitCard)}
                  </div>
                )}
                {kitWarning && <p className="kit-warning">{kitWarning}</p>}
                {ownedOutfits.length === 0 && (
                  <p className="empty-msg">No outfits owned yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "modifiers" && (
          <section
            className="hangar-panel"
            id="hangar-panel-modifiers"
            role="tabpanel"
            aria-labelledby="hangar-tab-modifiers"
          >
            <header className="hangar-panel-head">
              <div>
                <span className="hangar-panel-label">Modifiers</span>
                <h3>{activeModifiers.length === 0 ? "Standard Run" : `${activeModifiers.length} Active`}</h3>
              </div>
              <p>{activeModifiers.length === 0 ? "No score or difficulty modifiers applied." : tabSummaries.modifiers}</p>
            </header>
            <div className="modifier-grid">
              {RUN_MODIFIERS.map((mod) => {
                const active = activeModifiers.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    className={`modifier-card ${active ? "selected" : ""}`}
                    onClick={() => toggleModifier(mod.id)}
                    aria-pressed={active}
                  >
                    <span className="modifier-icon" aria-hidden="true">{mod.icon}</span>
                    <span className="modifier-body">
                      <strong className="modifier-name">{mod.name}</strong>
                      <span className="modifier-desc">{mod.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ── Compact sticky deploy bar ─── */}
      <div className="hangar-deploy-bar">
        <div className="deploy-bar-selections">
          <span className="deploy-chip">{selectedPilot?.name ?? "Pilot?"}</span>
          <span className="deploy-chip-sep">/</span>
          <span className="deploy-chip">{selectedShip?.name ?? "Ship?"}</span>
          <span className="deploy-chip-sep">/</span>
          <span className="deploy-chip">{selectedMap?.name ?? "Map?"}</span>
          {selectedOutfit && (
            <>
              <span className="deploy-chip-sep">/</span>
              <span className="deploy-chip">{selectedOutfit.name}{selectedOwned ? ` ${selectedOwned.stars}★` : ""}</span>
            </>
          )}
        </div>
        <div className="deploy-bar-row">
          <button
            className="btn btn-text deploy-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide details ▴" : "Details ▾"}
          </button>
          <button
            className="btn btn-primary deploy-btn"
            onClick={() => {
              navigate("/briefing");
            }}
            disabled={!save.selectedPilotId || !save.selectedShipId}
          >
            Deploy
          </button>
        </div>
        {showDetails && (
          <div className="deploy-details">
            <div className="deploy-detail-line">
              <span className="deploy-detail-label">Frame</span>
              <span>{loadout.identityLine}</span>
            </div>
            <div className="deploy-detail-line">
              <span className="deploy-detail-label">Kit</span>
              <span>{kitSummary}</span>
            </div>
            <div className="deploy-detail-line">
              <span className="deploy-detail-label">Scoring</span>
              <span>{loadout.multiplierLine}</span>
            </div>
            <div className="deploy-detail-line">
              <span className="deploy-detail-label">HP</span>
              <span>{loadout.survivabilityLine}</span>
            </div>
            <div className="deploy-detail-line">
              <span className="deploy-detail-label">Systems</span>
              <span>{loadout.systemsLine}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
