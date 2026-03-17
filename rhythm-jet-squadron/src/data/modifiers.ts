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
