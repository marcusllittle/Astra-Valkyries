/**
 * Asset manifest ratchet.
 *
 * Every literal "/assets/..." path referenced from src/ must exist under
 * public/. Missing-asset bugs are invisible at runtime because the UI is
 * built to degrade silently (CardArt falls back video -> image -> gradient,
 * CutinOverlay's onError skips the reveal entirely) — which is exactly how
 * 29 missing files shipped unnoticed.
 *
 * Known gaps live in known-missing-assets.json. The rules:
 *   1. A referenced asset that is missing and NOT in the baseline fails.
 *      (You added a reference without adding the file.)
 *   2. A baseline entry whose file now exists fails.
 *      (You added the file — remove it from the baseline so it can never
 *      silently go missing again.)
 * The baseline only ever shrinks.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const APP_ROOT = resolve(__dirname, "..", "..");
const SRC_DIR = join(APP_ROOT, "src");
const PUBLIC_DIR = join(APP_ROOT, "public");
const BASELINE_PATH = join(APP_ROOT, "known-missing-assets.json");

const SOURCE_EXTENSIONS = /\.(ts|tsx|json|css)$/;
const ASSET_REF = /["'`(](\/assets\/[A-Za-z0-9_\-./]+\.(?:png|webp|jpg|jpeg|gif|svg|mp4|webm|mp3|wav|ogg))["'`)]/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function collectReferences(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  for (const file of walk(SRC_DIR)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(ASSET_REF)) {
      const assetPath = match[1];
      const list = refs.get(assetPath) ?? [];
      list.push(file.slice(APP_ROOT.length + 1));
      refs.set(assetPath, list);
    }
  }
  return refs;
}

function loadBaseline(): Set<string> {
  if (!existsSync(BASELINE_PATH)) return new Set();
  return new Set(JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as string[]);
}

describe("asset manifest", () => {
  const references = collectReferences();
  const baseline = loadBaseline();

  it("finds asset references at all (self-check)", () => {
    // If the regex or walk ever breaks, this fails instead of the suite
    // silently passing with zero coverage.
    expect(references.size).toBeGreaterThan(20);
  });

  it("every referenced asset exists, or is a known gap in the baseline", () => {
    const newlyMissing: string[] = [];
    for (const [assetPath, sources] of references) {
      const onDisk = join(PUBLIC_DIR, assetPath);
      if (!existsSync(onDisk) && !baseline.has(assetPath)) {
        newlyMissing.push(`${assetPath}  (referenced from ${sources.join(", ")})`);
      }
    }
    expect(
      newlyMissing,
      `Referenced assets that do not exist under public/ and are not in known-missing-assets.json:\n${newlyMissing.join("\n")}`,
    ).toEqual([]);
  });

  it("baseline entries that now exist are removed (ratchet only shrinks)", () => {
    const fixedButListed: string[] = [];
    for (const assetPath of baseline) {
      if (existsSync(join(PUBLIC_DIR, assetPath))) {
        fixedButListed.push(assetPath);
      }
    }
    expect(
      fixedButListed,
      `These assets now exist — delete them from known-missing-assets.json:\n${fixedButListed.join("\n")}`,
    ).toEqual([]);
  });

  it("baseline entries are still referenced from src (no stale entries)", () => {
    const stale = [...baseline].filter((assetPath) => !references.has(assetPath));
    expect(
      stale,
      `These baseline entries are no longer referenced anywhere — delete them:\n${stale.join("\n")}`,
    ).toEqual([]);
  });
});
