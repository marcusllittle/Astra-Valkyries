# Phase 5 Mission Flow Audit

Verified through Unreal MCP and Movie Render Queue on 2026-08-25 against
`D:/UnrealProjects/AstraValkRenderLab`.

This slice establishes the reusable Unreal production path for briefing,
launch, debrief, and return shots. It does not replace any React media. The
shipping videos and stills remain authoritative because the current Unreal
proofs do not clear the visual quality bar.

## Runtime contract

The existing React flow already provides the required deterministic behavior:

- Briefing presents the selected zone, then queues unseen pilot and ship clips.
- Cutscenes advance on media error, support per-clip completion, and allow the
  complete queue to be skipped.
- Results select a zone-owned debrief still and victory dialogue.
- Victory can queue Nova's return clip before routing to Spaceport.

Phase 5 therefore adds render sources behind this contract instead of changing
navigation, seen-state, fallback, or error behavior.

## Unreal assets

The builder creates dedicated maps, stage wrappers, a cinematic ship wrapper,
and nine reusable 24 fps sequences under `/Game/AstraRenderLab`:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_phase5_flow.py"
```

Owned maps:

- `/Maps/Hub/L_LaunchDeck`
- `/Maps/Hub/L_Spaceport`
- `/Maps/Stages/L_Debrief`

Owned sequences:

- `LS_FlowShotTemplate_24`
- `LS_Briefing_NebulaRunway`, `LS_Briefing_SolarRift`, and
  `LS_Briefing_AbyssCrown`
- `LS_Launch_AstraInterceptor`
- `LS_Debrief_NebulaRunway`, `LS_Debrief_SolarRift`, and
  `LS_Debrief_AbyssCrown`
- `LS_Return_Spaceport`

The launch and return stage wrappers hide the inherited static Interceptor.
Their sequences use an independent `BP_AstraInterceptor_Cinematic` spawnable,
so ship motion can be keyed without modifying shared Hub assets.

## MCP verification

- `BP_Astra_LaunchFlowStage`, `BP_Astra_ReturnFlowStage`, and
  `BP_AstraInterceptor_Cinematic` compile with warnings treated as errors.
- All eight deliverable sequences use 24 fps and playback frames `0-144`.
- Briefing sequences have seven explicit bindings; debrief sequences have
  eight; launch and return each have nine.
- Launch ship Y keys are `0, 0, 2600, 9000` at frames `0, 48, 96, 144`.
- Return ship Y keys are `9000, 3600, -350, -350` at frames
  `0, 48, 108, 144`.
- Each debrief ship has restrained X, Y, Z, and pitch motion over 144 frames.
- Empty inherited transform tracks were removed after exact binding and track
  proxy readback.

## Visual gate

Render the start, midpoint, and end of every deliverable sequence with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase5_flow.py"
```

The command produced 24 nonblank 1920x1080 PNGs under
`Saved/AstraRenders/phase5-mission-flow-proof-1080p`.

The templates are technically reusable, but the current proofs are not
shipping candidates. The Interceptor is visibly low-detail, the launch and
return stages are sparse, the briefing environments remain blockouts, and the
debrief compositions either lose the ship in darkness or obscure it with
foreground effects. Keep the current briefing videos, Blender launch, authored
debrief stills, and Nova return clip. Future passes must use production ship
geometry, improve environment detail and lighting, and pass desktop plus
centered mobile crop review before any React integration.
