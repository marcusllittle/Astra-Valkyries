/**
 * Global game state using React Context + localStorage persistence.
 * Manages credits, owned items, selections, settings, and high scores.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { SaveData, OwnedOutfit, GameSettings, GameResult, GachaResult } from "../types";
import pilotsData from "../data/pilots.json";
import { SHARD_THRESHOLDS } from "../lib/gacha";

const STORAGE_KEY = "rhythm-jet-squadron-save";

const DEFAULT_SETTINGS: GameSettings = {
  noteSpeed: 400,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  showFPS: false,
};

/** Default save data: all pilots unlocked, 1 starter outfit, some credits */
function getDefaultSave(): SaveData {
  return {
    credits: 500,
    ownedPilots: pilotsData.map((p) => p.id),
    ownedOutfits: [
      { outfitId: "outfit_01", stars: 1, shards: 0 }, // Standard Flight Suit
    ],
    selectedPilotId: pilotsData[0].id,
    selectedOutfitId: "outfit_01",
    highScores: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    // Merge with defaults for forward compatibility
    return {
      ...getDefaultSave(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return getDefaultSave();
  }
}

// ─── Context shape ──────────────────────────────────────

interface GameContextValue {
  save: SaveData;
  // Selection
  selectPilot: (id: string) => void;
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
  // Reset
  resetSave: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData>(loadSave);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [save]);

  const selectPilot = useCallback((id: string) => {
    setSave((s) => ({ ...s, selectedPilotId: id }));
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
        credits: s.credits + result.creditsEarned,
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

  const resetSave = useCallback(() => {
    setSave(getDefaultSave());
  }, []);

  return (
    <GameContext.Provider
      value={{
        save,
        selectPilot,
        selectOutfit,
        addCredits,
        spendCredits,
        applyGachaResults,
        upgradeOutfit,
        submitResult,
        updateSettings,
        resetSave,
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
