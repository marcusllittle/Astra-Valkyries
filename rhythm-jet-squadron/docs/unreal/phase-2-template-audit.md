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

## Movie Render Queue

The Movie Render Pipeline plugin is enabled in the project. The connected MCP
server does not expose a dedicated MRQ toolset, so project-owned Unreal Python
scripts use the loaded Movie Render Pipeline API to create and validate the
presets under `/Game/AstraRenderLab/Cinematics/RenderPresets`.

| Preset | Output | Rate | Sampling | Use |
| --- | ---: | ---: | ---: | --- |
| `MPC_Astra_Cinematic_1080p` | 1920x1080 | 24 fps | 8 temporal | Cinematics and combat plates |
| `MPC_Astra_UILoop_1080p` | 1920x1080 | 30 fps | 4 temporal | Seamless UI loops |
| `MPC_Astra_Still_4K` | 3840x2160 | 24 fps | 8 temporal x 8 spatial | Stills and dossier plates |
| `MPC_Astra_VFXAlpha_1080p` | 1920x1080 | 60 fps | 8 temporal | Transparent VFX PNG sequences |
| `MPC_Astra_Marketing_4K` | 3840x2160 | 24 fps | 8 temporal x 2 spatial | Horizontal marketing masters |
| `MPC_Astra_Marketing_Vertical_4K` | 2160x3840 | 24 fps | 8 temporal x 2 spatial | Vertical marketing masters |
| `MPC_Astra_Validation_640x360` | 640x360 | 24 fps | 1 temporal | One-frame pipeline checks |

`Content/Python/astra_mrq_presets.py` creates or updates all seven assets and
writes a generated audit to
`Saved/AstraRenders/manifests/mrq-preset-audit.json`. Alpha Output is enabled
through `r.PostProcessing.PropagateAlpha=True`; primitive alpha holdouts remain
disabled because the current overlays do not require them.

`Content/Python/astra_mrq_validate.py` queued the shared Hub map and
`LS_HomeOrbitLoop` with the validation preset. MRQ completed one job, rendered
one `640x360` PNG, flushed it to disk, and exited normally. The frame is
nonblank and shows the complete Astra Interceptor against the orbital
background. Full-length renders, delivery codecs, and side-by-side app review
remain production gates rather than completed outputs.

## Final state

After the follow-up template, hub, dressing, and MRQ work, the Unreal registry
contains 85 Astra assets, including seven new Movie Pipeline primary
configurations. All seven render presets are saved and not dirty. Four
specialized materials recompile, the reusable lighting/stage Blueprints compile
with warnings treated as errors, and the three hub sequences have verified
camera keys. MRQ reported stale folder-only binding references while loading
`LS_HomeOrbitLoop`; the missing bindings were not evaluation tracks, did not
dirty the saved sequence, and are retained as a cleanup item before final hub
delivery.
