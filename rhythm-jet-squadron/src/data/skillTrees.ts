/** Pilot skill trees - each pilot has 3 branches with 4 nodes each */

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  branch: number; // 0, 1, 2
  tier: number;   // 0-3 (0 = first unlock)
  cost: number;   // skill points required
  effect: {
    type: "damage" | "hp" | "overdrive" | "firerate" | "score" | "crit" | "shield" | "speed" | "special";
    value: number;
    description: string;
  };
  prerequisite?: string; // skill node ID required before this can be unlocked
}

export interface PilotSkillTree {
  pilotId: string;
  branches: { name: string; description: string }[];
  nodes: SkillNode[];
}

export const PILOT_SKILL_TREES: PilotSkillTree[] = [
  {
    pilotId: "pilot_nova",
    branches: [
      { name: "Velocity", description: "Speed and evasion focused" },
      { name: "Precision", description: "Damage and critical hits" },
      { name: "Instinct", description: "Overdrive and combo bonuses" },
    ],
    nodes: [
      // Velocity branch
      { id: "nova_v1", name: "Quick Thrusters", description: "+5% move speed", branch: 0, tier: 0, cost: 1, effect: { type: "speed", value: 5, description: "+5% move speed" } },
      { id: "nova_v2", name: "Afterburner", description: "+10% move speed", branch: 0, tier: 1, cost: 2, effect: { type: "speed", value: 10, description: "+10% move speed" }, prerequisite: "nova_v1" },
      { id: "nova_v3", name: "Evasion Matrix", description: "+1 HP", branch: 0, tier: 2, cost: 3, effect: { type: "hp", value: 1, description: "+1 max HP" }, prerequisite: "nova_v2" },
      { id: "nova_v4", name: "Phantom Dodge", description: "Brief invulnerability on overdrive activation", branch: 0, tier: 3, cost: 4, effect: { type: "special", value: 1, description: "Overdrive grants 1s invulnerability" }, prerequisite: "nova_v3" },
      // Precision branch
      { id: "nova_p1", name: "Focused Fire", description: "+5% damage", branch: 1, tier: 0, cost: 1, effect: { type: "damage", value: 5, description: "+5% damage" } },
      { id: "nova_p2", name: "Weak Points", description: "+10% crit chance", branch: 1, tier: 1, cost: 2, effect: { type: "crit", value: 10, description: "+10% crit chance" }, prerequisite: "nova_p1" },
      { id: "nova_p3", name: "Armor Piercing", description: "+15% damage", branch: 1, tier: 2, cost: 3, effect: { type: "damage", value: 15, description: "+15% damage" }, prerequisite: "nova_p2" },
      { id: "nova_p4", name: "Perfect Aim", description: "+25% crit damage", branch: 1, tier: 3, cost: 4, effect: { type: "crit", value: 25, description: "+25% crit damage" }, prerequisite: "nova_p3" },
      // Instinct branch
      { id: "nova_i1", name: "Battle Sense", description: "+10% overdrive gain", branch: 2, tier: 0, cost: 1, effect: { type: "overdrive", value: 10, description: "+10% overdrive gain" } },
      { id: "nova_i2", name: "Kill Streak", description: "+10% score mult on streak", branch: 2, tier: 1, cost: 2, effect: { type: "score", value: 10, description: "+10% score on streaks" }, prerequisite: "nova_i1" },
      { id: "nova_i3", name: "Adrenaline Rush", description: "+15% fire rate in overdrive", branch: 2, tier: 2, cost: 3, effect: { type: "firerate", value: 15, description: "+15% fire rate in overdrive" }, prerequisite: "nova_i2" },
      { id: "nova_i4", name: "Zenith Mode", description: "Overdrive lasts 25% longer", branch: 2, tier: 3, cost: 4, effect: { type: "overdrive", value: 25, description: "+25% overdrive duration" }, prerequisite: "nova_i3" },
    ],
  },
  {
    pilotId: "pilot_rex",
    branches: [
      { name: "Arsenal", description: "Raw firepower" },
      { name: "Fortify", description: "Durability and shields" },
      { name: "Ordnance", description: "Secondary weapons and bombs" },
    ],
    nodes: [
      // Arsenal branch
      { id: "rex_a1", name: "Heavy Rounds", description: "+8% damage", branch: 0, tier: 0, cost: 1, effect: { type: "damage", value: 8, description: "+8% damage" } },
      { id: "rex_a2", name: "Overcharged", description: "+12% damage", branch: 0, tier: 1, cost: 2, effect: { type: "damage", value: 12, description: "+12% damage" }, prerequisite: "rex_a1" },
      { id: "rex_a3", name: "Rapid Salvo", description: "+10% fire rate", branch: 0, tier: 2, cost: 3, effect: { type: "firerate", value: 10, description: "+10% fire rate" }, prerequisite: "rex_a2" },
      { id: "rex_a4", name: "Devastation", description: "+20% damage to bosses", branch: 0, tier: 3, cost: 4, effect: { type: "damage", value: 20, description: "+20% boss damage" }, prerequisite: "rex_a3" },
      // Fortify branch
      { id: "rex_f1", name: "Reinforced Hull", description: "+1 HP", branch: 1, tier: 0, cost: 1, effect: { type: "hp", value: 1, description: "+1 max HP" } },
      { id: "rex_f2", name: "Ablative Armor", description: "+1 HP", branch: 1, tier: 1, cost: 2, effect: { type: "hp", value: 1, description: "+1 max HP" }, prerequisite: "rex_f1" },
      { id: "rex_f3", name: "Energy Shield", description: "Shield absorbs 1 hit every 30s", branch: 1, tier: 2, cost: 3, effect: { type: "shield", value: 1, description: "Auto-shield every 30s" }, prerequisite: "rex_f2" },
      { id: "rex_f4", name: "Titanium Core", description: "+2 HP, -5% speed", branch: 1, tier: 3, cost: 4, effect: { type: "hp", value: 2, description: "+2 HP, -5% speed" }, prerequisite: "rex_f3" },
      // Ordnance branch
      { id: "rex_o1", name: "Bomb Expert", description: "+20% bomb damage", branch: 2, tier: 0, cost: 1, effect: { type: "damage", value: 20, description: "+20% bomb damage" } },
      { id: "rex_o2", name: "Extra Payload", description: "+1 bomb charge", branch: 2, tier: 1, cost: 2, effect: { type: "special", value: 1, description: "+1 bomb charge" }, prerequisite: "rex_o1" },
      { id: "rex_o3", name: "Cluster Munitions", description: "Bombs split into 3", branch: 2, tier: 2, cost: 3, effect: { type: "special", value: 3, description: "Bombs cluster" }, prerequisite: "rex_o2" },
      { id: "rex_o4", name: "Tactical Nuke", description: "Bomb radius +50%", branch: 2, tier: 3, cost: 4, effect: { type: "special", value: 50, description: "+50% bomb radius" }, prerequisite: "rex_o3" },
    ],
  },
  {
    pilotId: "pilot_yuki",
    branches: [
      { name: "Stealth", description: "Evasion and positioning" },
      { name: "Technician", description: "Score and resource bonuses" },
      { name: "Cryo-Ops", description: "Crowd control effects" },
    ],
    nodes: [
      // Stealth branch
      { id: "yuki_s1", name: "Ghost Step", description: "+3% move speed", branch: 0, tier: 0, cost: 1, effect: { type: "speed", value: 3, description: "+3% move speed" } },
      { id: "yuki_s2", name: "Cloak Field", description: "Extended invulnerability", branch: 0, tier: 1, cost: 2, effect: { type: "special", value: 500, description: "+0.5s invuln on hit" }, prerequisite: "yuki_s1" },
      { id: "yuki_s3", name: "Shadow Strike", description: "+15% damage from behind", branch: 0, tier: 2, cost: 3, effect: { type: "damage", value: 15, description: "+15% damage" }, prerequisite: "yuki_s2" },
      { id: "yuki_s4", name: "Vanishing Act", description: "Phasing through bullets briefly", branch: 0, tier: 3, cost: 4, effect: { type: "special", value: 1, description: "Phase through bullets" }, prerequisite: "yuki_s3" },
      // Technician branch
      { id: "yuki_t1", name: "Scavenger", description: "+20% drop rate", branch: 1, tier: 0, cost: 1, effect: { type: "score", value: 20, description: "+20% drop rate" } },
      { id: "yuki_t2", name: "Data Link", description: "+15% score", branch: 1, tier: 1, cost: 2, effect: { type: "score", value: 15, description: "+15% score" }, prerequisite: "yuki_t1" },
      { id: "yuki_t3", name: "EW Suite", description: "Enemy bullets 10% slower", branch: 1, tier: 2, cost: 3, effect: { type: "special", value: 10, description: "Slow enemy bullets 10%" }, prerequisite: "yuki_t2" },
      { id: "yuki_t4", name: "Intel Override", description: "+25% score, see enemy HP", branch: 1, tier: 3, cost: 4, effect: { type: "score", value: 25, description: "+25% score" }, prerequisite: "yuki_t3" },
      // Cryo-Ops branch
      { id: "yuki_c1", name: "Frost Rounds", description: "Shots slow enemies 5%", branch: 2, tier: 0, cost: 1, effect: { type: "special", value: 5, description: "5% slow" } },
      { id: "yuki_c2", name: "Ice Burst", description: "Kill explosions slow nearby", branch: 2, tier: 1, cost: 2, effect: { type: "special", value: 10, description: "AoE slow on kill" }, prerequisite: "yuki_c1" },
      { id: "yuki_c3", name: "Cryo Bomb", description: "Secondary freezes enemies", branch: 2, tier: 2, cost: 3, effect: { type: "special", value: 1, description: "Freeze on bomb" }, prerequisite: "yuki_c2" },
      { id: "yuki_c4", name: "Absolute Zero", description: "Overdrive freezes all enemies 2s", branch: 2, tier: 3, cost: 4, effect: { type: "special", value: 2, description: "Overdrive freeze" }, prerequisite: "yuki_c3" },
    ],
  },
];

export function getSkillTree(pilotId: string): PilotSkillTree | undefined {
  return PILOT_SKILL_TREES.find(t => t.pilotId === pilotId);
}

export function getSkillPointsForLevel(level: number): number {
  // 1 skill point every 2 levels starting at level 2
  return Math.floor(level / 2);
}

export function getSpentPoints(unlockedSkills: string[], pilotId: string): number {
  const tree = getSkillTree(pilotId);
  if (!tree) return 0;
  return tree.nodes
    .filter(n => unlockedSkills.includes(n.id))
    .reduce((sum, n) => sum + n.cost, 0);
}

export function canUnlockSkill(nodeId: string, pilotId: string, unlockedSkills: string[], availablePoints: number): boolean {
  const tree = getSkillTree(pilotId);
  if (!tree) return false;
  const node = tree.nodes.find(n => n.id === nodeId);
  if (!node) return false;
  if (unlockedSkills.includes(nodeId)) return false;
  if (node.prerequisite && !unlockedSkills.includes(node.prerequisite)) return false;
  return availablePoints >= node.cost;
}
