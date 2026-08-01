/**
 * The Hangar must never display a number the sim doesn't use.
 *
 * It previously showed hand-authored pilot ACC/RHY/END and ship MOB/FIR
 * scores that no other code read — players compared pilots on figures that
 * did not exist in the game. These tests assert the displayed values are
 * derived from the same buildShmupLoadout math combat consumes, so the two
 * cannot drift apart again.
 */

import { describe, expect, it } from "vitest";
import {
  buildShmupLoadout,
  describePilotPerk,
  describeShipModifiers,
  BASE_OVERDRIVE_DURATION_MS,
} from "../lib/loadout";
import pilotsData from "../data/pilots.json";
import shipsData from "../data/ships.json";
import type { Pilot, Ship } from "../types";

const pilots = pilotsData as Pilot[];
const ships = shipsData as Ship[];

describe("pilot statline", () => {
  it("every pilot produces a statline", () => {
    for (const pilot of pilots) {
      expect(describePilotPerk(pilot), `${pilot.id} has no statline`).not.toBeNull();
    }
  });

  it("returns null without a pilot rather than inventing a baseline", () => {
    expect(describePilotPerk(undefined)).toBeNull();
  });

  it("the displayed delta matches the loadout the sim receives", () => {
    for (const pilot of pilots) {
      const line = describePilotPerk(pilot)!;
      const base = buildShmupLoadout(undefined, undefined, undefined, undefined);
      const withPilot = buildShmupLoadout(pilot, undefined, undefined, undefined);

      switch (pilot.perk.type) {
        case "perfectWindow": {
          // Claimed shrink must equal the real hitbox shrink.
          const claimed = Number(line.delta.replace(/[^0-9.]/g, ""));
          const actual = (1 - withPilot.hitboxScale / base.hitboxScale) * 100;
          expect(Math.round(actual)).toBe(claimed);
          expect(withPilot.hitboxScale).toBeLessThan(base.hitboxScale);
          break;
        }
        case "comboBonus": {
          const claimed = Number(line.delta.replace(/[^0-9.-]/g, ""));
          expect(withPilot.comboBonus - base.comboBonus).toBe(claimed);
          break;
        }
        case "feverDuration": {
          const claimed = Number(line.delta.replace(/[^0-9.-]/g, ""));
          const actualSeconds =
            (withPilot.overdriveDurationMs - base.overdriveDurationMs) / 1000;
          expect(actualSeconds).toBe(claimed);
          break;
        }
      }
    }
  });

  it("each pilot's perk actually changes the loadout", () => {
    // Guards against a perk type being added to the data but never applied.
    const base = buildShmupLoadout(undefined, undefined, undefined, undefined);
    for (const pilot of pilots) {
      const withPilot = buildShmupLoadout(pilot, undefined, undefined, undefined);
      expect(
        JSON.stringify(withPilot) !== JSON.stringify(base),
        `${pilot.id} perk has no effect on the loadout`,
      ).toBe(true);
    }
  });

  it("the perk label agrees with the computed effect", () => {
    for (const pilot of pilots) {
      const line = describePilotPerk(pilot)!;
      const magnitude = line.delta.replace(/[^0-9.]/g, "");
      expect(
        pilot.perk.label.includes(magnitude),
        `${pilot.id} label "${pilot.perk.label}" omits its real magnitude ${magnitude}`,
      ).toBe(true);
    }
  });
});

describe("ship statline", () => {
  it("every ship reports at least one real modifier", () => {
    for (const ship of ships) {
      expect(describeShipModifiers(ship).length, `${ship.id} shows nothing`).toBeGreaterThan(0);
    }
  });

  it("returns nothing without a ship", () => {
    expect(describeShipModifiers(undefined)).toEqual([]);
  });

  it("only reports modifiers that are actually non-zero", () => {
    for (const ship of ships) {
      for (const line of describeShipModifiers(ship, 99)) {
        const magnitude = Number(line.delta.replace(/[^0-9.-]/g, ""));
        expect(magnitude, `${ship.id} reports a zero ${line.stat}`).not.toBe(0);
      }
    }
  });

  it("SPEED matches the ship's real moveSpeedPct", () => {
    for (const ship of ships) {
      const speed = describeShipModifiers(ship, 99).find((l) => l.stat === "SPEED");
      if (!speed) {
        expect(ship.modifiers.moveSpeedPct ?? 0).toBe(0);
        continue;
      }
      expect(Number(speed.delta.replace("%", ""))).toBe(ship.modifiers.moveSpeedPct);
    }
  });

  it("respects the requested limit", () => {
    for (const ship of ships) {
      expect(describeShipModifiers(ship, 2).length).toBeLessThanOrEqual(2);
    }
  });
});

describe("loadout baseline", () => {
  it("an empty loadout is the documented base frame", () => {
    const base = buildShmupLoadout(undefined, undefined, undefined, undefined);
    expect(base.overdriveDurationMs).toBe(BASE_OVERDRIVE_DURATION_MS);
    expect(base.hitboxScale).toBe(1);
    expect(base.comboBonus).toBe(0);
  });
});
