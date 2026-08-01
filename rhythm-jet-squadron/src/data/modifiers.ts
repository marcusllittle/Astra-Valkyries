/** Run modifiers — optional difficulty/fun adjustments */

export interface RunModifier {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "difficulty" | "fun" | "challenge";
  effects: {
    enemyHpMult?: number;
    enemySpeedMult?: number;
    playerDamageMult?: number;
    playerHpMult?: number;
    scoreMult?: number;
    bulletSpeedMult?: number;
    spawnRateMult?: number;
  };
}

/** Every effect a run modifier can apply, with no-op defaults. */
export interface CombinedModifierEffects {
  enemyHpMult: number;
  enemySpeedMult: number;
  playerDamageMult: number;
  playerHpMult: number;
  scoreMult: number;
  bulletSpeedMult: number;
  spawnRateMult: number;
}

export const NEUTRAL_MODIFIER_EFFECTS: CombinedModifierEffects = {
  enemyHpMult: 1,
  enemySpeedMult: 1,
  playerDamageMult: 1,
  playerHpMult: 1,
  scoreMult: 1,
  bulletSpeedMult: 1,
  spawnRateMult: 1,
};

export function getModifierById(id: string): RunModifier | undefined {
  return RUN_MODIFIERS.find((m) => m.id === id);
}

/**
 * Fold the selected modifiers into one set of multipliers.
 *
 * Stacked modifiers multiply, so picking two score-boosting ones compounds
 * rather than taking the larger. Unknown ids are ignored so a stale save
 * cannot break a run.
 */
export function combineModifierEffects(ids: string[] | undefined): CombinedModifierEffects {
  const combined = { ...NEUTRAL_MODIFIER_EFFECTS };
  if (!ids?.length) return combined;

  for (const id of ids) {
    const mod = getModifierById(id);
    if (!mod) continue;
    for (const key of Object.keys(combined) as (keyof CombinedModifierEffects)[]) {
      const value = mod.effects[key];
      if (typeof value === "number") combined[key] *= value;
    }
  }
  return combined;
}

/** Net score swing from the selected modifiers, as a signed percentage. */
export function getScoreSwingPercent(ids: string[] | undefined): number {
  return Math.round((combineModifierEffects(ids).scoreMult - 1) * 100);
}

export const RUN_MODIFIERS: RunModifier[] = [
  {
    id: "double-trouble",
    name: "Double Trouble",
    description: "Enemies have 2x HP, but score is doubled",
    icon: "⚔",
    category: "difficulty",
    effects: { enemyHpMult: 2.0, scoreMult: 2.0 },
  },
  {
    id: "glass-cannon",
    name: "Glass Cannon",
    description: "Deal 2x damage, but take 2x damage",
    icon: "💎",
    category: "challenge",
    effects: { playerDamageMult: 2.0, playerHpMult: 0.5 },
  },
  {
    id: "bullet-hell",
    name: "Bullet Hell",
    description: "Enemy bullets 50% faster. Score +50%",
    icon: "🔥",
    category: "difficulty",
    effects: { bulletSpeedMult: 1.5, scoreMult: 1.5 },
  },
  {
    id: "swarm-mode",
    name: "Swarm Mode",
    description: "50% more enemies spawn. Score +75%",
    icon: "🐝",
    category: "difficulty",
    effects: { spawnRateMult: 1.5, scoreMult: 1.75 },
  },
  {
    id: "relaxed",
    name: "Relaxed",
    description: "Enemies have 50% HP and move slower. Score -50%",
    icon: "☮",
    category: "fun",
    effects: { enemyHpMult: 0.5, enemySpeedMult: 0.7, scoreMult: 0.5 },
  },
  {
    id: "one-hit-wonder",
    name: "One Hit Wonder",
    description: "Player dies in one hit. Score x3",
    icon: "💀",
    category: "challenge",
    effects: { playerHpMult: 0, scoreMult: 3.0 },
  },
];
