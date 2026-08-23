# Phase 3 Hub Production Audit

Verified through Unreal MCP on 2026-08-23 against
`D:/UnrealProjects/AstraValkRenderLab` branch
`agent/hub-environment-polish`.

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
`Z=900 cm`; the Spaceport and Hangar interceptor components were placed at
`Z=985 cm` after MCP bounds read-back so the ship no longer intersects the
deck. Every stage Blueprint compiles with warnings treated as errors.

## Production sequences

| Sequence | Rate and range | Spawnables | Camera verification |
| --- | --- | --- | --- |
| `LS_HomeOrbitLoop` | 30 fps, 0-300 | Home stage, Hub rig, orbital sky, cine camera | Location and rotation keys at 0 and 300 |
| `LS_SpaceportLoop` | 30 fps, 0-300 | Spaceport stage, Hub rig, orbital sky, cine camera | Location and rotation keys at 0 and 300 |
| `LS_HangarInspection` | 24 fps, 0-240 | Hangar stage, Hangar rig, orbital sky, cine camera | Location and rotation keys at 0 and 240 |

Each sequence retains the master camera cut and the Cameras, Lighting, FX, and
Subject organization. Stage, lighting, and environment spawnables were rebuilt
from the latest compiled Blueprint defaults. MCP reopen verification resolved
one bound object for every stage, rig, sky, camera, and camera-component
binding, so no stale copied CDO remains.

Camera endpoints now frame the production subjects more tightly:

| Sequence | Start location / rotation | End location / rotation |
| --- | --- | --- |
| Home | `(6600, -1900, 1600)` / `(0, -15, 150)` | `(6450, -2100, 1700)` / `(0, -18, 141)` |
| Spaceport | `(2600, -3000, 1800)` / `(0, -14, 136)` | `(2200, -3300, 1600)` / `(0, -9, 123)` |
| Hangar | `(1800, -1800, 2000)` / `(0, -18, 129)` | `(-1500, -1700, 1750)` / `(0, -15, 55)` |

## Visual check

MCP viewport captures in `L_Astra_HubRenderStage` confirmed that the
interceptor, deck, assigned Astra materials, cyan engine emission, orbital
backdrop, and profile lighting render in all three assemblies. The clean-map
check removed the temporary Open World landscape from the shots and exposed
stale Sequencer spawn templates that are now repaired.

These remain blocking/layout sequences, not approved final renders. The hub
still needs stage dressing, exposure tuning, production camera lenses, MRQ
presets, and desktop/mobile crop review. In particular, the current deck and
interceptor lighting is not yet strong enough to replace shipping media.

No shipping React asset was changed. The render manifest remains
`in-progress`; current local media stays authoritative until comparison,
render, encoding, and platform gates pass.
