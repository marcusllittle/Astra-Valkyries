# Phase 4 Helios Tyrant Production Audit

Verified through Unreal MCP on 2026-08-25 against
`D:/UnrealProjects/AstraValkRenderLab`.

This slice completes the named Solar Rift boss production contract. It does
not replace the React runtime sprite.

## Blender contract

The `helios-boss` profile preserves the shipping boss identity as a circular
solar reactor, then adds layered armor, twelve corona vanes, socket housings,
and two long beam pylons with solar mirrors.

| Piece | Blender mesh count | Assembly X |
| --- | ---: | ---: |
| `SM_Helios_Core` | 34 | `0 cm` |
| `SM_Helios_LeftLance` | 14 | `-3400 cm` |
| `SM_Helios_RightLance` | 14 | `3400 cm` |

The assembled width is `13,614.41 cm`. All pieces expose
`Helios_Armor`, `Helios_Gold`, `Helios_Steel`, `Helios_Heat`,
`Helios_CoreEnergy`, and `Helios_Danger` slots.

```powershell
powershell -ExecutionPolicy Bypass -File tools/unreal/export_blender_assets.ps1 -Profiles helios-boss
```

## Unreal assets

- Three independent boss Blueprints compile with warnings treated as errors.
- Six boss-owned material instances are assigned directly to all imported
  static-mesh slots.
- `NS_HeliosTyrant_CoreAura`, `NS_HeliosTyrant_LanceBreak`, and
  `NS_HeliosTyrant_BeamCharge` are Solar-derived systems with reusable Actor
  wrappers. MCP reports all scripts `UpToDate`, with no errors, warnings, or
  stale emitters.
- The first proof used the global StarStream as a core aura. It overwhelmed
  the frame, so the final build deliberately uses the localized
  `NS_Astra_HeliosCore_Prototype`.

The resumable build command is:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_helios_tyrant.py"
```

## Sequencer verification

| Sequence | Rate and range | Choreography |
| --- | --- | --- |
| `LS_BossIntro_HeliosTyrant` | 24 fps, 0-144 | Lances widen from `-3400/+3400` to `-4100/+4100`, then relock |
| `LS_HeliosTyrant_LanceBreak` | 24 fps, 0-120 | Lances remain attached through frame 64, then separate to `-8600/+8600` |

Each sequence has 11 resolved bindings. MCP class read-back confirms one
resolved object for every Helios piece, Solar stage/sky, and Niagara wrapper.

## Visual gate

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase4_helios.py"
```

The final six-frame 1920x1080 proof keeps the full reactor and both attached
lances readable in the centered mobile composition. The detached frame clearly
separates both pylons while preserving the core and lower gameplay space.

This candidate is materially stronger than the current flat Helios sprite, but
approval remains blocked until a player ship establishes the intended
one-ship-versus-goliath scale and the render passes an in-game mobile
comparison. The current `boss_helios_tyrant.png` remains authoritative.
