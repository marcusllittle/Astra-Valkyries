# Phase 3 Hub Production Audit

Verified through Unreal MCP on 2026-08-23 against
`D:/UnrealProjects/AstraValkRenderLab` branch
`agent/hub-lighting-dressing`.

## Shared render environment

- `L_Astra_HubRenderStage` is the clean shared evaluation and render map for
  all three hub sequences. It contains no unrelated Open World landscape,
  atmosphere, cloud, or HLOD actors.
- `BP_Astra_OrbitalSkyDome` wraps the render stage with the unlit,
  two-sided `M_Astra_OrbitalSky` material and is a tagged spawnable in every
  hub sequence.
- `T_Astra_OrbitalBackdrop` is configured as a non-streaming skybox texture.
  Its project-owned source is
  `SourceAssets/Textures/Hub/T_Astra_OrbitalBackdrop_Source.png`.
- `MI_Astra_DeckSteel` now uses a readable blue-gray metal response while
  preserving the imported Blender launch-deck geometry.
- `BP_Astra_HubPostProcess` supplies deterministic manual exposure, restrained
  bloom and motion blur, and shared color finishing. It is bound under the
  Lighting folder in every hub sequence.
- `BP_Astra_HubDeckDressing` adds reusable cyan and amber guide strips, deck
  pylons, emissive beacons, and low-cost practical lights without replacing
  the imported launch deck. Spaceport and Hangar bind the same compiled
  spawnable under FX.

The backdrop was generated with OpenAI image generation for this private
RenderLab project. Prompt: `Premium deep-space panoramic matte painting for
Astra Valkyries, viewed from an orbital spaceport above a distant sapphire
planet; restrained stars, subtle cyan nebula filaments, a blue-white planetary
horizon in the lower quarter, dark central negative space, black/charcoal/
sapphire/cyan palette with tiny gold accents; seamless wrap; no ships,
characters, buildings, UI, logos, text, watermark, lens flare, or sun disk.`

## Reusable stages

| Blueprint | Source geometry | Current purpose |
| --- | --- | --- |
| `BP_Astra_HomeOrbitStage` | Astra Interceptor, orbital world | Home establishing assembly |
| `BP_Astra_SpaceportStage` | Launch deck, Astra Interceptor, orbital world | Spaceport wide assembly |
| `BP_Astra_HangarStage` | Launch deck, Astra Interceptor | Ship inspection assembly |

All three stages reuse the Phase 1 Blender imports. The launch deck top is
`Z=900 cm`; the Spaceport and Hangar interceptor components remain at
`Z=985 cm`, while the Home interceptor is centered at `(0, 0, 1000)` so the
shared Hub rig can light it consistently. Every stage Blueprint compiles with
warnings treated as errors.

The Hub and Hangar lighting rigs now place their key, fill, rim, and overhead
Rect Lights around the ship elevation instead of aiming below the deck. Their
attenuation ranges and output were retuned for the fixed-exposure pipeline;
the existing rig assets remain the single reusable lighting source.

## Production sequences

| Sequence | Rate and range | Spawnables | Camera verification |
| --- | --- | --- | --- |
| `LS_HomeOrbitLoop` | 30 fps, 0-300 | Home stage, Hub rig, orbital sky, post process, cine camera | Location and rotation keys at 0 and 300 |
| `LS_SpaceportLoop` | 30 fps, 0-300 | Spaceport stage, Hub rig, orbital sky, deck dressing, post process, cine camera | Location and rotation keys at 0 and 300 |
| `LS_HangarInspection` | 24 fps, 0-240 | Hangar stage, Hangar rig, orbital sky, deck dressing, post process, cine camera | Location and rotation keys at 0 and 240 |

Each sequence retains the master camera cut and the Cameras, Lighting, FX, and
Subject organization. Stage, lighting, and environment spawnables were rebuilt
from the latest compiled Blueprint defaults. MCP reopen verification resolved
one bound object for all 6 Home bindings and all 7 Spaceport and Hangar
bindings, including post process and deck dressing, so no stale copied CDO
remains.

Camera endpoints now frame the production subjects more tightly:

| Sequence | Start location / rotation | End location / rotation |
| --- | --- | --- |
| Home | `(1350, -1050, 1450)` / `(0, -14, 137)` | `(1100, -1400, 1550)` / `(0, -15.5, 124)` |
| Spaceport | `(2600, -3000, 1800)` / `(0, -14, 136)` | `(2200, -3300, 1600)` / `(0, -9, 123)` |
| Hangar | `(1800, -1800, 2000)` / `(0, -18, 129)` | `(-1500, -1700, 1750)` / `(0, -15, 55)` |

## Visual check

MCP viewport captures at every sequence endpoint confirmed that the
interceptor, deck, assigned Astra materials, cyan engine emission, orbital
backdrop, practical dressing, and corrected profile lighting render in all
three assemblies. Fixed manual exposure remains stable between the space-only
Home composition and the lit Spaceport and Hangar decks.

These remain production-layout sequences, not approved final renders. The hub
still needs production camera-lens review, final stage-specific dressing, MRQ
presets, rendered comparison frames, and desktop/mobile crop review.

No shipping React asset was changed. The render manifest remains
`in-progress`; current local media stays authoritative until comparison,
render, encoding, and platform gates pass.
