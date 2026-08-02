/**
 * The Inbox promised attachments it did not deliver.
 *
 * ENABLE_INBOX_IMAGE_ATTACHMENTS was false while 47 batch messages still
 * set `preview: "Image attachment • <pilot>"`, so every one of them
 * advertised a picture in the list and opened with nothing. All 50
 * referenced portraits were present on disk the whole time.
 *
 * These tests read the component source rather than importing it: the
 * message tables are module-private and building a DOM harness to reach
 * them would test less than this does. The properties that actually
 * matter here are "the flag is on", "every referenced file exists", and
 * "nothing advertises an attachment the flag would strip".
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = join(APP, "src/components/InboxOverlay.tsx");
const PILOT_DIR = join(APP, "public/assets/inbox/pilot");

const source = readFileSync(SOURCE, "utf8");

describe("inbox attachments", () => {
  it("no preview line hardcodes an attachment the flag can strip", () => {
    // This is the defect, and it is independent of which way the flag is
    // set: 47 batch messages hardcoded "Image attachment - <pilot>" into
    // their preview while `attachments` was gated on the flag, so with the
    // flag off they advertised a picture and opened empty.
    //
    // Every preview now goes through previewFor(), which reads the same
    // flag, so the list is honest in both states.
    const hardcoded = [
      ...source.matchAll(/preview:\s*(`Image attachment|"Image attachment)/g),
    ];
    expect(
      hardcoded.map((m) => m[0]),
      "A preview hardcodes 'Image attachment'. Use previewFor(sender) so " +
        "the list cannot promise art the flag will strip.",
    ).toEqual([]);
  });

  it("previewFor is the single source of truth for pilot preview text", () => {
    expect(source).toMatch(/function previewFor\(/);
    // Every pilot message should route through it rather than inlining
    // its own ternary, which is how the three named messages drifted from
    // the 47 batch ones in the first place.
    expect(source).not.toMatch(/preview:\s*ENABLE_INBOX_IMAGE_ATTACHMENTS\s*\?/);
  });

  it("every referenced pilot portrait exists on disk", () => {
    const referenced = [...new Set(source.match(/job-[a-f0-9]+\.png/g) ?? [])];
    expect(referenced.length).toBeGreaterThan(20);

    const missing = referenced.filter((name) => !existsSync(join(PILOT_DIR, name)));
    expect(
      missing,
      `Inbox references portraits that are not in public/assets/inbox/pilot:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("named portraits used as posters or hand-written attachments exist", () => {
    // Anchored on the preceding slash so this cannot match the hex tail of
    // a job-<hash>.png name, which is what an unanchored pattern does.
    const named = [
      ...new Set(
        [...source.matchAll(/\/([a-z][a-z0-9_]*\.png)/g)].map((m) => m[1]),
      ),
    ];
    const missing = named.filter(
      (name) =>
        !existsSync(join(PILOT_DIR, name)) &&
        !existsSync(join(APP, "public/assets/outfits", name)) &&
        !existsSync(join(APP, "public/assets/pilots", name)),
    );
    expect(
      missing,
      `Named inbox images not found in inbox/pilot, outfits, or pilots:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("referenced video attachments exist", () => {
    // Two forms: literal "/assets/.../x.mp4" and template-literal
    // "${PILOT_INBOX_DIR}/x.mp4". Only checking the first would have
    // missed every inbox clip, since they all use the second.
    const literal = [...new Set(source.match(/\/assets\/[A-Za-z0-9_\-./]+\.mp4/g) ?? [])].map(
      (url) => join(APP, "public", url),
    );
    const templated = [
      ...new Set(
        [...source.matchAll(/\$\{PILOT_INBOX_DIR\}\/([a-z0-9_]+\.mp4)/g)].map((m) => m[1]),
      ),
    ].map((name) => join(PILOT_DIR, name));

    const all = [...literal, ...templated];
    expect(all.length, "found no video references at all").toBeGreaterThan(0);

    const missing = all.filter((path) => !existsSync(path));
    expect(
      missing,
      `Inbox references videos that do not exist:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("the portraits shipped are actually wired up", () => {
    // 3 named portraits are used by hand-written messages and excluded
    // from the batch on purpose; anything beyond that is dead weight in
    // the bundle and probably an oversight.
    const onDisk = readdirSync(PILOT_DIR).filter((f) => f.endsWith(".png"));
    const referenced = new Set(source.match(/[a-z0-9_-]+\.png/g) ?? []);
    const orphaned = onDisk.filter((f) => !referenced.has(f));
    expect(
      orphaned,
      `Portraits shipped in public/assets/inbox/pilot but never referenced:\n${orphaned.join("\n")}`,
    ).toEqual([]);
  });
});
