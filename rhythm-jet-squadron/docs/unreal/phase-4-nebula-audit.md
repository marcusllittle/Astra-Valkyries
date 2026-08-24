# Phase 4 Nebula Runway Production Audit

Verified through Unreal MCP on 2026-08-23 against
`D:/UnrealProjects/AstraValkRenderLab` branch
`agent/phase4-nebula-vertical-slice`.

This is the first Phase 4 vertical slice. It establishes the reusable zone,
boss, VFX, and Sequencer contract; it does not approve a React replacement.

## Reused Astra sources

The pass retains current Astra work instead of rebuilding it:

| Source | Unreal destination | Purpose |
| --- | --- | --- |
| `vista_nebula_runway.png` | `T_NebulaRunwayVista` | 16:9 deterministic vista plate |
| `background_far.png` | `T_NebulaRunwayFar` | Nebula sky material source |
| `maps/nebula-runway.png` | `T_NebulaRunwayMap` | Zone identity/reference texture |
| `boss_aegis_dreadnought.png` | `T_AegisDreadnought_Concept` | Boss silhouette and scale reference |

Project-owned copies live under `SourceAssets`; the Aegis concept contract
records its source hash and the required Blender handoff. Existing Phase 2
master materials, lighting, Niagara templates, MRQ presets, and Hub post
process are reused.

## Zone production assets

- `L_NebulaRunway` is a saved offline render map copied from the clean Hub
  render-stage map, not from the open landscape test world.
- `BP_NebulaRunway_CombatStage` compiles with warnings treated as errors and
  contains 42 components. It provides the runway spine, paired rails, energy
  lanes, nine center pulses, five pylon pairs, emissive beacons, distant
  debris, and a full-frame Nebula vista plate.
- `BP_NebulaRunway_SkyDome` reuses the two-sided unlit orbital-sky master with
  `MI_NebulaRunway_Sky`.
- `MI_NebulaRunway_Surface`, `MI_NebulaRunway_Energy`,
  `MI_NebulaRunway_Hologram`, `MI_NebulaRunway_Sky`, and
  `MI_NebulaRunway_Vista` are zone-specific instances of existing Astra
  masters.

The stage geometry is render-set dressing, not a replacement for Blender
production meshes. Its role is to establish scale, lanes, composition, and
lighting while final zone geometry is authored at the procedural source.

## Niagara variants

The following systems were duplicated from the Phase 2 templates, tagged for
Phase 4, and wrapped in reusable Actor Blueprints:

| Zone systems | Aegis systems |
| --- | --- |
| `NS_NebulaRunway_Ambient` | `NS_Aegis_Telegraph` |
| `NS_NebulaRunway_Projectile` | `NS_Aegis_ArmBreak` |
| `NS_NebulaRunway_Impact` | `NS_Aegis_EngineExhaust` |

The variants preserve the validated template emitter topology. Their visual
tuning and timing remain an MRQ review gate; duplication alone is not treated
as approval.

## Three-piece Aegis contract

`BP_AegisDreadnought_Blockout` contains 22 components: a default root, three
named piece roots, and six primitive components per piece. The core,
left-arm, and right-arm groups establish an approximately `9000 cm` assembled
width and long weapon-battery silhouettes.

Sequencer uses three independent Actor Blueprints rather than the combined
assembly:

- `BP_Aegis_Core_Blockout`
- `BP_Aegis_LeftArm_Blockout`
- `BP_Aegis_RightArm_Blockout`

Each compiles with warnings treated as errors and has seven components. Their
metadata is `BlockoutOnly` with `BlenderRequired` as the geometry source. The
production root names, pivots, material slots, orientation, and mobile
readability requirements are specified in
`SourceAssets/Concept/Bosses/Aegis/README.md` in the Unreal repository.

### Production geometry handoff

The procedural `aegis-boss` Blender profile now generates and exports three
independent production candidates:

- `SM_Aegis_Core`
- `SM_Aegis_LeftArm`
- `SM_Aegis_RightArm`

The generated contract measures an assembled width of `9113.08 cm`. The core
contains 3824 vertices and 1960 triangles; each mirrored arm contains 3360
vertices and 1740 triangles. All three retain the six stable Aegis material
slots, use the existing Astra master-material instances, and import with zeroed
socket pivots. Nanite is intentionally disabled because the existing cyan and
danger energy instances use additive blending, which Nanite rejects; these
pieces are only 1740-1960 triangles. Unreal read-back confirms that the core
faces to `Y=-3200 cm` and each long battery reaches `Y=-3955 cm`.

