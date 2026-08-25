import type { CinematicClip } from "./missionCinematics";

export interface FormShiftDefinition {
  id: string;
  pilotId: string;
  fromOutfitId: string;
  toOutfitId: string;
  label: string;
  startReference: string;
  endReference: string;
  /** Existing in-game motion used only to prove the preview flow. */
  prototypeVideoSrc: string;
  /** Final path expected from the HavnAI/LTX generation pipeline. */
  targetVideoSrc: string;
  poster: string;
  source: CinematicClip["source"];
}

export const FORM_SHIFT_DEFINITIONS: readonly FormShiftDefinition[] = [
  {
    id: "nova-standard-to-starfall",
    pilotId: "pilot_nova",
    fromOutfitId: "outfit_01",
    toOutfitId: "outfit_16",
    label: "Nova Starling / Starfall Armor",
    startReference: "/assets/outfits/standard_flight_suit.png",
    endReference: "/assets/outfits/starfall_armor.png",
    prototypeVideoSrc: "/assets/outfits/starfall_armor_cutscene.mp4",
    targetVideoSrc: "/assets/transformations/nova/starfall_armor_form_shift.mp4",
    poster: "/assets/outfits/starfall_armor.png",
    source: "ltx",
  },
] as const;

export function getFormShiftDefinition(
  pilotId?: string | null,
  outfitId?: string | null,
): FormShiftDefinition | null {
  if (!pilotId || !outfitId) return null;
  return (
    FORM_SHIFT_DEFINITIONS.find(
      (definition) =>
        definition.pilotId === pilotId && definition.toOutfitId === outfitId,
    ) ?? null
  );
}

export function toPrototypeCinematicClip(
  definition: FormShiftDefinition,
): CinematicClip {
  return {
    id: `form-shift-prototype:${definition.id}`,
    src: definition.prototypeVideoSrc,
    poster: definition.poster,
    eyebrow: "Valkyrie Form Shift / Prototype",
    title: definition.label,
    source: definition.source,
  };
}
