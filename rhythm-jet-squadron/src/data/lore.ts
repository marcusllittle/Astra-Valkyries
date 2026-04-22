export interface LoreEntry {
  id: string;
  category: "pilot" | "zone" | "enemy" | "boss" | "faction";
  title: string;
  content: string;
  unlockCondition?: string;
  imageUrl?: string;
}

export const LORE_ENTRIES: LoreEntry[] = [
  // Pilots
  {
    id: "lore-nova",
    category: "pilot",
    title: "Nova — Ace Interceptor",
    content: "The youngest pilot to ever qualify for the Valkyrie program, Nova's reflexes are legendary. She grew up in the orbital colonies of Arcturus Station, where zero-gravity racing honed her spatial awareness to superhuman levels.",
    imageUrl: "/assets/pilots/nova_starling.png",
  },
  {
    id: "lore-rex",
    category: "pilot",
    title: "Rex — Iron Vanguard",
    content: "A veteran of the Border Wars, Rex brings unshakable discipline and heavy weapons expertise. His modified neural link allows direct interface with ship weapon systems, trading finesse for raw firepower.",
    imageUrl: "/assets/pilots/rex_thunderbolt.png",
  },
  {
    id: "lore-yuki",
    category: "pilot",
    title: "Yuki — Phantom Blade",
    content: "Former intelligence operative turned combat pilot, Yuki specializes in precision strikes and electronic warfare. Her calm demeanor in battle masks a fierce determination to protect her squadmates.",
    imageUrl: "/assets/pilots/yuki_frostweaver.png",
  },
  // Zones
  {
    id: "lore-nebula",
    category: "zone",
    title: "Nebula Runway",
    content: "A vast corridor of ionized gas clouds that serves as the primary shipping lane between core worlds. Since the invasion, it has become a gauntlet of enemy patrols and automated defense drones.",
    imageUrl: "/assets/maps/nebula-runway.png",
  },
  {
    id: "lore-solar",
    category: "zone",
    title: "Solar Rift",
    content: "A region of space dangerously close to the binary star system Helios Prime. The intense radiation and solar flares make conventional shields unreliable, but the enemy has established a major fortress here.",
    imageUrl: "/assets/cutins/scenes/solar_rift_briefing.png",
  },
  {
    id: "lore-abyss",
    category: "zone",
    title: "Abyss Crown",
    content: "The deepest region of charted space, where temperatures plunge to near absolute zero. Ancient alien structures dot the void, and the terrifying Cryo Leviathan guards the sector's secrets.",
    imageUrl: "/assets/maps/abyss-crown.png",
  },
  // Bosses
  {
    id: "lore-aegis",
    category: "boss",
    title: "Aegis Dreadnought",
    content: "A massive capital ship bristling with weapons, the Aegis Dreadnought is the enemy's primary patrol vessel. Its layered shield system makes it nearly impervious to conventional attacks.",
    imageUrl: "/assets/cutins/scenes/nebula_runway_briefing.png",
  },
  {
    id: "lore-helios",
    category: "boss",
    title: "Helios Tyrant",
    content: "An experimental weapons platform that harnesses solar energy to power devastating beam weapons. The Helios Tyrant can redirect solar flares as offensive weapons.",
    imageUrl: "/assets/cutins/scenes/solar_rift_briefing.png",
  },
  {
    id: "lore-cryo",
    category: "boss",
    title: "Cryo Leviathan",
    content: "The most feared entity in known space. This biomechanical horror freezes everything in its path, and its crystalline armor regenerates from ambient cold energy.",
    imageUrl: "/assets/cutins/scenes/abyss_crown_briefing.png",
  },
  // Enemy types
  {
    id: "lore-drifter",
    category: "enemy",
    title: "Drifter Drone",
    content: "Mass-produced patrol units with basic targeting systems. What they lack in individual threat, they make up for in numbers.",
    imageUrl: "/assets/enemies/light/drifter-concept.png",
  },
  {
    id: "lore-tank",
    category: "enemy",
    title: "Tank Fortress",
    content: "Heavily armored mobile platforms with regenerating shield generators. Taking one down requires sustained firepower and careful timing around its shield cycles.",
    imageUrl: "/assets/enemies/miniboss/warden-concept.png",
  },
  {
    id: "lore-dreadnought-enemy",
    category: "enemy",
    title: "Dreadnought",
    content: "Miniature capital ships that anchor in position and unleash devastating multi-phase attacks. Their beam weapons can sweep entire sectors.",
    imageUrl: "/assets/bosses/abyss-crown-gameplay.png",
  },
  // Factions
  {
    id: "lore-valkyrie",
    category: "faction",
    title: "Valkyrie Squadron",
    content: "An elite rapid-response unit tasked with breaking through enemy lines. Each pilot flies a custom-modified fighter craft with unique weapon loadouts.",
    imageUrl: "/assets/cutins/scenes/nebula_runway_briefing.png",
  },
  {
    id: "lore-void-collective",
    category: "faction",
    title: "The Void Collective",
    content: "A mysterious enemy force that emerged from deep space. Their ships appear to be partially organic, and their tactics suggest a hive-mind intelligence.",
    imageUrl: "/assets/cutins/scenes/abyss_crown_briefing.png",
  },
];
