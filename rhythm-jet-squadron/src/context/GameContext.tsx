/**
 * Global game state using React Context + localStorage persistence.
 * Manages credits, owned items, selections, settings, and high scores.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { SaveData, OwnedOutfit, GameSettings, GameResult, GachaResult, ActiveCutscene } from "../types";
import pilotsData from "../data/pilots.json";
import shipsData from "../data/ships.json";
import outfitsData from "../data/outfits.json";
import { SHARD_THRESHOLDS } from "../lib/gacha";
import { SHMUP_MAPS } from "../lib/shmupWaves";
import {
  checkAchievements,
  loadUnlocked,
  type Achievement,
  type UnlockedAchievements,
} from "../lib/achievements";

const STORAGE_KEY = "astra-valkyries-save";

const DEFAULT_SETTINGS: GameSettings = {
  noteSpeed: 400,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  showFPS: false,
};

function getStarterOutfits(): OwnedOutfit[] {
  const commons = outfitsData
    .filter((outfit) => outfit.rarity === "Common")
    .slice(0, 3)
    .map((outfit) => outfit.id);
  const rares = outfitsData.filter((outfit) => outfit.rarity === "Rare");
  const srPilotSpecific = outfitsData.filter(
    (outfit) => outfit.rarity === "SR" && Boolean(outfit.pilotId)
  );

  const rare = rares[Math.floor(Math.random() * rares.length)];
  const sr = srPilotSpecific[Math.floor(Math.random() * srPilotSpecific.length)];

  const starterIds = [commons[0], commons[1], commons[2], rare?.id, sr?.id].filter(
    (id): id is string => Boolean(id)
  );

  return [...new Set(starterIds)].map((outfitId) => ({
    outfitId,
    stars: 1,
    shards: 0,
  }));
}

/** Default save data: all pilots and ships unlocked, starter outfit bundle, some credits */
function getDefaultSave(): SaveData {
  const starterOutfits = getStarterOutfits();
  return {
    credits: 500,
    ownedPilots: pilotsData.map((p) => p.id),
    ownedShips: shipsData.map((ship) => ship.id),
    ownedOutfits: starterOutfits,
    selectedPilotId: pilotsData[0].id,
    selectedShipId: shipsData[0].id,
    selectedMapId: SHMUP_MAPS[0]?.id ?? null,
    selectedOutfitId: starterOutfits[0]?.outfitId ?? null,
    highScores: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    const defaultSave = getDefaultSave();
    const validMapIds = new Set(SHMUP_MAPS.map((map) => map.id));
    const selectedMapId =
      parsed.selectedMapId && validMapIds.has(parsed.selectedMapId)
        ? parsed.selectedMapId
        : defaultSave.selectedMapId;
    // Merge with defaults for forward compatibility
    return {
      ...defaultSave,
      ...parsed,
      selectedMapId,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return getDefaultSave();
  }
}

// ─── Context shape ──────────────────────────────────────

interface GameContextValue {
  save: SaveData;
  activeCutscene: ActiveCutscene | null;
  // Selection
  selectPilot: (id: string) => void;
  selectShip: (id: string) => void;
  selectMap: (id: string) => void;
  selectOutfit: (id: string) => void;
  // Economy
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  // Gacha results
  applyGachaResults: (results: GachaResult[]) => void;
  // Outfit upgrade
  upgradeOutfit: (outfitId: string) => boolean;
  // Score
  submitResult: (result: GameResult) => void;
  // Settings
  updateSettings: (partial: Partial<GameSettings>) => void;
  clearDeployCutscene: () => void;
  // Reset
  resetSave: () => void;
  // Achievements
  unlockedAchievements: UnlockedAchievements;
  pendingAchievement: Achievement | null;
  dismissAchievement: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [activeCutscene, setActiveCutscene] = useState<ActiveCutscene | null>(null);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [save]);

  // Check achievements on save change
  useEffect(() => {
    const { newlyUnlocked, allUnlocked } = checkAchievements(save, unlockedAchievements);
    if (newlyUnlocked.length > 0) {
      setUnlockedAchievements(allUnlocked);
      if (!pendingAchievement) {
        setPendingAchievement(newlyUnlocked[0]);
        achievementQueueRef.push(...newlyUnlocked.slice(1));
      } else {
        achievementQueueRef.push(...newlyUnlocked);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const selectPilot = useCallback((id: string) => {
    setSave((s) => ({ ...s, selectedPilotId: id }));
  }, []);

  const selectShip = useCallback((id: string) => {
    setSave((s) => ({ ...s, selectedShipId: id }));
  }, []);

  const selectMap = useCallback((id: string) => {
    setSave((s) => ({ ...s, selectedMapId: id }));
  }, []);

  const selectOutfit = useCallback((id: string) => {
    setSave((s) => ({ ...s, selectedOutfitId: id }));
  }, []);

  const addCredits = useCallback((amount: number) => {
    setSave((s) => ({ ...s, credits: s.credits + amount }));
  }, []);

  const spendCredits = useCallback((amount: number): boolean => {
    let success = false;
    setSave((s) => {
      if (s.credits >= amount) {
        success = true;
        return { ...s, credits: s.credits - amount };
      }
      return s;
    });
    return success;
  }, []);

  const applyGachaResults = useCallback((results: GachaResult[]) => {
    setSave((s) => {
      const newOutfits = [...s.ownedOutfits];
      for (const r of results) {
        const existing = newOutfits.find((o) => o.outfitId === r.outfit.id);
        if (existing) {
          existing.shards += r.shardsGained;
        } else if (r.isNew) {
          newOutfits.push({ outfitId: r.outfit.id, stars: 1, shards: 0 });
        }
      }
      return { ...s, ownedOutfits: newOutfits };
    });
  }, []);

  const upgradeOutfit = useCallback((outfitId: string): boolean => {
    let success = false;
    setSave((s) => {
      const newOutfits = s.ownedOutfits.map((o) => {
        if (o.outfitId !== outfitId) return o;
        if (o.stars >= 5) return o;
        const threshold = SHARD_THRESHOLDS[o.stars + 1];
        if (o.shards < threshold) return o;
        success = true;
        return { ...o, stars: o.stars + 1, shards: o.shards - threshold };
      });
      return { ...s, ownedOutfits: newOutfits };
    });
    return success;
  }, []);

  const submitResult = useCallback((result: GameResult) => {
    setSave((s) => {
      const best = s.highScores[result.trackId] ?? 0;
      return {
        ...s,
        credits: s.credits + (result.mode === "rhythm" ? result.creditsEarned : 0),
        highScores: {
          ...s.highScores,
          [result.trackId]: Math.max(best, result.score),
        },
      };
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSave((s) => ({
      ...s,
      settings: { ...s.settings, ...partial },
    }));
  }, []);

  const clearDeployCutscene = useCallback(() => {
    setActiveCutscene(null);
  }, []);

  const resetSave = useCallback(() => {
    setSave(getDefaultSave());
  }, []);

  return (
    <GameContext.Provider
      value={{
        save,
        activeCutscene,
        selectPilot,
        selectShip,
        selectMap,
        selectOutfit,
        addCredits,
        spendCredits,
        applyGachaResults,
        upgradeOutfit,
        submitResult,
        updateSettings,
        clearDeployCutscene,
        resetSave,
        unlockedAchievements,
        pendingAchievement,
        dismissAchievement,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
