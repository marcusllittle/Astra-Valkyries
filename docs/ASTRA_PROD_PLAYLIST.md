# Astra Valkyries — Production Playlist
_Full repo audit. Ordered by blocking severity. Ship these in order._

---

## 🔴 TIER 1 — Broken / Disconnected Right Now

These are data/asset disconnects where the work exists but nothing is wired up.
Fix these first — they're cheap and the payoff is immediate.

---

### 1. Wire outfit cutscene MP4s into outfits.json
**Status:** 7 cutscene MP4s exist in `/assets/outfits/` but ALL 18 outfits have `cutsceneUrl` missing from the JSON. The files are just sitting there unused.

Files that exist and need wiring:
- `aurora_borealis_reveal.mp4` → outfit with aurora_borealis art
- `cosmic_surge_cutscene.mp4` → outfit_?
- `crimson_wing_cutscene.mp4` → outfit_?
- `desert_storm_cutscene.mp4` → outfit_?
- `iron_hawk_cutscene.mp4` → outfit_?
- `lunar_eclipse_cutscene.mp4` → outfit_?
- `standard_flight_suit_cutscene.mp4` → outfit_01
- `violet_tempest_cutscene.mp4` → outfit_?

**Fix:** Match filenames to outfit IDs by artUrl name, add `cutsceneUrl` to each entry in outfits.json.

---

### 2. Turn off FORCE_UNLOCK_ALL_MESSAGES
**Status:** `InboxOverlay.tsx` line ~97 has `const FORCE_UNLOCK_ALL_MESSAGES = true` — this bypasses the entire progression unlock system. Every player sees every message from run 0.

**Fix:** Set to `false`. The unlock conditions are already written (`isUnlocked` functions). Just turn the gate back on.

---

### 3. Wire Rex and Yuki fever cutin URLs
**Status:** `pilots.json` — Nova has `feverCutinUrl: "/assets/cutins/nova_fever.mp4"`. Rex and Yuki have NO feverCutinUrl at all. Fever activation is a dead moment for 2 of 3 pilots.

**Fix:** Check if rex/yuki fever clips exist, add fields. If clips don't exist, at minimum add placeholder paths so the system knows they're missing.

---

### 4. Fix debrief art duplication
**Status:** `ShmupResultsScreen.tsx` DEBRIEF_BACKDROPS — solar_rift uses its briefing PNG. abyss_crown uses its briefing PNG. Only nebula_runway has a dedicated debrief image.

**Fix:** Either generate distinct debrief art, or deliberately map each zone's debrief to a different existing still so it doesn't look like a reload.

---

## 🟠 TIER 2 — Structural Gaps (game works but feels empty)

---

### 5. Inbox image attribution
**Status:** 80+ images in `/assets/inbox/pilot/` with hash filenames (`job-xxxxx.png`). The system cycles them through 4 generic messages per pilot. The images aren't matched to specific stories — they're a random image pool.

3 properly-named files exist: `nova_after_hours.png`, `rex_afterburn.png`, `yuki_midnight_archive.png`. These are the only ones with real identity.

**Fix:** Either:
- Rename key images to meaningful names and tie them to specific message objects
- Or accept the pool approach but expand the message pool so the same 4 bodies don't repeat 20x per pilot

---

### 6. Codex renders folder is empty
**Status:** `/assets/codex/renders/.gitkeep` — the codexRenderMap override system is built and working, but there are zero renders in the folder. Codex entries fall back to lore entry imageUrls which may also be thin.

**Fix:** Populate with renders for at least the boss entries (we now have distinct boss designs) and pilot entries.

---

### 7. Hero/title art is empty
**Status:** `/assets/hero/.gitkeep` — the hero folder is a placeholder. The home screen runs a starfield canvas but there's no key art, no title card, nothing. It relies purely on the canvas + CSS text.

**Fix:** Title key art, or at minimum a hero backdrop image that gives the game a face.

---

### 8. Boss entrance — no intro sequence
**Status:** `bossWarningMs` is defined per map (2600–3000ms) and the warning state is tracked, but there's no visual entrance treatment. The boss just... appears. Given the 3 distinct bosses we just built, an entrance moment would land much harder.

**Fix:** Use the bossWarning window to:
- Flash boss name on screen
- Pulse the warning overlay
- Optionally animate the boss sliding in from off-screen

---

### 9. Combat zone backgrounds are identical for all 3 maps
**Status:** `SPRITE_PATHS` has `backgroundFar` and `backgroundNear` as two generic SVGs shared across all 3 maps. Nebula Runway, Solar Rift, and Abyss Crown all look the same in combat despite having distinct palette configs.

