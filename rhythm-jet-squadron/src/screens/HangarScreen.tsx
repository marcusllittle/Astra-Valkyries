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
import { buildShmupLoadout } from "../lib/loadout";
import { SHMUP_MAPS } from "../lib/shmupWaves";
import {
  isOutfitPilotLocked,
  summarizeOutfitKit,
} from "../lib/outfitKits";
import CardArt from "../components/CardArt";
import type { Pilot, Outfit, OwnedOutfit, Ship } from "../types";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import shipsData from "../data/ships.json";

const SHOW_ALL_OUTFITS_STORAGE_KEY = "astra.showAllPilotOutfits";

export default function HangarScreen() {
  const navigate = useNavigate();
  const { save, selectPilot, selectShip, selectMap, selectOutfit } = useGame();
  const isFirstRun = save.totalRuns === 0;
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

    return (
      <div
        key={outfit.id}
        className={`card outfit-card rarity-${outfit.rarity.toLowerCase()} ${
          isLocked ? "card-locked" : ""
        } ${outfit.id === save.selectedOutfitId ? "selected" : ""}`}
        onClick={() => {
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
      <header className="hangar-hero panel-surface">
        <div className="hangar-hero-copy">
          <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
          <span className="hangar-kicker">Pre-mission staging</span>
          <h1 className="hangar-title">Mission Loadout</h1>
          <p className="hangar-subtitle">
            Build the pilot, frame, route, and outfit package before you throw this squadron into the lane.
          </p>
          {isFirstRun ? (
            <p className="hangar-first-run-tip">Pick a pilot, select a ship, choose the route, then deploy.</p>
          ) : null}
        </div>

        <div className="hangar-hero-summary">
          <div className="hangar-summary-card">
            <span className="hangar-summary-label">Pilot</span>
            <strong className="hangar-summary-value">{selectedPilot?.name ?? "Unassigned"}</strong>
            <span className="hangar-summary-meta">{selectedPilot ? `ACC ${selectedPilot.stats.accuracy} • RHY ${selectedPilot.stats.rhythm} • END ${selectedPilot.stats.endurance}` : "Choose who is flying point."}</span>
          </div>
          <div className="hangar-summary-card">
            <span className="hangar-summary-label">Frame</span>
            <strong className="hangar-summary-value">{selectedShip?.name ?? "No ship selected"}</strong>
            <span className="hangar-summary-meta">{selectedShip ? `${selectedShip.className} • MOB ${selectedShip.stats.mobility} • FIR ${selectedShip.stats.firepower}` : "Pick the chassis before launch."}</span>
          </div>
          <div className="hangar-summary-card">
            <span className="hangar-summary-label">Route</span>
            <strong className="hangar-summary-value">{selectedMap?.name ?? "No route selected"}</strong>
            <span className="hangar-summary-meta">{selectedMap ? `${selectedMap.tagline} • Boss ${selectedMap.bossName}` : "Select where the sortie goes hot."}</span>
          </div>
          <div className="hangar-summary-card hangar-summary-card-accent">
            <span className="hangar-summary-label">Kit readout</span>
            <strong className="hangar-summary-value">{selectedOutfit?.name ?? "Base loadout"}</strong>
            <span className="hangar-summary-meta">{kitSummary}</span>
          </div>
        </div>
      </header>

      {/* Pilot selection — horizontal strip on mobile */}
      <section className="hangar-section hangar-stage-section">
        <div className="section-head">
          <div>
            <h3>Pilot</h3>
            <p className="section-copy">Choose who sets the tone of the run.</p>
          </div>
          <span className="section-selected">{selectedPilot?.name ?? "—"}</span>
        </div>
        <div className="hangar-strip">
          {pilots.map((pilot) => (
            <div
              key={pilot.id}
              className={`card pilot-card ${pilot.id === save.selectedPilotId ? "selected" : ""}`}
              onClick={() => { setKitWarning(null); selectPilot(pilot.id); }}
            >
              <CardArt
                title={pilot.name}
                artUrl={pilot.artUrl}
                artPlaceholder={pilot.artPlaceholder}
              />
              <div className="card-info">
                <strong className="card-title">{pilot.name}</strong>
                <div className="stats-row">
                  <span>ACC {pilot.stats.accuracy}</span>
                  <span>RHY {pilot.stats.rhythm}</span>
                  <span>END {pilot.stats.endurance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ship selection */}
      <section className="hangar-section hangar-stage-section">
        <div className="section-head">
          <div>
            <h3>Ship</h3>
            <p className="section-copy">Select the frame carrying the squad into contact.</p>
          </div>
          <span className="section-selected">{selectedShip?.name ?? "—"}</span>
        </div>
        <div className="hangar-strip">
          {ownedShips.map((ship) => (
            <div
              key={ship.id}
              className={`card ship-card ${ship.id === save.selectedShipId ? "selected" : ""}`}
              onClick={() => selectShip(ship.id)}
            >
              <CardArt
                title={ship.name}
                artUrl={ship.artUrl}
                artPlaceholder={ship.artPlaceholder}
              />
              <div className="card-info">
                <strong className="card-title">{ship.name}</strong>
                <div className="rarity-badge">{ship.className}</div>
                <div className="stats-row">
                  <span>MOB {ship.stats.mobility}</span>
                  <span>FIR {ship.stats.firepower}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map selection */}
      <section className="hangar-section hangar-stage-section">
        <div className="section-head">
          <div>
            <h3>Route</h3>
            <p className="section-copy">Decide which combat lane you are about to survive.</p>
          </div>
          <span className="section-selected">{selectedMap?.name ?? "—"}</span>
        </div>
        <div className="hangar-strip">
          {SHMUP_MAPS.map((map) => (
            <button
              key={map.id}
              type="button"
              className={`map-card ${save.selectedMapId === map.id ? "selected" : ""}`}
              onClick={() => selectMap(map.id)}
            >
              <div
                className="map-card-glow"
                style={{
                  background: `linear-gradient(150deg, ${map.palette.backgroundTop}, ${map.palette.backgroundBottom})`,
                }}
              />
              <div className="map-card-info">
                <strong className="map-card-title">{map.name}</strong>
                <span className="map-card-meta">{map.tagline}</span>
                <span className="map-card-meta">Boss: {map.bossName}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Outfit selection */}
      <section className="hangar-section hangar-stage-section">
        <div className="section-head">
          <div>
            <h3>Outfit</h3>
            <p className="section-copy">Lock the visual identity and combat kit for this deployment.</p>
          </div>
          <label className="outfit-filter-toggle">
            <input
              type="checkbox"
              checked={showAllOutfits}
              onChange={(event) => setShowAllOutfits(event.currentTarget.checked)}
            />
            All pilots
          </label>
        </div>
        {showAllOutfits ? (
          <div className="outfit-groups">
            {universalOutfits.length > 0 && (
              <div className="outfit-group">
                <div className="outfit-group-head">
                  <h4>Universal</h4>
                  <span className="outfit-group-count">{universalOutfits.length}</span>
                </div>
                <div className="hangar-strip hangar-strip-wrap">
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
                <div className="hangar-strip hangar-strip-wrap">
                  {group.outfits.map(renderOutfitCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hangar-strip hangar-strip-wrap">
            {displayedOutfits.map(renderOutfitCard)}
          </div>
        )}
        {kitWarning && <p className="kit-warning">{kitWarning}</p>}
        {ownedOutfits.length === 0 && (
          <p className="empty-msg">No outfits owned yet.</p>
        )}
      </section>

      <section className="hangar-launch-panel panel-surface">
        <div className="hangar-launch-head">
          <div>
            <span className="hangar-kicker">Launch package</span>
            <h2 className="hangar-launch-title">Final readout</h2>
          </div>
          <button
            className="btn btn-text deploy-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide systems ▴" : "Show systems ▾"}
          </button>
        </div>

        <div className="deploy-bar-selections">
          <span className="deploy-chip">{selectedPilot?.name ?? "Pilot?"}</span>
          <span className="deploy-chip-sep">/</span>
          <span className="deploy-chip">{selectedShip?.name ?? "Ship?"}</span>
          <span className="deploy-chip-sep">/</span>
          <span className="deploy-chip">{selectedMap?.name ?? "Route?"}</span>
          <span className="deploy-chip-sep">/</span>
          <span className="deploy-chip">{selectedOutfit ? `${selectedOutfit.name}${selectedOwned ? ` ${selectedOwned.stars}★` : ""}` : "Base loadout"}</span>
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

        <div className="hangar-launch-row">
          <p className="hangar-launch-copy">
            {selectedMap ? `Route locked for ${selectedMap.name}.` : "Lock the route, then launch."} {selectedPilot && selectedShip ? "Squad is almost ready." : "Pilot and ship assignment still incomplete."}
          </p>
          <button
            className="btn btn-primary btn-large deploy-btn"
            onClick={() => {
              navigate("/briefing");
            }}
            disabled={!save.selectedPilotId || !save.selectedShipId}
          >
            Launch Mission
          </button>
        </div>
      </section>

    </div>
  );
}
