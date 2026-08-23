# Phase 3 Hub Production Audit

Verified through Unreal MCP on 2026-08-23 against
`D:/UnrealProjects/AstraValkRenderLab` branch `agent/hub-production`.

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
| `LS_HomeOrbitLoop` | 30 fps, 0-300 | Home stage, Hub rig, cine camera | Location and rotation keys at 0 and 300 |
| `LS_SpaceportLoop` | 30 fps, 0-300 | Spaceport stage, Hub rig, cine camera | Location and rotation keys at 0 and 300 |
| `LS_HangarInspection` | 24 fps, 0-240 | Hangar stage, Hangar rig, cine camera | Location and rotation keys at 0 and 240 |

Each sequence retains the master camera cut and the Cameras, Lighting, FX, and
Subject organization. Replaced stage spawnables were removed and their Subject
folders rebuilt so no stale binding IDs remain.

## Visual check

MCP viewport captures confirmed that the interceptor, deck, assigned Astra
materials, cyan engine emission, and profile lighting render in all three
assemblies. The first check exposed and drove fixes for deck intersection and
camera distance. These are blocking/layout sequences, not approved final
renders: the orbital environment still needs final space treatment, stage
dressing, atmosphere/VFX, exposure tuning, production camera lenses, and
desktop/mobile crop review.

No shipping React asset was changed. The render manifest remains
`in-progress`; current local media stays authoritative until comparison,
render, encoding, and platform gates pass.
