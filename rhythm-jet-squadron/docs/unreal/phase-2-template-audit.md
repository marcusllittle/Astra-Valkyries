# Phase 2 Unreal Template Audit

Verified through Unreal MCP on 2026-08-23 against the merged
`agent/phase2-templates` baseline and the follow-up `agent/hub-production`
branch in
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
  objects, and merged Unreal pull request #1.

## Materials

- `M_Astra_Surface`: opaque lit master exposing base color, metallic,
  roughness, specular, emissive color, and emissive strength.
- `M_Astra_Energy`: additive, two-sided, unlit master with particle-color
  support and Niagara sprite, ribbon, and mesh usage enabled.
- `M_Astra_Glass`: two-sided translucent lit glass with tint, roughness,
  specular, and opacity controls.
- `M_Astra_Hologram`: additive unlit hologram master with particle color,
  view-angle Fresnel falloff, color, intensity, and opacity controls.
- `M_Astra_UnlitFlipbook`: translucent unlit SubUV master for Niagara sprite
  sheets with texture, tint, emissive intensity, particle color, and opacity.
- `M_Astra_Decal`: translucent unlit deferred decal master with texture, tint,
  and opacity. The unlit emissive path replaced an initial SM6-incompatible
  lit decal graph and recompiles without a new material failure.
- `M_Astra_EnvironmentSurface`: opaque lit environment master with the shared
  surface controls plus ambient occlusion, static-lighting, Nanite, and LOD
  usage support.
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
overhead, and ambient-sky components. Seven compiled profile variants provide
independent Hub, Hangar, Briefing, Combat, Dossier, Gacha, and Marketing color
and intensity treatments. The rigs use separate cool and warm accents, large
rect-light sources, bounded attenuation, shadows, reflection and GI
contribution, and real-time skylight capture. Every Blueprint compiles with
warnings treated as errors.

## Remaining render-template work

The connected MCP server exposes Sequencer, Sequencer keyframing, cameras, and
editor viewport capture, but no Movie Render Queue toolset. The sequence
templates are valid production inputs; deterministic MRQ presets, horizontal
and vertical output settings, codecs, alpha handling, and final render tests
remain pending rather than being represented as completed assets.

## Final state

After the follow-up template and hub work, the Unreal registry contains 70
Astra assets: 29 StaticMeshes, seven Materials, nine
MaterialInstanceConstants, six NiagaraSystems, eight LevelSequences, and 11
Blueprints. All assets are saved. Four specialized materials recompile, all 10
new lighting/stage Blueprints compile with warnings treated as errors, and the
three hub sequences have verified camera keys. Earlier session log entries for
the first decal graph and stale replaced Sequencer bindings were repaired and
did not recur when the assets were reopened.
