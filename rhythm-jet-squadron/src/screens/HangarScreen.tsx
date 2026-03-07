/**
 * Hangar Screen - Pilot and outfit selection before playing.
 */

import { useEffect, useState } from "react";
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
  const [kitWarning, setKitWarning] = useState<string | null>(null);
  const [showAllOutfits, setShowAllOutfits] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(SHOW_ALL_OUTFITS_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SHOW_ALL_OUTFITS_STORAGE_KEY, showAllOutfits ? "1" : "0");
  }, [showAllOutfits]);

  const pilots = pilotsData as Pilot[];
  const ships = shipsData as Ship[];
  const allOutfits = outfitsData as Outfit[];
  const ownedShips = ships.filter((ship) => save.ownedShips.includes(ship.id));
  const pilotNameById = new Map(pilots.map((item) => [item.id, item.name]));

  // Only show owned outfits
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
    if (!selectedPilotId) {
      return true;
    }
    if (!outfit.pilotId) {
      return true;
    }
    if ((outfit.rarity === "SR" || outfit.rarity === "SSR") && outfit.pilotId !== selectedPilotId) {
      return false;
    }
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
        } ${
          outfit.id === save.selectedOutfitId ? "selected" : ""
        }`}
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
          artPlaceholder={outfit.artPlaceholder}
          rarity={outfit.rarity}
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
          {outfit.pilotId && (
            <div className="rarity-badge">
              Pilot-Specific: {pilotNameById.get(outfit.pilotId) ?? outfit.pilotId}
            </div>
          )}
          <div className="perk-label">{summarizeOutfitKit(outfit)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="screen hangar-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <div className="header-title-stack">
          <h2>Loadout</h2>
          <p>Configure pilot, ship, and outfit before deployment.</p>
        </div>
      </div>

      {/* Pilot selection */}
      <section className="hangar-section panel-surface">
        <div className="section-head">
          <h3>Select Pilot</h3>
          <p>{selectedPilot?.name ?? "Choose your lead pilot"}</p>
        </div>
        <div className="card-grid loadout-grid">
          {pilots.map((pilot) => (
            <div
              key={pilot.id}
              className={`card pilot-card ${pilot.id === save.selectedPilotId ? "selected" : ""}`}
              onClick={() => {
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

      <section className="hangar-section panel-surface">
        <div className="section-head">
          <h3>Select Ship</h3>
          <p>{selectedShip?.name ?? "Select frame class and systems profile"}</p>
        </div>
        <div className="card-grid loadout-grid">
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
                <div className="rarity-badge">{ship.className} / {ship.manufacturer}</div>
                <div className="stats-row">
                  <span>MOB {ship.stats.mobility}</span>
                  <span>FIR {ship.stats.firepower}</span>
                  <span>CTL {ship.stats.control}</span>
                </div>
                <div className="perk-label">{ship.trait.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hangar-section panel-surface">
        <div className="section-head">
          <h3>Select Map</h3>
          <p>{selectedMap?.name ?? "Choose operation zone and boss profile"}</p>
        </div>
        <div className="map-select-grid">
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
                <span className="map-card-meta">Boss: {map.bossName}</span>
                <span className="map-card-meta">Warning at {Math.round(map.bossTriggerMs / 1000)}s</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Outfit selection */}
      <section className="hangar-section panel-surface">
        <div className="section-head">
          <div className="section-head-main">
            <h3>Select Outfit</h3>
            <p>{selectedOutfit?.name ?? "Equip cosmetic + kit profile"}</p>
          </div>
          <label className="outfit-filter-toggle">
            <input
              type="checkbox"
              checked={showAllOutfits}
              onChange={(event) => setShowAllOutfits(event.currentTarget.checked)}
            />
            Show all pilots
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
                <div className="card-grid loadout-grid">
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
                <div className="card-grid loadout-grid">
                  {group.outfits.map(renderOutfitCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-grid loadout-grid">
            {displayedOutfits.map(renderOutfitCard)}
          </div>
        )}
        {kitWarning && <p className="kit-warning">{kitWarning}</p>}
        {ownedOutfits.length === 0 && (
          <p className="empty-msg">No outfits owned. Visit the Shop!</p>
        )}
      </section>

      {/* Summary and proceed */}
      <div className="hangar-summary hangar-summary-sticky">
        <div className="summary-topline">
          <div className="summary-pill">
            <span className="summary-label">Pilot</span>
            <strong>{selectedPilot?.name ?? "None"}</strong>
          </div>
          <div className="summary-pill">
            <span className="summary-label">Ship</span>
            <strong>{selectedShip?.name ?? "None"}</strong>
          </div>
          <div className="summary-pill">
            <span className="summary-label">Map</span>
            <strong>{selectedMap?.name ?? "None"}</strong>
          </div>
          <div className="summary-pill">
            <span className="summary-label">Outfit</span>
            <strong>{selectedOutfit?.name ?? "None"}{selectedOwned ? ` (${selectedOwned.stars}★)` : ""}</strong>
          </div>
        </div>
        <div className="summary-item summary-item-wide">
          <span className="summary-label">Frame Identity</span>
          <span>{loadout.identityLine}</span>
        </div>
        <div className="summary-item summary-item-wide">
          <span className="summary-label">Kit</span>
          <span>{kitSummary}</span>
        </div>
        <div className="summary-item summary-item-wide">
          <span className="summary-label">Scoring</span>
          <span>{loadout.multiplierLine}</span>
        </div>
        <div className="summary-item summary-item-wide">
          <span className="summary-label">Survivability</span>
          <span>{loadout.survivabilityLine}</span>
        </div>
        <div className="summary-item summary-item-wide">
          <span className="summary-label">Systems</span>
          <span>{loadout.systemsLine}</span>
        </div>
        <div className="hangar-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate("/shmup")}
            disabled={!save.selectedPilotId || !save.selectedShipId}
          >
            Deploy Ship
          </button>
        </div>
      </div>
    </div>
  );
}
