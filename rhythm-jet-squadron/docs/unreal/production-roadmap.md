# Astra Unreal Production Roadmap

## Production boundary

Astra remains the shipping React/TypeScript runtime for web, Electron, and
Capacitor mobile. Blender remains the procedural geometry source. Unreal 5.8 is
the offline visual-production layer for environments, lighting, materials,
Niagara, cinematics, stills, image sequences, and encoded video.

An Unreal output replaces a current asset only after side-by-side approval and
web, Electron, and mobile verification. Compact fallbacks remain in
`public/assets`; approved HD outputs publish under
`https://media.joinhavn.io/astra/`.

## Current state on main

- The app has 15 routed screens plus shared cut-in, card-art, dialogue, inbox,
  achievement, and controller layers.
- Three zones already have maps, gameplay backgrounds, briefing media, debrief
  stills, zone vistas, enemies, and bosses.
- Blender sources currently cover the Astra Interceptor launch deck, 16
  rarity-tier projectile meshes, weapon trail/muzzle/impact, four secondary
  effects, and three boss telegraphs.
- The launch clip and Blender VFX PNGs are integrated in the shipping runtime.
- Pilot/outfit art and cut-ins are already extensive and should remain until an
  Unreal comparison is clearly superior.
- The Unreal project is `D:/UnrealProjects/AstraValkRenderLab`; Phase 1 began
  with an empty `/Game` asset registry and an unsaved temporary editor level.

## Screen production map

| Screen | Current presentation | Unreal production target | Phase |
| --- | --- | --- | --- |
| Home | Animated fleet-neutral title/menu starfield | Fleet-neutral orbital environment; feature ships only after the models clear visual review | 3 |
| Spaceport | Hub UI plus Nova departure/return clips | Persistent spaceport environment loop and return shot | 3, 5 |
| Hangar | Visual Pilot/Ship/Map/Outfit/Modifiers console, owned banner, Blender launch clip | Lit ship bay and material variants only when they improve a specific loadout task | 3 |
| Briefing | Zone MP4/poster with selected pilot fallback | Three zone-specific briefing sequences sharing one shot template | 5 |
| Video Cutscene | Runtime player for pilot/ship clips | Delivery host for briefing, launch, boss, return, and gacha renders | 5, 6 |
| Shmup | Layered 2D plates, rendered sprites, Blender VFX | Three zone plate sets, enemy/boss beauty renders, Niagara flipbooks | 4 |
| Shmup Results | Grade UI and three debrief stills | Zone debrief set, ship recovery, boss aftermath, reusable grade backdrop | 5 |
| Shop | Gacha UI and outfit reveal videos | Rarity-driven reveal stage, capsule energy, SSR lighting and camera beats | 6 |
| Collection | Card art and owned cosmetic previews | Character/ship/outfit turntables and approved detail stills | 6 |
| Codex | Pilot, outfit, zone, enemy, and boss dossier images | Neutral dossier stage with consistent scale, lenses, and lighting | 6 |
| Missions | Map cards and progression UI | Holographic sector plates and restrained mission-preview loops | 7 |
| Skills | Dense skill tree and existing ability VFX fallback | Short transparent ability previews and icon-source renders | 7 |
| Leaderboard | Data-led ranking surface | Subtle seasonal trophy/ship plate that preserves readability | 7 |
| Network | Operational Network Forge with generated artifacts | Quiet forge loop and reusable verified-artifact presentation stage | 7 |
| Settings | Utility UI | One low-motion static plate only; no required animated media | 7 |

The authoritative sequence-to-destination mapping is
`tools/unreal/render-manifest.json`.

The callable Unreal production surface and representative read-only checks are
recorded in `docs/unreal/mcp-capabilities.md`.

## Phases and gates

### Phase 1: production foundation

- Establish `/Game/AstraRenderLab` ownership boundaries.
- Export existing Blender geometry as FBX with source hashes and export metadata.
- Define Unreal import destinations and stable naming.
- Establish the render manifest and validate coverage of every routed screen.
- Gate: exported geometry can be imported without rebuilding source work; no
  current runtime asset is changed.

### Phase 2: reusable Unreal templates

- Master materials: painted metal, carbon, glass, emissive energy, hologram,
  unlit sprite/flipbook, decal, and environment surface.
- Material instances: faction, zone, rarity, ship, enemy, and boss palettes.
- Lighting rigs: hub daylight, hangar inspection, briefing, combat plate,
  dossier, gacha, and marketing.
- Niagara templates: projectile, trail, muzzle, impact, shield, telegraph,
  atmosphere, engine exhaust, and debris.
- Sequencer/MRQ templates: 24 fps cinematic, 30 fps UI loop, still, alpha VFX,
  horizontal marketing, and vertical marketing.
- Gate: templates produce deterministic test outputs recorded in the manifest.