`BP_Aegis_Core`, `BP_Aegis_LeftArm`, and `BP_Aegis_RightArm` expose the pieces
as independent movable spawnable candidates. The compiled
`BP_AegisDreadnought_ProductionCandidate` assembles them at `X=0`, `X=-3600`,
and `X=3600 cm` for visual comparison. The original blockout assets and both
blockout sequences remain unchanged.

Sequencer's current MCP class-swap operation retains only the last replacement
when several custom spawnables are changed in one duplicated sequence, and its
track-copy operation does not expose the custom spawnable tracks. Failed
comparison duplicates were deleted rather than checked in. The production
sequence must therefore be rebuilt with explicit bindings and keyframes; no
blockout sequence has been relabeled as production.

## Sequencer verification

MCP reopened and evaluated all three sequences. Every binding resolved one
object, each sequence retained one camera-cut master track, and all five root
folders were present.

| Sequence | Rate and range | Resolved bindings | Authored purpose |
| --- | --- | ---: | --- |
| `LS_CombatPlate_NebulaRunway` | 24 fps, 0-240 | 13 | Zone approach, combat lane, boss scale |
| `LS_BossIntro_AegisDreadnought` | 24 fps, 0-144 | 11 | Core and arm reveal with weapon telegraph |
| `LS_Aegis_ArmBreak_Previz` | 24 fps, 0-120 | 11 | Independent arm-break choreography |
| `LS_BossIntro_AegisDreadnought_Production` | 24 fps, 0-144 | 10 | Production geometry reveal, telegraph, and mobile-safe camera |
| `LS_Aegis_ArmBreak_Production` | 24 fps, 0-120 | 10 | Production three-piece break with independent impact FX |

The arm-break key audit confirmed that both arms remain attached through frame
64, then move from `X=-3600/+3600` to `X=-6500/+6500` by frame 119. Their roll
keys diverge to `-28/+28` degrees and yaw keys to `-14/+14` degrees. Left and
right arm-break Niagara wrappers are bound independently at the separation
points.

## Visual and render gate

An MCP camera proof confirmed that the stage, lighting, emissive lanes, three
boss pieces, and Niagara spawnables render together. The capture also exposed
two editor-preview constraints: `CaptureViewport` draws a CineCamera's editor
body when it is sampled from the same explicit transform, and the currently
open unsaved Open World contributes landscape and cloud actors. The camera
visualization was isolated without saving editor state, and the user's level
visibility and sky-sphere transform were restored after the check.

A clean production MRQ proof was rendered with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase4_aegis_production.py"
```

The script queues six 1920x1080 proof frames under
`Saved/AstraRenders/phase4-aegis-production-proof-1080p`: approach, reveal,
threat, attached, impact, and detached. The final pass was inspected at 16:9
and as centered `498x1080` crops scaled to `390x844`.

The production proof established:

1. Both sequences explicitly bind the three production Blueprints; the
   blockout sequences remain untouched.
2. The centered mobile crop retains the core and both attached arms while
   leaving the lower playfield open for Astra's runtime player ship and UI.
3. Left and right arms remain separate through frame 64, then move and rotate
   independently with separate break FX.
4. Duplicate automatically generated transform tracks were removed before the
   final render, leaving one transform track per spawnable.

Visual approval is still required before replacing Astra's current Aegis art.
The production candidate is intentionally dark and emissive; it must be judged
against the shipping fallback at gameplay size. Browser, Electron, and mobile
integration checks begin only after that approval.

### Stylized-premium continuation

The continuation branch preserves the production bindings and revises the six
Aegis material instances toward Astra's purple armor, cyan accent, and
pink-orange threat language. It also moves both production cameras closer while
retaining the lower gameplay-safe region. A new six-frame 1920x1080 MRQ proof
confirmed the material and camera changes render correctly.

The revised proof is still not approved for runtime use. Its low three-quarter
angle compresses the planar dreadnought silhouette into thin bars and remains
less legible than `boss_aegis_dreadnought.png`. The next proof must use a higher
three-quarter view that exposes the armor planes; the current sprite remains the
authoritative fallback.

The next iteration rebuilt the procedural Blender contract instead of masking
the problem in Unreal. The core now has wider shoulder masses, each detachable
arm has a broad overlapping shield plane and battery housing, and the attachment
pivots moved from `X=-3600/+3600` to `X=-3000/+3000` cm. The assembled source is
`8911.13 cm` wide and retains the same six material-slot names. Blender generated
and exported all three pieces with a validated contract; Unreal replaced the
meshes in place, restored all material assignments, and updated both production
sequences without changing their bindings.

The high three-quarter proof is materially clearer and preserves the arm-break
choreography, but it remains a review candidate rather than a shipping asset.
The current sprite continues to win at gameplay scale, so runtime integration is
still intentionally blocked.

No Unreal output from this slice is integrated into the React runtime.
