# Phase 4 Solar Rift and Fab Niagara Audit

Verified through Unreal MCP on 2026-08-24 against the stacked Unreal branch
`agent/phase4-solar-niagara`.

## Solar Rift production slice

The Solar Rift pass reuses the verified Nebula Runway production contract and
existing Astra web art. It adds:

- `L_SolarRift`
- `BP_SolarRift_CombatStage` and `BP_SolarRift_SkyDome`
- five Solar material instances and four project-owned texture imports
- Solar ambient, projectile, and impact Niagara wrappers
- `LS_CombatPlate_SolarRift`

The stage remains an offline visual-production asset. No Unreal package ships
inside the React, Electron, or mobile runtime.

## Free Niagara intake

All five systems from `/Game/FreeNiagaraPack` were inspected through the
Niagara MCP toolset and duplicated into Astra-owned prototypes:

| Vendor system | Astra prototype | Intended use |
| --- | --- | --- |
| `NS_ActiveAtom` | `NS_Astra_HeliosCore_Prototype` | Helios core and Solar impact burst |
| `NS_EyeColor` | `NS_Astra_TargetLockEye_Prototype` | Target lock and projectile core |
| `NS_GridFigure` | `NS_Astra_GridTelegraph_Prototype` | Boss and lane telegraphs |
| `NS_StarTrack_Medium` | `NS_Astra_StarStream_Prototype` | Zone speed and ambient flow |
| `NS_Worm-Hole` | `NS_Astra_AbyssPortal_Prototype` | Abyss Crown portal treatment |

The vendor folder remains unchanged. Each source system is GPU-compute, uses
sprite renderers, and exposes no user variables. That is acceptable for
offline Unreal rendering, but Astra-owned production variants are required for
color, scale, timing, and density control.

Solar Rift currently uses these derivatives:

- `NS_SolarRift_StarStream`
- `NS_SolarRift_ProjectileCore`
- `NS_SolarRift_ImpactBurst`

## Sequencer repair and verification

The restored builder exposed two UE 5.8 recovery problems. Loaded packages did
not necessarily exist on disk, and actor-template class swaps reported success
without persisting replacement classes in a duplicated sequence. The builder
now force-saves recovered assets and recognizes the descriptive impact and
projectile binding names.

The production sequence was repaired through explicit spawnable rebuilds. Each
of the five Solar replacements received the copied transform track, resolved
its Solar class before the stale binding was removed, and was restored to a
clean `Environment` or `FX` folder. MCP read-back confirms 13 active bindings,
including the Solar stage, sky, ambient, projectile, and impact classes.

## Render proof

`astra_mrq_sample_phase4_solar.py` completed three 1920x1080 jobs at frames 0,
120, and 239. The first queue revealed that the old template-derived systems
could not initialize their data interfaces. Replacing them with the Free
Niagara derivatives produced a clean second queue with no Niagara errors.

The result has a strong Solar identity and clearly visible motion energy, but
the current effect density is intentionally not approved. It must be reduced
and checked at gameplay size and against a centered mobile crop before it can
replace `background_far_solar.png`.