Implementation status and MCP verification are recorded in
`docs/unreal/phase-2-template-audit.md`.

The reusable material, lighting, Niagara, Sequencer, and Movie Render Queue
baseline is callable and saved. Nine project-owned MRQ presets now cover
cinematic, UI-loop, still, alpha VFX, four marketing aspect ratios, and low-cost
validation output. The project has Alpha Output enabled, and
frame 0 of all three Hub sequences rendered through the Unreal Python/MRQ API
at the expected resolution with unique output paths. Final encoded comparison
renders now exist locally; in-app review and platform verification remain
approval gates.

### Phase 3: Home, Spaceport, and Hangar

- Build the shared orbital-spaceport visual language first.
- Import and preserve the Blender Astra Interceptor and launch deck.
- Produce a Home establishing loop, Spaceport ambient loop, Hangar turntable,
  and revised launch shot only when it beats the current Blender clip.
- Gate: desktop/mobile crops retain first-viewport UI readability.

The reusable stage assemblies, keyed sequences, assigned MRQ presets,
composition proofs, full 1080p PNG masters, and encoded review candidates are
recorded in `docs/unreal/phase-3-hub-audit.md`. Home and Spaceport have closed
transform and focus curves, while Hangar has a three-point inspection arc.
The Home and Hangar candidates passed technical playback checks but failed the
subsequent in-app product review: the single low-detail ship did not represent
the roster, and the passive Hangar strip added no loadout value. Both are
`rejected` in the manifest and removed from the runtime. Home remains
fleet-neutral; Hangar now uses dedicated visual tabs with current map and outfit
media. Spaceport retains Nova's current pre-takeoff clip, and the current
Blender takeoff remains the launch cinematic until Phase 5 produces a clearly
better sequence.

### Phase 4: zones, bosses, enemies, and combat VFX

- Build Nebula Runway, Solar Rift, and Abyss Crown as offline render stages.
- Standardize enemy and boss presentation while preserving distinct silhouettes.
- Convert suitable Blender VFX geometry into Niagara-driven rendered assets.
- Produce parallax plates, sprites/flipbooks, boss intros, telegraphs, impacts,
  and transparent overlays for the existing canvas game.
- Gate: combat readability and performance are no worse than current assets.

### Phase 5: complete mission cinematic flow

- Briefing -> pilot launch -> ship launch -> combat plate -> boss intro ->
  results/debrief -> return to Spaceport.
- Use shared Sequencer shot templates with zone, pilot, and ship variants.
- Gate: skip/fallback behavior remains deterministic in `VideoCutsceneScreen`.

### Phase 6: Shop, Collection, and Codex

- Build rarity-aware gacha reveals and neutral collection/dossier turntables.
- Preserve strong existing pilot/outfit cut-ins; replace only approved entries.
- Gate: every replacement has a local poster/fallback and manifest destination.
- Current state: templates and proof renders are complete; the motion-first
  Shop/Collection viewer is integrated, while Unreal art replacements remain
  gated on production character geometry and stronger dossier renders.

### Phase 7: utility-screen polish

- Missions: sector holograms. Skills: short ability previews. Leaderboard:
  restrained seasonal plate. Network: forge loop. Settings: low-motion still.
- Gate: assets remain background/supporting media and never reduce scanability.
- Current state: utility maps, materials, Niagara wrappers, sequences, and
  proof renders are complete. Skills and Leaderboard hierarchy is upgraded;
  all Unreal media candidates remain gated after failing visual comparison.

### Phase 8: marketing renders

- Reuse production maps, materials, rigs, and characters for 16:9, 1:1, 4:5,
  and 9:16 stills/loops.
- Gate: marketing outputs reference the same source assets and manifest lineage.
- Current state: six campaign sequences, a shared marketing stage, four
  delivery presets, and 24 composition proofs are complete. Multi-aspect
  framing is functional; all art remains gated after failing campaign-quality
  comparison, so no public marketing replacement is claimed.

### Phase 9: runtime integration and release verification

- Add HD URL selection with compact local fallback.
- Verify Vite web build, Electron package smoke test, and Capacitor sync/build.
- Run unit tests, manifest validation, media existence checks, and visual review.
- Gate: no Unreal dependency is added to the shipping runtime.
- Current state: the approval-gated runtime catalog and HD/local resolver are
  complete. Zero Unreal outputs are approved, so the generated shipping catalog
  is intentionally empty. Web, packaged Windows Electron, and Android debug APK
  verification pass; iOS compilation remains a macOS/Xcode release-host task.

## Branch strategy

Use one branch/PR per bounded production slice. Phase 1 starts on
`agent/unreal-renderlab-phase1`; later branches should separate templates, hub,
zones/VFX, cinematic flow, collection/gacha, utility polish, marketing, and
runtime integration.
