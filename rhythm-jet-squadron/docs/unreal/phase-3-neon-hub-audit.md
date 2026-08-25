# Phase 3 Neon Hub Candidate Audit

Verified through Unreal MCP on 2026-08-24 against
`D:/UnrealProjects/AstraValkRenderLab` branch
`agent/neon-hangar-spaceport`.

## Scope and product constraints

This pass uses the Fab Neon Parallax environment kit to improve the Hangar and
Spaceport before Phase 4 resumes. It does not migrate app UI into Unreal and it
does not replace either approved fallback:

- Spaceport keeps Nova's pre-takeoff video.
- Hangar and launch flow keep the Blender Astra Interceptor takeoff.
- The Neon Parallax aircraft is excluded, and the inherited low-detail Astra
  Interceptor component is hidden in both candidate stages.

## Astra-owned candidates

| Purpose | Stage | Sequence | Accent |
| --- | --- | --- | --- |
| Enclosed service bay | `BP_Astra_HangarNeonStage` | `LS_HangarNeonInspection` | Cyan |
| Open orbital gantry | `BP_Astra_SpaceportNeonStage` | `LS_SpaceportNeonLoop` | Gold |

The candidates preserve `/Game/NeonParallax` as an untouched vendor source.
Astra material wrappers live under
`/Game/AstraRenderLab/Materials/Instances/Hub/Neon`, while production stage and
sequence assets remain under the established Astra folders. Structural pieces
use Astra deck steel and energy accents rather than the pack's red showcase
look.

## MCP verification

- Both Blueprints compile with warnings treated as errors and save normally.
- `LS_HangarNeonInspection` binds `STAGE_NeonHangar` to the compiled Hangar
  candidate.
- `LS_SpaceportNeonLoop` binds `STAGE_NeonSpaceport` to the compiled Spaceport
  candidate.
- Camera transforms were read back through Sequencer keyframing tools and
  retuned to clear the modular frames rather than orbit the rejected ship.
- `astra_mrq_sample_neon_hub_1080p.py` completed six 1920x1080 MRQ jobs: start,
  middle, and end for each candidate.

The first proof correctly failed visual review because imported frame pieces
intersected the inherited camera paths. The corrected proof clears those paths,
uses dark Astra structure, and separates the enclosed cyan Hangar treatment
from the open warm Spaceport treatment.

## Approval state

Both outputs remain `in-progress`. No rendered file has been copied into
`public/assets`, and no React, Electron, or mobile runtime behavior changes in
this slice. Full-motion encodes still need explicit product approval and
desktop/mobile comparison before either candidate can replace its fallback.

The next production step is Phase 4: inventory the Free Niagara Pack systems,
duplicate selected effects under `/Game/AstraRenderLab/VFX`, and adapt them to
the three zones, Aegis telegraphs, detachable-arm destruction, combat impacts,
and mobile-safe presentation.