**Fix:** Either:
- Create per-map background SVGs (3 far + 3 near)
- Or tint/filter the existing backgrounds using the map's palette at draw time (cheaper, doable now)

---

### 10. Dialogue is extremely thin
**Status:** 159 total lines across all dialogue scripts. Each briefing is 4-5 lines. Post-mission is similar. The pilots (Nova, Rex, Yuki) barely speak. There's no personality depth, no mission-specific banter, no escalation between zones.

**Fix:** Expand each zone's pre/post script to 3–4 exchanges. Add pilot-specific voice even in briefing (Nova is confident/precise, Rex is aggressive/loose, Yuki is calm/focused).

---

### 11. Mission pool is tiny and generic
**Status:** 5 daily types, 5 weekly types, all generic names. "Drone Hunter", "Ace Pilot", "Score Chaser". No narrative framing, no zone specificity, no escalation as the player progresses.

**Fix:** Expand pool to 15+ daily / 10+ weekly. Add zone-locked missions ("Clear Nebula Runway with an A grade"), boss missions ("Defeat the Helios Tyrant"), combo challenges. Add flavor text from Command or pilots.

---

## 🟡 TIER 3 — Polish (elevates what's already there)

---

### 12. Pilot level-up does nothing visible
**Status:** `pilotLevel` is tracked in save data and the Spaceport shows "LV.X command clearance" but leveling up has no visible event, no unlock, no feedback. It's tracked but silent.

**Fix:** Add a level-up moment — even just a toast / inbox message when a pilot levels up for the first time.

---

### 13. Gacha pull presentation is weak
**Status:** Shop has gacha pulls but the reveal is likely just a result screen. SSR/SR rarity should have a premium moment. Outfit cutscene videos now exist — they need to play on pull reveal for high-rarity items.

**Fix:** After pulling SSR/SR, route through VideoCutsceneScreen before showing results. The infrastructure is already there.

---

### 14. Results screen grade presentation is flat
**Status:** Grade colors are defined (S=gold, A=green, etc.) but there's no animation, no fanfare, no moment. S rank should feel different from D rank.

**Fix:** Add a brief grade reveal animation — scale in, pulse, maybe the pilot's cutin fires on S rank.

---

### 15. Ships have no glamour/hangar presence
**Status:** 3 ships exist with sprites (for combat) but the Hangar selection screen doesn't show them with any premium treatment. Ship art is just sprites designed for tiny canvas rendering.

**Fix:** Either source/commission hangar-scale ship art, or build a canvas-rendered "glamour shot" view that scales up the ship sprite with glow treatment and stat display.

---

### 16. Leaderboard is likely offline/placeholder
**Status:** LeaderboardScreen exists in routing but it depends on HavnAI backend. If the API isn't live, it's a dead screen.

**Fix:** Add a graceful fallback showing local best scores when the API is unavailable.

---

## 📋 Recommended Execution Order

### Sprint 1 — Wire & Fix (1-2 days, no new assets needed)
1. Wire outfit cutscenes into outfits.json
2. Turn off FORCE_UNLOCK_ALL_MESSAGES
3. Wire Rex/Yuki fever cutin fields
4. Fix debrief art duplication
5. Boss entrance warning flash sequence

### Sprint 2 — Content (2-3 days, some writing needed)
6. Expand dialogue scripts (all 3 zones, pre + post)
7. Expand mission pool with zone/boss/pilot-specific missions
8. Inbox image attribution / message pool expansion
9. Pilot level-up feedback moment

### Sprint 3 — Visual Identity (needs asset generation)
10. Combat background zone differentiation (palette tint approach = quick)
11. Codex renders for bosses + pilots
12. Boss entrance visual sequence
13. Title / hero key art

### Sprint 4 — Juice & Presentation
14. Gacha reveal → cutscene for SSR/SR
15. Results screen grade animation
16. Ship hangar presentation
17. Leaderboard fallback

---

## Quick Wins Available Right Now (Code Only, No New Assets)

| Task | Files | Effort |
|------|-------|--------|
| Wire outfit cutscenes | `outfits.json` | 15 min |
| Turn off debug unlock flag | `InboxOverlay.tsx` line ~97 | 1 min |
| Boss warning flash + name display | `ShmupPlayScreen.tsx` | 1-2 hrs |
| Map palette tint on combat backgrounds | `ShmupPlayScreen.tsx` | 1 hr |
| Expand dialogue scripts | `dialogues.ts` | 2-3 hrs |
| Grade reveal animation | `ShmupResultsScreen.tsx` | 1-2 hrs |
