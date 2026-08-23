import { describe, expect, it } from "vitest";
import {
  getMapCinematic,
  getMissionLaunchClips,
  getPilotLaunchClip,
  getPilotReturnClip,
  getShipLaunchClip,
  unseenCinematicClips,
} from "../lib/missionCinematics";

describe("mission cinematic registry", () => {
  it.each(["nebula-runway", "solar-rift", "abyss-crown"])(
    "provides motion and fallback art for %s",
    (mapId) => {
      const cinematic = getMapCinematic(mapId);
      expect(cinematic?.video).toMatch(/\.mp4$/);
      expect(cinematic?.poster).toMatch(/\.png$/);
    },
  );

  it("binds pilot clips to a map-specific first-view id", () => {
    expect(getPilotLaunchClip("pilot_nova", "solar-rift")).toMatchObject({
      id: "launch:pilot_nova:solar-rift",
      source: "ltx",
    });
    expect(getPilotReturnClip("pilot_nova", "solar-rift")?.id).toBe(
      "return:pilot_nova:solar-rift",
    );
  });

  it("does not substitute another pilot when footage is unavailable", () => {
    expect(getPilotLaunchClip("pilot_rex", "solar-rift")).toBeNull();
  });

  it("builds an authored LTX then Blender sequence when both assets match", () => {
    expect(
      getMissionLaunchClips("pilot_nova", "ship_astra_interceptor", "nebula-runway").map(
        (clip) => clip.source,
      ),
    ).toEqual(["ltx", "blender"]);
    expect(getShipLaunchClip("ship_astra_interceptor", "solar-rift")?.id).toBe(
      "launch:ship_astra_interceptor:solar-rift",
    );
  });

  it("does not show the Interceptor cinematic for another selected ship", () => {
    expect(getShipLaunchClip("ship_seraph_guard", "nebula-runway")).toBeNull();
  });

  it("filters previously completed clips without mutating order", () => {
    const launch = getPilotLaunchClip("pilot_nova", "nebula-runway");
    const returned = getPilotReturnClip("pilot_nova", "nebula-runway");
    expect(unseenCinematicClips([launch, returned], [launch!.id])).toEqual([returned]);
  });
});
