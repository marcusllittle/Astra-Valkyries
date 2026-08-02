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
    imageUrl: "/assets/cutins/scenes/nebula_runway_briefing.png",
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
    imageUrl: "/assets/cutins/scenes/abyss_crown_briefing.png",
  },
  // Bosses
  {
    id: "lore-aegis",
    category: "boss",
    title: "Aegis Dreadnought",
    content: "A massive capital ship bristling with weapons, the Aegis Dreadnought is the enemy's primary patrol vessel. Its layered shield system makes it nearly impervious to conventional attacks.",
    imageUrl: "/assets/shmup/boss_aegis_dreadnought.png",
  },
  {
    id: "lore-helios",
    category: "boss",
    title: "Helios Tyrant",
    content: "An experimental weapons platform that harnesses solar energy to power devastating beam weapons. The Helios Tyrant can redirect solar flares as offensive weapons.",
    imageUrl: "/assets/shmup/boss_helios_tyrant.png",
  },
  {
    id: "lore-cryo",
    category: "boss",
    title: "Cryo Leviathan",
    content: "The most feared entity in known space. This biomechanical horror freezes everything in its path, and its crystalline armor regenerates from ambient cold energy.",
    imageUrl: "/assets/shmup/boss_cryo_leviathan.png",
  },
  // Enemy types
  {
    id: "lore-drifter",
    category: "enemy",
    title: "Drifter Drone",
    content: "Mass-produced patrol units with basic targeting systems. What they lack in individual threat, they make up for in numbers.",
    imageUrl: "/assets/shmup/enemy_drifter.png",
  },
  {
    id: "lore-sine",
    category: "enemy",
    title: "Weaver Drone",
    content: "Patrol units that ride a rolling sine path through the lane, making them awkward to lead. Void Collective doctrine fields them in pairs so their weaving arcs overlap and close the gaps between them.",
    imageUrl: "/assets/shmup/enemy_sine.png",
  },
  {
    id: "lore-zigzag",
    category: "enemy",
    title: "Jitter Lance",
    content: "A light interceptor built around erratic burst thrust. It changes heading faster than a targeting solution can settle, trading armor and firepower for the sheer difficulty of being hit.",
    imageUrl: "/assets/shmup/enemy_zigzag.png",
  },
  {
    id: "lore-orbiter",
    category: "enemy",
    title: "Halo Sentinel",
    content: "Sentries that lock a circular patrol around a fixed point and never break it. The rotating vane ring doubles as a kinetic shield, so they are best taken from outside the orbit rather than chased around it.",
    imageUrl: "/assets/shmup/enemy_orbiter.png",
  },
  {
    id: "lore-charger",
    category: "enemy",
    title: "Breacher",
    content: "A ram platform with almost no standoff weaponry. It closes slowly, then commits to a single accelerating charge. The reinforced prow will survive the collision; your hull will not.",
    imageUrl: "/assets/shmup/enemy_charger.png",
  },
  {
    id: "lore-splitter",
    category: "enemy",
    title: "Cleaver Pod",
    content: "Twinned hulls joined along an exposed power seam. Destroying the frame does not end the engagement — the halves separate and keep fighting independently, so clear them well before they reach your lane.",
    imageUrl: "/assets/shmup/enemy_splitter.png",
  },
  {
    id: "lore-bomber",
    category: "enemy",
    title: "Ordnance Hauler",
    content: "Slow, heavily built, and carrying visible payload pods on either flank. It does not aim so much as saturate, seeding the lane with area denial. Prioritize it before the pods are released.",
    imageUrl: "/assets/shmup/enemy_bomber.png",
  },
  {
    id: "lore-sniper",
    category: "enemy",
    title: "Longeye",
    content: "A fragile chassis built around a single oversized rail barrel. It hangs at the top of the lane and fires rarely but accurately. The optic glows before each shot — that tell is your only warning.",
    imageUrl: "/assets/shmup/enemy_sniper.png",
  },
  {
    id: "lore-swarm",
    category: "enemy",
    title: "Cinder Drone",
    content: "Barely more than an engine and a sensor eye. Individually harmless and destroyed by a single hit, but the Collective deploys them in dense waves to bait fire away from heavier escorts.",
    imageUrl: "/assets/shmup/enemy_swarm.png",
  },
  {
    id: "lore-tank",
    category: "enemy",
    title: "Tank Fortress",
    content: "Heavily armored mobile platforms with regenerating shield generators. Taking one down requires sustained firepower and careful timing around its shield cycles.",
    imageUrl: "/assets/shmup/enemy_tank_fortress.png",
  },
  {
    id: "lore-dreadnought-enemy",
    category: "enemy",
    title: "Dreadnought Escort",
    content: "Miniature capital ships that anchor in position and unleash devastating multi-phase attacks. Their beam weapons can sweep entire sectors, and they share a hull lineage with the Aegis pattern that leads their patrols.",
    imageUrl: "/assets/shmup/enemy_dreadnought.png",
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
