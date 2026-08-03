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
      // Velocity branch — grazing danger is rewarded, not just avoided.
      // Fits her perk (smaller hitbox) and her lore (flies closer to fire
      // than anyone should) instead of being three unrelated speed numbers.
      { id: "nova_v1", name: "Close Call", description: "Grazing a bullet without taking the hit charges your overdrive.", branch: 0, tier: 0, cost: 1, effect: { type: "special", value: 4, description: "Grazes charge overdrive" } },
      { id: "nova_v2", name: "Adrenaline Line", description: "Grazes also grant a brief burst of speed.", branch: 0, tier: 1, cost: 2, effect: { type: "special", value: 1, description: "Grazes grant a speed burst" }, prerequisite: "nova_v1" },
      { id: "nova_v3", name: "Razor's Edge", description: "Grazes also grant a brief burst of damage.", branch: 0, tier: 2, cost: 3, effect: { type: "special", value: 1, description: "Grazes grant a damage burst" }, prerequisite: "nova_v2" },
      { id: "nova_v4", name: "Phantom Dodge", description: "Brief invulnerability on overdrive activation", branch: 0, tier: 3, cost: 4, effect: { type: "special", value: 1, description: "Overdrive grants 1s invulnerability" }, prerequisite: "nova_v3" },
      // Precision branch — crit identity starts at tier 0 instead of
      // tier 1, and the old flat "+15% damage" becomes what a crit branch
      // should actually give you: crits that punch through their target.
      { id: "nova_p1", name: "Target Lock", description: "+6% crit chance", branch: 1, tier: 0, cost: 1, effect: { type: "crit", value: 6, description: "+6% crit chance" } },
      { id: "nova_p2", name: "Weak Points", description: "+10% crit chance", branch: 1, tier: 1, cost: 2, effect: { type: "crit", value: 10, description: "+10% crit chance" }, prerequisite: "nova_p1" },
      { id: "nova_p3", name: "Armor Piercing", description: "Critical hits pierce through their target.", branch: 1, tier: 2, cost: 3, effect: { type: "special", value: 1, description: "Crits pierce to a second target" }, prerequisite: "nova_p2" },
      { id: "nova_p4", name: "Perfect Aim", description: "+25% crit damage", branch: 1, tier: 3, cost: 4, effect: { type: "crit", value: 25, description: "+25% crit damage" }, prerequisite: "nova_p3" },
      // Instinct branch — overdrive as a moment, not a meter. Activating
      // it is now a panic-button shockwave, and streak kills feed the
      // meter directly instead of only nudging the score multiplier.
      { id: "nova_i1", name: "Battle Sense", description: "Activating overdrive clears nearby enemy fire.", branch: 2, tier: 0, cost: 1, effect: { type: "special", value: 1, description: "Overdrive clears nearby bullets" } },
      { id: "nova_i2", name: "Kill Streak", description: "Kills during an active streak also charge overdrive.", branch: 2, tier: 1, cost: 2, effect: { type: "special", value: 3, description: "Streak kills charge overdrive" }, prerequisite: "nova_i1" },
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
      // Arsenal branch — his perk is chain growth, so his guns escalate on
      // a kill streak instead of just being three flat damage numbers.
      { id: "rex_a1", name: "Kill Momentum", description: "Each kill grants a brief fire-rate surge.", branch: 0, tier: 0, cost: 1, effect: { type: "special", value: 1, description: "Kills surge fire rate" } },
      { id: "rex_a2", name: "Overcharged", description: "Kills shave time off your secondary's cooldown.", branch: 0, tier: 1, cost: 2, effect: { type: "special", value: 1, description: "Kills cut secondary cooldown" }, prerequisite: "rex_a1" },
      { id: "rex_a3", name: "Rapid Salvo", description: "Kill Momentum can stack twice as high.", branch: 0, tier: 2, cost: 3, effect: { type: "special", value: 2, description: "Kill Momentum stacks further" }, prerequisite: "rex_a2" },
      { id: "rex_a4", name: "Devastation", description: "+20% damage to bosses", branch: 0, tier: 3, cost: 4, effect: { type: "damage", value: 20, description: "+20% boss damage" }, prerequisite: "rex_a3" },
      // Fortify branch — a real hull node, then the shield comes online
      // and recharges faster, rather than two identical +1 HP nodes ahead
      // of an unrelated shield.
      { id: "rex_f1", name: "Reinforced Hull", description: "+1 HP", branch: 1, tier: 0, cost: 1, effect: { type: "hp", value: 1, description: "+1 max HP" } },
      { id: "rex_f2", name: "Energy Shield", description: "A free shield absorbs one hit periodically.", branch: 1, tier: 1, cost: 2, effect: { type: "shield", value: 1, description: "Auto-shield every 34s" }, prerequisite: "rex_f1" },
      { id: "rex_f3", name: "Overcharged Shield", description: "The free shield recharges faster.", branch: 1, tier: 2, cost: 3, effect: { type: "special", value: 1, description: "Shield cadence drops to 22s" }, prerequisite: "rex_f2" },
      { id: "rex_f4", name: "Titanium Core", description: "+2 HP, -5% speed", branch: 1, tier: 3, cost: 4, effect: { type: "hp", value: 2, description: "+2 HP, -5% speed" }, prerequisite: "rex_f3" },
      // Ordnance branch — honest now. "Splits into 3" used to just be a
      // bigger single blast; it now actually reaches further down his
      // Detonation Chain, and the damage/radius nodes apply to whichever
      // explosive kit he actually has equipped.
      { id: "rex_o1", name: "Ordnance Specialist", description: "+20% secondary damage", branch: 2, tier: 0, cost: 1, effect: { type: "damage", value: 20, description: "+20% secondary damage" } },
      { id: "rex_o2", name: "Extra Payload", description: "+1 secondary charge", branch: 2, tier: 1, cost: 2, effect: { type: "special", value: 1, description: "+1 secondary charge" }, prerequisite: "rex_o1" },
      { id: "rex_o3", name: "Cluster Munitions", description: "Detonation Chain reaches 2 more targets.", branch: 2, tier: 2, cost: 3, effect: { type: "special", value: 2, description: "+2 chain links" }, prerequisite: "rex_o2" },
      { id: "rex_o4", name: "Wide Blast", description: "+50% secondary radius", branch: 2, tier: 3, cost: 4, effect: { type: "special", value: 50, description: "+50% secondary radius" }, prerequisite: "rex_o3" },
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
      // Stealth branch — "damage from behind" was never actually tracked
      // (every enemy in a vertical shmup faces the player), and "Vanishing
      // Act" phasing was already an honest invuln-window abstraction.
      // Shadow Strike becomes what her evasion actually earns: fly clean
      // for a stretch and your aim sharpens.
      { id: "yuki_s1", name: "Ghost Step", description: "+3% move speed", branch: 0, tier: 0, cost: 1, effect: { type: "speed", value: 3, description: "+3% move speed" } },
      { id: "yuki_s2", name: "Cloak Field", description: "Extended invulnerability", branch: 0, tier: 1, cost: 2, effect: { type: "special", value: 500, description: "+0.5s invuln on hit" }, prerequisite: "yuki_s1" },
      { id: "yuki_s3", name: "Cold Focus", description: "Flying clean for a few seconds sharpens your aim.", branch: 0, tier: 2, cost: 3, effect: { type: "special", value: 20, description: "+20% damage after 3.2s unhit" }, prerequisite: "yuki_s2" },
      { id: "yuki_s4", name: "Vanishing Act", description: "Phasing through bullets briefly", branch: 0, tier: 3, cost: 4, effect: { type: "special", value: 1, description: "Phase through bullets" }, prerequisite: "yuki_s3" },
      // Technician branch — Intel Override used to promise a feature
      // ("see enemy HP") that did not exist. It does now.
      { id: "yuki_t1", name: "Scavenger", description: "+20% drop rate", branch: 1, tier: 0, cost: 1, effect: { type: "score", value: 20, description: "+20% drop rate" } },
      { id: "yuki_t2", name: "Data Link", description: "+15% score", branch: 1, tier: 1, cost: 2, effect: { type: "score", value: 15, description: "+15% score" }, prerequisite: "yuki_t1" },
      { id: "yuki_t3", name: "EW Suite", description: "Enemy bullets 10% slower", branch: 1, tier: 2, cost: 3, effect: { type: "special", value: 10, description: "Slow enemy bullets 10%" }, prerequisite: "yuki_t2" },
      { id: "yuki_t4", name: "Intel Override", description: "+25% score, and displays every enemy's health bar.", branch: 1, tier: 3, cost: 4, effect: { type: "special", value: 25, description: "+25% score, shows enemy HP" }, prerequisite: "yuki_t3" },
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
