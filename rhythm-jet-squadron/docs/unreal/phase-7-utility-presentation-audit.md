# Phase 7 Utility Presentation Audit

Verified through Unreal MCP, Movie Render Queue, and in-app desktop/mobile
review on 2026-08-25 against `D:/UnrealProjects/AstraValkRenderLab`.

Phase 7 establishes reusable sector, ability, trophy, and forge render sources.
No Unreal proof replaces current Astra media in this pass. The shipping app
change is limited to stronger Skills and Leaderboard hierarchy; Missions and
Network already have purpose-built operational interfaces and remain intact.

## Unreal assets

Build or refresh the utility slice with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_phase7_utility.py"
```

Owned maps are `L_HoloMap`, `L_VFXStage`, `L_TrophyStage`, and `L_ForgeStage`.
The Utility sequence folder contains three mission sectors, three ability
previews, `LS_LeaderboardSeason`, and `LS_NetworkForgeLoop`. Four stage
wrappers, three material instances, four Niagara systems, and four Niagara
Blueprint wrappers live in their Phase 7-owned Utility folders.

## MCP verification

- All four stage Blueprints compile with warnings treated as errors.
- All four Niagara systems report `UpToDate`, with no stale scripts, errors, or
  warnings.
- Ability Burst and Shield initially inherited camera-only alpha templates.
  Explicit Niagara spawnables were added and both sequences were saved through
  Sequencer and asset MCP tools before rendering.
- Mission sequences run at 24 fps over frames `0-144`; ability previews run at
  60 fps over `0-120`; trophy and forge loops run at 30 fps over `0-180`.

## Visual gate

Render one comparison frame per sequence with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase7_utility.py"
```

Eight proofs were written under
`Saved/AstraRenders/phase7-utility-proof-1080p`.

- Mission sectors expose low-detail combat blockouts instead of premium
  holographic navigation plates.
- Ability Burst is severely overexposed; Shield and Overdrive need dedicated
  camera, scale, and alpha tuning before they can support skill nodes.
- The trophy proof is an empty service bay, not a leaderboard reward image.
- The forge loop is a tiny energy mark on black and does not improve Network.

Keep current mission maps and gameplay VFX fallbacks. The Skills and
Leaderboard UI polish ships without these Unreal plates. Revisit the render
sources only after dedicated composition passes clearly beat the current app at
real desktop and mobile sizes.
