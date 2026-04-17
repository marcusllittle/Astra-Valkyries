# Astra Valkyries Asset Coverage Matrix

This matrix maps currently referenced game assets against what is actually present in the repo.

Status:
- `OK` = referenced and present
- `MISSING` = referenced but file not present
- `-` = no asset wired for that slot yet

---

## Summary

### Pilots
- Pilot portrait art: **3 / 3 OK**
- Pilot fever cutins/clips: **1 / 3 OK**
- Pilot alternate cutscene coverage: **0 / 3 wired beyond fever clips**

### Ships
- Ship card art: **3 / 3 OK**
- Ship cinematic/cutin coverage: **0 / 3 wired**

### Outfits
- Outfit static art: **all referenced outfits inspected are OK**
- Outfit motion/cutscene coverage: **partial**
- Outfit `cutinUrl`: effectively **not covered** in current data snapshot

### Production takeaway
The game has stronger static art coverage than motion/cinematic coverage. The biggest immediate content gap is **consistent cutscene/video/cutin support**, especially for pilots and outfits.

---

## Pilot Coverage

| Pilot ID | Name | artUrl | feverCutinUrl | Notes |
|---|---|---|---|---|
| `pilot_nova` | Nova Starling | OK | OK | Best-covered pilot visually right now |
| `pilot_rex` | Rex Thunderbolt | OK | MISSING/none wired | Needs fever/hero motion coverage |
| `pilot_yuki` | Yuki Frostweaver | OK | MISSING/none wired | Needs fever/hero motion coverage |

### Pilot Gaps
- Missing consistent fever/hero clips for Rex and Yuki
- Missing alternate pilot expression assets for inbox/dialogue/codex use
- Missing mission intro / return-to-port pilot visual coverage

---

## Ship Coverage

| Ship ID | Name | artUrl | Motion/Cutin Coverage | Notes |
|---|---|---|---|---|
| `ship_astra_interceptor` | Astra Interceptor | OK | - | Static only |
| `ship_valkyrie_lancer` | Valkyrie Lancer | OK | - | Static only |
| `ship_seraph_guard` | Seraph Guard | OK | - | Static only |

### Ship Gaps
- No ship-specific motion or deploy glam presentation
- No ship intro visuals or showcase clips
- No stronger differentiation in presentation outside static art

---

## Outfit Coverage

Observed pattern:
- `artUrl` coverage is broadly good
- `cutsceneArtUrl` coverage is inconsistent
- `cutinUrl` appears effectively missing across the currently wired outfits

| Outfit ID | Name | artUrl | cutsceneArtUrl | cutinUrl | Notes |
|---|---|---|---|---|---|
| `outfit_01` | Standard Flight Suit | OK | OK | MISSING | Good base candidate for early-game reveal cleanup |
| `outfit_02` | Neon Vanguard | OK | MISSING | MISSING | Needs motion support |
| `outfit_03` | Desert Storm | OK | OK | MISSING | Static + cutscene present |
| `outfit_04` | Iron Hawk | OK | OK | MISSING | Static + cutscene present |
| `outfit_05` | Cloud Walker | OK | MISSING | MISSING | Needs motion support |
| `outfit_06` | Shadow Pulse | OK | MISSING | MISSING | Needs motion support |
| `outfit_07` | Ocean Drift | OK | MISSING | MISSING | Needs motion support |
| `outfit_08` | Crimson Wing | OK | OK | MISSING | Static + cutscene present |
| `outfit_09` | Frost Nova | OK | MISSING | MISSING | Needs motion support |
| `outfit_10` | Thunder Strike | OK | MISSING | MISSING | Needs motion support |
| `outfit_11` | Emerald Gale | OK | MISSING | MISSING | Needs motion support |
| `outfit_12` | Violet Tempest | OK | OK | MISSING | Static + cutscene present |
| `outfit_13` | Solar Flare | OK | MISSING | MISSING | Needs motion support |
| `outfit_14` | Lunar Eclipse | OK | OK | MISSING | Static + cutscene present |
| `outfit_15` | Cosmic Surge | OK | OK | MISSING | Static + cutscene present |
| `outfit_16` | Starfall Armor | OK | MISSING | MISSING | Needs motion support |
| `outfit_17` | Aurora Borealis | OK | MISSING | MISSING | Needs motion support |
| `outfit_18` | Void Reaper | OK | MISSING | MISSING | Needs motion support |

### Outfit Gaps
- `cutinUrl` support is basically unfulfilled in the currently wired content
- Many outfits have static art but no motion/reveal content
- Need explicit rarity-based coverage targets for SR/SSR priority outfits

---

## Existing Public Asset Structure

Current asset folders indicate the intended content pipeline is already partially scaffolded:

- `public/assets/pilots/`
- `public/assets/ships/`
- `public/assets/outfits/`
- `public/assets/cutins/`
- `public/assets/hero/`
- `public/assets/inbox/`

### Interpretation
This is good news: the project already has the right asset categories, but coverage is uneven.

---

## High-Priority Missing Asset Groups

### P1, create next
1. **Pilot fever / hero clips** for all pilots
2. **Motion/cutscene coverage** for the highest-value outfits
3. **True cutin coverage** where `cutinUrl` is intended but absent
4. **Launch / return / transition assets** to support premium flow

### P2, create after that
1. Ship deploy/showcase motion assets
2. Inbox portrait variants and character expression sets
3. Map / boss intro visuals
4. Hero/title key art package

---

## Current Render Findings

Recent prompt testing suggests the strongest image-generation models for Astra character art are currently:

- `perfectdeliberate_v60`
- `aMixIllustrious_aMix`

These appear to be the current frontrunners for polished pilot/cockpit images.

### Working strategy change
Astra should not be treated like a blank slate.
There is already a meaningful amount of static outfit and character art in the real game.

So the current strategy is:
- **do not regenerate everything**
- use new renders selectively
- prioritize missing emotional/support content first
- replace existing art only when the new image is clearly better

### Best uses for new renders right now
The latest pilot renders are especially promising for:
- inbox portraits
- briefing portraits
- codex/profile refreshes
- transition stills
- selective replacement of weaker existing pilot/suit imagery

They are **not automatically** replacements for every existing outfit or pilot asset.

## Selection Rules Going Forward

When a new image is generated, classify it as one of:
- **pilot base portrait**
- **inbox portrait**
- **briefing portrait**
- **codex/profile art**
- **outfit replacement candidate**
- **cutscene source still**
- **reference only**
- **reject**

### Replacement rule
Only replace an existing in-game image if the new one is clearly better in:
- identity accuracy
- premium feel
- suit/material rendering
- composition usefulness
- consistency with Astra’s visual language

Otherwise, use the new image as supplemental content instead of overwriting strong existing assets.

## Recommended Next Step

Use this matrix to drive the next execution stage:

### Selective integration and content assignment
Start by assigning successful renders to one of these roles:
- pilot portraits
- inbox portraits
- briefing stills
- codex/profile art
- transition/cutscene source frames
- outfit replacement candidates

This should happen before generating large new batches or replacing existing assets blindly.
