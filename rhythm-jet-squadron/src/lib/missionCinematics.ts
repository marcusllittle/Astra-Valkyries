export interface CinematicClip {
  id: string;
  src: string;
  poster?: string;
  eyebrow: string;
  title: string;
  source: "ltx" | "blender" | "hybrid";
}

interface MapCinematic {
  video: string;
  poster: string;
}

const MAP_CINEMATICS: Record<string, MapCinematic> = {
  "nebula-runway": {
    video: "/assets/cutins/scenes/nebula_runway_briefing.mp4",
    poster: "/assets/cutins/scenes/nebula_runway_briefing.png",
  },
  "solar-rift": {
    video: "/assets/cutins/scenes/solar_rift_briefing.mp4",
    poster: "/assets/cutins/scenes/solar_rift_briefing.png",
  },
  "abyss-crown": {
    video: "/assets/cutins/scenes/abyss_crown_briefing.mp4",
    poster: "/assets/cutins/scenes/abyss_crown_briefing.png",
  },
};

const PILOT_LAUNCH_CLIPS: Record<string, Omit<CinematicClip, "id">> = {
  pilot_nova: {
    src: "/assets/cutins/nova/nova_leaving_port.mp4",
    eyebrow: "Launch sequence",
    title: "Nova Starling / Cleared for combat",
    source: "ltx",
  },
};

const PILOT_RETURN_CLIPS: Record<string, Omit<CinematicClip, "id">> = {
  pilot_nova: {
    src: "/assets/cutins/nova/nova_return_to_port.mp4",
    eyebrow: "Recovery sequence",
    title: "Nova Starling / Return to Spaceport",
    source: "ltx",
  },
};

const SHIP_LAUNCH_CLIPS: Record<string, Omit<CinematicClip, "id">> = {
  ship_astra_interceptor: {
    src: "/assets/cutins/ships/astra_interceptor_launch.mp4",
    poster: "/assets/ships/astra_interceptor.png",
    eyebrow: "Flight deck",
    title: "Astra Interceptor / Slipstream launch",
    source: "blender",
  },
};

export function getMapCinematic(mapId?: string | null): MapCinematic | null {
  if (!mapId) return null;
  return MAP_CINEMATICS[mapId] ?? null;
}

export function getPilotLaunchClip(
  pilotId?: string | null,
  mapId?: string | null,
): CinematicClip | null {
  if (!pilotId || !mapId) return null;
  const clip = PILOT_LAUNCH_CLIPS[pilotId];
  return clip ? { ...clip, id: `launch:${pilotId}:${mapId}` } : null;
}

export function getPilotReturnClip(
  pilotId?: string | null,
  mapId?: string | null,
): CinematicClip | null {
  if (!pilotId || !mapId) return null;
  const clip = PILOT_RETURN_CLIPS[pilotId];
  return clip ? { ...clip, id: `return:${pilotId}:${mapId}` } : null;
}

export function getShipLaunchClip(
  shipId?: string | null,
  mapId?: string | null,
): CinematicClip | null {
  if (!shipId || !mapId) return null;
  const clip = SHIP_LAUNCH_CLIPS[shipId];
  return clip ? { ...clip, id: `launch:${shipId}:${mapId}` } : null;
}

export function getMissionLaunchClips(
  pilotId?: string | null,
  shipId?: string | null,
  mapId?: string | null,
): CinematicClip[] {
  return [getPilotLaunchClip(pilotId, mapId), getShipLaunchClip(shipId, mapId)].filter(
    (clip): clip is CinematicClip => Boolean(clip),
  );
}

export function unseenCinematicClips(
  clips: Array<CinematicClip | null | undefined>,
  seenIds: string[],
): CinematicClip[] {
  const seen = new Set(seenIds);
  return clips.filter((clip): clip is CinematicClip => Boolean(clip && !seen.has(clip.id)));
}
