# Phase 4 Cryo Leviathan Production Audit

Verified through Unreal MCP on 2026-08-25 against
`D:/UnrealProjects/AstraValkRenderLab`.

This slice establishes the Cryo Leviathan's three-piece production and
cinematic contracts. It does not approve a React replacement.

## Blender contract

The `cryo-boss` profile generates `astra_cryo_leviathan.blend` and exports:

| Piece | Blender mesh count | Assembly X |
| --- | ---: | ---: |
| `SM_Cryo_Core` | 22 | `0 cm` |
| `SM_Cryo_LeftArm` | 19 | `-3200 cm` |
| `SM_Cryo_RightArm` | 19 | `3200 cm` |

The validated assembled width is `13,617.81 cm`. Each FBX has a normalized
local pivot and the stable material slots `Cryo_ArmorDark`, `Cryo_Ice`,
`Cryo_Steel`, `Cryo_Rime`, `Cryo_Energy`, and `Cryo_Danger`.

Run the deterministic export from the Astra app repository:

```powershell
powershell -ExecutionPolicy Bypass -File tools/unreal/export_blender_assets.ps1 -Profiles cryo-boss
```

## Unreal production assets

- `BP_CryoLeviathan_Core`, `BP_CryoLeviathan_LeftArm`, and
  `BP_CryoLeviathan_RightArm` compile with warnings treated as errors.
- Six boss-owned material instances are assigned directly to every imported
  static-mesh slot. MCP read-back caught and corrected a failed WorldGrid
  assignment before the final render.
- `NS_CryoLeviathan_CoreAura`, `NS_CryoLeviathan_ArmBreak`, and
  `NS_CryoLeviathan_GravityLance` report `UpToDate` with no compile errors,
  warnings, or stale emitters.
- The Niagara systems have reusable Actor Blueprint wrappers for Sequencer.

The Unreal build is resumable:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_cryo_leviathan.py"
```

## Sequencer contract

| Sequence | Rate and range | Choreography |
| --- | --- | --- |
| `LS_BossIntro_CryoLeviathan` | 24 fps, 0-144 | Arms widen from `-3200/+3200` to `-3800/+3800`, then lock back onto the core |
| `LS_CryoLeviathan_ArmBreak` | 24 fps, 0-120 | Arms remain attached through frame 64, then separate to `-8200/+8200` by frame 119 |

MCP class read-back confirms independent core, left-arm, right-arm, aura,
gravity-lance, and per-arm break bindings. Camera keys pull from
`Y=-65000` toward `Y=-58000` while preserving a large lower playfield.

## Visual gate

The proof script queues six 1920x1080 MRQ frames:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase4_cryo.py"
```

The final proof confirms that the full attached boss remains readable in the
centered mobile composition and that both arms visibly detach from the core.
It also shows why this is not a shipping replacement yet: the boss materials
and geometry still read as a production prototype, the environment lacks
finished cinematic depth, and no player ship is present to sell the intended
one-ship-versus-goliath scale.

The current `boss_cryo_leviathan.png` remains authoritative. No Unreal output
from this slice is integrated into the React runtime.
