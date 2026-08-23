# Phase 2 Unreal Template Audit

Verified through Unreal MCP on 2026-08-23 against the local
`agent/phase2-templates` branch in
`D:/UnrealProjects/AstraValkRenderLab`.

## Source control

- Initialized the standalone Unreal project as a Git repository.
- Excluded `Binaries`, `DerivedDataCache`, `Intermediate`, `Saved`, IDE files,
  and generated project files.
- Enabled local Git LFS tracking for Unreal assets, maps, FBX, HDR/EXR, audio,
  and rendered video.
- Committed the 38-asset Phase 1 baseline on local `main`.
- Created local branch `agent/phase2-templates` for the work below.
- Created the private GitHub remote
  `https://github.com/marcusllittle/AstraValkRenderLab`.
- Pushed local `main` and `agent/phase2-templates`, including all required LFS
  objects, and opened Unreal pull request #1.

## Materials

- `M_Astra_Surface`: opaque lit master exposing base color, metallic,
  roughness, specular, emissive color, and emissive strength.
- `M_Astra_Energy`: additive, two-sided, unlit master with particle-color
  support and Niagara sprite, ribbon, and mesh usage enabled.
- `M_Astra_Glass`: two-sided translucent lit glass with tint, roughness,
  specular, and opacity controls.
- Nine retained material instances cover sapphire armor, command ceramic,
  carbon armor, deck steel, gold trim, cockpit glass, and cyan/gold/danger
  energy.
- The interceptor and launch deck use the new dedicated instances. Thumbnail
  comparison confirmed improved material separation, cockpit readability,
  engine emission, and launch-deck guidance/warning color hierarchy.
- Three temporary opaque emissive instances were removed after MCP confirmed
  they had no referencers.

## Niagara

Six renderer-backed templates derive from Epic Niagara templates:

- `NS_Astra_Impact_Template`
- `NS_Astra_Muzzle_Template`
- `NS_Astra_Projectile_Template`
- `NS_Astra_Telegraph_Template`
- `NS_Astra_EngineExhaust_Template`
- `NS_Astra_Ambient_Template`

Every system reports `UpToDate`, has at least two renderer-backed emitters, and
has zero compile errors, compile warnings, stack errors, or stack warnings.

## Sequencer and cameras

| Template | Display rate | Range | Use |
| --- | ---: | ---: | --- |
| `LS_Template_Cinematic_24` | 24 fps | 0-240 | Ten-second cinematic shots |
| `LS_Template_UILoop_30` | 30 fps | 0-300 | Ten-second UI loops |
| `LS_Template_Still` | 24 fps | 0-1 | Deterministic still renders |
| `LS_Template_VFXAlpha_60` | 60 fps | 0-120 | Two-second transparent VFX |
| `LS_Template_Marketing_24` | 24 fps | 0-240 | Marketing shots |

Every sequence uses a 24,000 Hz tick resolution, includes Cameras, Subject,
Lighting, and FX folders, and has a spawnable `CAM_Astra_Master` cine camera.

## Lighting

`BP_Astra_LightingRig_Studio` contains configured movable key, fill, rim,
overhead, and ambient-sky components. The rig uses separate cool and warm
accents, large rect-light sources, bounded attenuation, shadows, reflection and
GI contribution, and real-time skylight capture. It compiles with warnings
treated as errors.

## Final state

The Unreal registry contains 53 Astra assets: 29 StaticMeshes, three Materials,
nine MaterialInstanceConstants, six NiagaraSystems, five LevelSequences, and
one lighting Blueprint. All assets are saved, no asset remains dirty, and the
editor log contains no relevant material, Blueprint, Niagara, Sequencer, or
Astra failures.
