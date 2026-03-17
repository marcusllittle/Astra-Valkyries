/**
 * Global game state using React Context + localStorage persistence.
 * Manages credits, owned items, selections, settings, and high scores.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { SaveData, OwnedOutfit, GameSettings, GameResult, GachaResult } from "../types";
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
import { getLevelForXp, calculateRunXp } from "../lib/progression";
import { getDailyMissions, getWeeklyMissions } from "../lib/missions";

const STORAGE_KEY = "astra-valkyries-save";

const DEFAULT_SETTINGS: GameSettings = {
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
    pilotXp: {},
    pilotLevel: {},
    bestGrades: {},
    totalRuns: 0,
    totalKills: 0,
    totalBossKills: 0,
    missionProgress: {},
    missionsClaimed: [],
    lastDailyReset: 0,
    lastWeeklyReset: 0,
    metaCurrency: 0,
    selectedModifiers: [],
    seenCutscenes: [],
    zoneClears: {},
    pilotSkills: {},
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
  // Progression
  addPilotXp: (pilotId: string, xp: number) => void;
  submitRunStats: (stats: { pilotId: string; mapId: string; score: number; kills: number; grade: string; bossDefeated: boolean }) => void;
  setSelectedModifiers: (modifiers: string[]) => void;
  claimMission: (missionId: string) => { credits: number; xp: number } | null;
  // Narrative
  markCutsceneSeen: (id: string) => void;
  recordZoneClear: (mapId: string) => void;
  // Skill tree
  unlockSkill: (pilotId: string, skillId: string) => void;
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
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievements>(loadUnlocked);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const achievementQueueRef = useState<Achievement[]>([])[0];

  const dismissAchievement = useCallback(() => {
    setPendingAchievement(null);
    // Show next queued achievement if any
    if (achievementQueueRef.length > 0) {
      const next = achievementQueueRef.shift()!;
      setTimeout(() => setPendingAchievement(next), 300);
    }
  }, [achievementQueueRef]);

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

  const addPilotXp = useCallback((pilotId: string, xp: number) => {
    setSave((s) => {
      const newXp = (s.pilotXp[pilotId] ?? 0) + xp;
      const newLevel = getLevelForXp(newXp);
      return {
        ...s,
        pilotXp: { ...s.pilotXp, [pilotId]: newXp },
        pilotLevel: { ...s.pilotLevel, [pilotId]: newLevel },
      };
    });
  }, []);

  const submitRunStats = useCallback((stats: { pilotId: string; mapId: string; score: number; kills: number; grade: string; bossDefeated: boolean }) => {
    const xpEarned = calculateRunXp(stats.score, stats.kills, stats.grade, stats.bossDefeated);
    setSave((s) => {
      const newXp = (s.pilotXp[stats.pilotId] ?? 0) + xpEarned;
      const newLevel = getLevelForXp(newXp);
      const currentBestGrade = s.bestGrades[stats.mapId];
      const gradeOrder = ["S", "A", "B", "C", "D"];
      const newGradeIdx = gradeOrder.indexOf(stats.grade);
      const oldGradeIdx = currentBestGrade ? gradeOrder.indexOf(currentBestGrade) : 999;
      const bestGrade = newGradeIdx <= oldGradeIdx ? stats.grade : (currentBestGrade ?? stats.grade);
      return {
        ...s,
        pilotXp: { ...s.pilotXp, [stats.pilotId]: newXp },
        pilotLevel: { ...s.pilotLevel, [stats.pilotId]: newLevel },
        bestGrades: { ...s.bestGrades, [stats.mapId]: bestGrade },
        totalRuns: s.totalRuns + 1,
        totalKills: s.totalKills + stats.kills,
        totalBossKills: s.totalBossKills + (stats.bossDefeated ? 1 : 0),
      };
    });
  }, []);

  const setSelectedModifiers = useCallback((modifiers: string[]) => {
    setSave((s) => ({ ...s, selectedModifiers: modifiers }));
  }, []);

  const claimMission = useCallback((missionId: string): { credits: number; xp: number } | null => {
    const allMissions = [...getDailyMissions(), ...getWeeklyMissions()];
    const mission = allMissions.find(m => m.id === missionId);
    if (!mission) return null;
    let reward: { credits: number; xp: number } | null = null;
    setSave((s) => {
      if (s.missionsClaimed.includes(missionId)) return s;
      const progress = s.missionProgress[missionId] ?? 0;
      if (progress < mission.target) return s;
      reward = mission.reward;
      return {
        ...s,
        credits: s.credits + mission.reward.credits,
        metaCurrency: s.metaCurrency + Math.floor(mission.reward.xp / 10),
        missionsClaimed: [...s.missionsClaimed, missionId],
      };
    });
    return reward;
  }, []);

  const markCutsceneSeen = useCallback((id: string) => {
    setSave((s) => {
      if (s.seenCutscenes.includes(id)) return s;
      return { ...s, seenCutscenes: [...s.seenCutscenes, id] };
    });
  }, []);

  const recordZoneClear = useCallback((mapId: string) => {
    setSave((s) => ({
      ...s,
      zoneClears: { ...s.zoneClears, [mapId]: (s.zoneClears[mapId] ?? 0) + 1 },
    }));
  }, []);

  const unlockSkill = useCallback((pilotId: string, skillId: string) => {
    setSave((s) => {
      const current = s.pilotSkills[pilotId] ?? [];
      if (current.includes(skillId)) return s;
      return {
        ...s,
        pilotSkills: { ...s.pilotSkills, [pilotId]: [...current, skillId] },
      };
    });
  }, []);

  const resetSave = useCallback(() => {
    setSave(getDefaultSave());
  }, []);

  return (
    <GameContext.Provider
      value={{
        save,
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
        addPilotXp,
        submitRunStats,
        setSelectedModifiers,
        claimMission,
        markCutsceneSeen,
        recordZoneClear,
        unlockSkill,
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
