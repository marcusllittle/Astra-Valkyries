# Phase 3 Hub Production Audit

Verified through Unreal MCP on 2026-08-23 against
`D:/UnrealProjects/AstraValkRenderLab` branch
`agent/hub-composition-preview` (Unreal PR #9).

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
  bloom and motion blur, and shared color finishing. Its exposure compensation
  is `-0.75 EV` after production-frame review. It is bound under the Lighting
  folder in every hub sequence.
- `BP_Astra_HubDeckDressing` adds reusable cyan and amber guide strips, deck
  pylons, emissive beacons, and low-cost practical lights without replacing
  the imported launch deck. Spaceport and Hangar bind the same compiled
  spawnable under FX.
- `BP_Astra_SpaceportDressing` adds an open launch gantry, dock signals,
  traffic towers, and cool overhead illumination around the shared deck.
- `BP_Astra_HangarDressing` adds an enclosed service wall, bay framing,
  maintenance pods, ceiling rails, and warmer overhead illumination.

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
| `LS_HomeOrbitLoop` | 30 fps, 0-300 | Home stage, Hub rig, orbital sky, post process, cine camera | Closed location, rotation, and focus keys at 0, 150, and 300 |
| `LS_SpaceportLoop` | 30 fps, 0-300 | Spaceport stage, Hub rig, orbital sky, deck dressing, Spaceport gantry, post process, cine camera | Closed location, rotation, and focus keys at 0, 150, and 300 |
| `LS_HangarInspection` | 24 fps, 0-240 | Hangar stage, Hangar rig, orbital sky, deck dressing, Hangar service bay, post process, cine camera | Location and rotation keys at 0, 120, and 240 |

Each sequence retains the master camera cut and the Cameras, Lighting, FX, and
Subject organization. Stage, lighting, and environment spawnables were rebuilt
from the latest compiled Blueprint defaults. MCP reopen verification resolved
one bound object for all 6 Home bindings and all 8 Spaceport and Hangar
bindings, including post process, shared deck dressing, and stage-specific
dressing, so no stale copied CDO remains.

Camera paths now frame the production subjects more tightly. Home and
Spaceport preserve the previous endpoint as frame 150 and return to the exact
starting transform at frame 300, producing a closed A-to-B-to-A UI loop:

| Sequence | Start location / rotation | Midpoint location / rotation | End location / rotation |
| --- | --- | --- | --- |
| Home | `(2200, -1800, 1800)` / `(0, -14.5, 139)` | `(1800, -2200, 1900)` / `(0, -16.5, 126)` | Matches start |
| Spaceport | `(2600, -3000, 1800)` / `(0, -12, 131)` | `(2200, -3300, 1600)` / `(0, -9, 123)` | Matches start |
| Hangar | `(1800, -1800, 2000)` / `(0, -18, 129)` | `(150, -2600, 1900)` / `(0, -19.5, 93.3)` | `(-1500, -1700, 1750)` / `(0, -15, 55)` |

## Production camera and crop verification

The camera cuts were captured through Sequencer camera lock so validation used
the authored CineCamera lens rather than the editor viewport's 90-degree field
of view. Each camera-component binding now has explicit focal-length, aperture,
and manual-focus-distance keys at both shot endpoints:

| Sequence | Focal length | Aperture | Focus distance start / end |
| --- | ---: | ---: | ---: |
| Home | 24 mm | f/5.6 | 3150 / 3150 cm |
| Spaceport | 35 mm | f/5.6 | 4300 / 4300 cm |
| Hangar | 35 mm | f/5.6 | 2950 / 2625 cm |

Home focus reaches `3225 cm` at frame 150, and Spaceport reaches `4250 cm` at
frame 150. Matching the transform and camera-component values at frames 0 and
300 prevents a spatial or depth-of-field snap at browser loop boundaries.

Home uses the wider environmental lens and longer camera move because its
previous 35 mm framing clipped the interceptor's wingtip at the real camera
field of view. Spaceport and Hangar retained their 35 mm framing after their
actual camera-cut captures passed.

Endpoint captures were reviewed as 16:9 masters and against the centered 9:16
crop band, which retains the middle 31.6 percent of the horizontal frame. All
desktop endpoints preserve the ship silhouette. The mobile band preserves the
fuselage, cockpit, and engine identity while allowing outer deck and wingtip
context to crop away behind the app UI.

## Visual check

MCP viewport captures at every sequence endpoint confirmed that the
interceptor, deck, assigned Astra materials, cyan engine emission, orbital
backdrop, practical dressing, and corrected profile lighting render in all
three assemblies. Spaceport now reads as an open exterior launch platform with
a gantry and traffic markers, while Hangar reads as an enclosed maintenance bay
with a rear service wall and ceiling rails. Neither dressing pass obscures the
ship at the start or end camera frame. Fixed manual exposure remains stable
between the space-only Home composition and the two lit deck environments.

The hub sequences have deterministic MRQ assignments:

| Sequence | Render preset |
| --- | --- |
| `LS_HomeOrbitLoop` | `MPC_Astra_UILoop_1080p` |
| `LS_SpaceportLoop` | `MPC_Astra_UILoop_1080p` |
| `LS_HangarInspection` | `MPC_Astra_Cinematic_1080p` |

`astra_mrq_sample_hub.py` rendered start, midpoint, and end frames for all three
sequences at `640x360`. `astra_mrq_sample_hub_1080p.py` then rendered the same
nine proof frames using the assigned production presets. The final proof queue
completed in 19 seconds without a current-run error or stale-folder warning.
The full-resolution proofs retain the complete Home silhouette, center the
Spaceport ship through the move, and keep the Hangar wings in frame through the
new inspection arc.

`astra_mrq_render_hub.py` completed the final three-job master queue in 3:01:

| Sequence | Master output | Encoded review output |
| --- | --- | --- |
| `LS_HomeOrbitLoop` | 300 PNGs, 1920x1080, 30 fps | H.264, 10.0 seconds, 300 frames |
| `LS_SpaceportLoop` | 300 PNGs, 1920x1080, 30 fps | H.264, 10.0 seconds, 300 frames |
| `LS_HangarInspection` | 240 PNGs, 1920x1080, 24 fps | H.264, 10.0 seconds, 240 frames |

The local encoded reviews live under `Saved/AstraRenders/encoded` and are not
versioned. `ffprobe` confirmed codec, resolution, frame rate, duration, and
frame count. Frame 299-to-0 PSNR is `49.0 dB` for Home and `48.2 dB` for
Spaceport. The authored transform, focal length, aperture, and manual focus
values match exactly at frames 0 and 300; remaining pixel variation comes from
the temporal render and ambient scene evaluation.

The first multi-job validation exposed stale folder membership left by earlier
binding replacement. The dead organizational IDs were removed, the rebuilt
post-process spawnables were saved under Lighting, and subsequent validation,
proof, and master queues completed without new stale-folder warnings.

The placement review approved the Home loop as a full-viewport background and
the Hangar sequence as an inspection-only loop above the loadout. Their local
H.264 deliveries and frame-zero WebP posters are packaged under
`/assets/unreal/hub/`. Both are now `integrated` in the manifest.

Runtime verification covered Home title and menu states plus the Hangar
loadout at `1440x900` and `390x844`. Both H.264 files reached playable state,
advanced, produced no console errors, and introduced no horizontal overflow.
Reduced-motion mode renders the static posters without mounting autoplay
video. The production build passed exact `file://` and hash-router navigation
through Home and Hangar with no failed requests, and Capacitor synchronized the
same production web payload. Windows NSIS assembly still has to run under a
native Windows Node toolchain because WSL cannot cross-compile the existing
`bufferutil` module.

The Spaceport candidate is not approved. Nova's existing pre-takeoff clip
remains the shipping Spaceport presentation. The Hangar approval also does not
replace the Blender Astra Interceptor takeoff: that clip remains authoritative
for the launch cinematic until the planned Phase 5 Unreal sequence is clearly
better.
