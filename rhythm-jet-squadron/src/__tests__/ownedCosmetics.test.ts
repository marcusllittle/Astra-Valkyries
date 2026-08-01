/**
 * Owned JoinHavn assets are cosmetic, and must stay that way.
 *
 * The marketplace sells these assets for credits. The moment one of them
 * changes a number the sim reads, Astra becomes pay-to-win and the
 * ownership story on joinhavn.io stops being something we can honestly
 * make. That is a property of the whole codebase, not of one function, so
 * this test is structural: it asserts no gameplay module ever reads the
 * equipped banner.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL("../", import.meta.url)));

/**
 * Everything that feeds a run: the sim, the loadout it is built from, the
 * balance data it reads, and the screens that score it.
 */
const GAMEPLAY_PATHS = [
  "lib/loadout.ts",
  "lib/shmupBalance.ts",
  "lib/shmupWeapons.ts",
  "lib/shmupWaves.ts",
  "lib/shmupResults.ts",
  "lib/progression.ts",
  "lib/synergies.ts",
  "lib/outfitKits.ts",
  "lib/gacha.ts",
  "lib/missions.ts",
  "lib/achievements.ts",
  "data/modifiers.ts",
  "data/missions.ts",
  "screens/ShmupPlayScreen.tsx",
  "screens/ShmupResultsScreen.tsx",
];

/** Screens where showing an owned asset is the entire point. */
const COSMETIC_ALLOWLIST = new Set([
  "screens/HangarScreen.tsx",
  "screens/CollectionScreen.tsx",
  "context/GameContext.tsx",
  "types.ts",
  "lib/havnApi.ts",
]);

function walk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...walk(full, rel));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(rel);
    }
  }
  return out;
}

describe("owned JoinHavn assets stay cosmetic", () => {
  it("no gameplay module reads the equipped banner", () => {
    const offenders = GAMEPLAY_PATHS.filter((rel) => {
      let text: string;
      try {
        text = readFileSync(join(SRC, rel), "utf8");
      } catch {
        return false; // file moved or renamed; the sweep below still covers it
      }
      return text.includes("equippedBanner");
    });

    expect(
      offenders,
      `These gameplay files read save.equippedBanner. An owned asset must ` +
        `never change a number the sim reads:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("only cosmetic surfaces reference the equipped banner at all", () => {
    // Catches a new gameplay file that GAMEPLAY_PATHS does not know about.
    const referencing = walk(SRC).filter((rel) =>
      readFileSync(join(SRC, rel), "utf8").includes("equippedBanner"),
    );
    const unexpected = referencing.filter((rel) => !COSMETIC_ALLOWLIST.has(rel));

    expect(
      unexpected,
      `Unexpected files reference equippedBanner. If this is genuinely a ` +
        `cosmetic surface, add it to COSMETIC_ALLOWLIST and say why:\n${unexpected.join("\n")}`,
    ).toEqual([]);
  });

  it("the allowlist is real, so the sweep cannot silently pass on zero hits", () => {
    const referencing = walk(SRC).filter((rel) =>
      readFileSync(join(SRC, rel), "utf8").includes("equippedBanner"),
    );
    expect(referencing.length).toBeGreaterThan(0);
  });
});
