# Phase 8 Marketing Render Audit

Verified through Unreal MCP and Movie Render Queue on 2026-08-25 against
`D:/UnrealProjects/AstraValkRenderLab`.

Phase 8 establishes a reusable campaign-output layer sourced from the same
Hub, zone, boss, and gacha assets used by Astra production. It does not create
marketing-only geometry and does not publish or integrate any candidate.

## Production set

`L_MarketingStage` and `BP_Astra_MarketingStage` provide a shared campaign
stage. `LS_KeyArt_Master`, Spaceport Neon, all three boss campaigns, and the SSR
reveal live under `Cinematics/Sequences/Marketing`. Three marketing material
instances preserve cyan, gold, and violet look-development starting points.

The MRQ library now covers 16:9 at 3840x2160, 1:1 at 2160x2160, 4:5 at
2160x2700, and 9:16 at 2160x3840. Every sequence remains 24 fps over frames
`0-240` and has a camera-component bool track that disables fixed 16:9 aspect
constraints for crop-safe rendering.

## MCP verification

- The marketing stage Blueprint compiles with warnings treated as errors.
- All six sequences report 24 fps and a `0-240` playback range.
- All source environment, lighting, camera, subject, post-process, and VFX
  bindings survived duplication.
- The initial portrait proofs exposed fixed-camera letterboxing. Sequencer
  camera constraint tracks removed it before the final review queue.

## Visual gate

The 24 final proofs fill all four target aspect ratios, but none beats current
Astra art. Hub frames remain empty service architecture, the bosses still read
as stylized production blockouts, and the SSR frame is nearly black with no
featured reward. Keep every Phase 8 manifest entry `in-progress` with
`retain-current`; the reusable output and review pipeline is ready for future
production geometry without falsely approving these renders.
