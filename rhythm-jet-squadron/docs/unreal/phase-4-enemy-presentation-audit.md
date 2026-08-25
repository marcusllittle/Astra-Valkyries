# Phase 4 Enemy Presentation Audit

Verified through Unreal MCP on 2026-08-25 against
`D:/UnrealProjects/AstraValkRenderLab`.

This slice establishes reusable enemy geometry, materials, Blueprints,
combat VFX, and presentation sequences. It does not replace the React runtime
sprites.

## Blender contract

The `enemy-fleet` profile exports all eleven shipping enemy identities with a
stable five-slot material contract: `Enemy_Armor`, `Enemy_Trim`,
`Enemy_Steel`, `Enemy_Energy`, and `Enemy_Danger`.

| Role | Enemies | Maximum dimension |
| --- | --- | ---: |
| Light | Drifter, Sine, Zigzag, Charger, Swarm | `2,400 cm` |
| Specialist | Orbiter, Splitter, Bomber, Sniper | `2,800 cm` |
| Heavy | Dreadnought, Tank | `4,200 cm` |

The validated exports range from the `1,021.57 cm` Swarm to the
`3,700 cm` Dreadnought. Every root contains all five slots and the threat
direction is consistently `-Y`.

```powershell
powershell -ExecutionPolicy Bypass -File tools/unreal/export_blender_assets.ps1 -Profiles enemy-fleet
```

## Unreal assets

- Eleven `BP_Enemy_*` actors use independent imported static meshes and
  compile with warnings treated as errors.
- Five enemy-owned material instances are assigned directly to every static
  mesh slot; Blueprint components do not carry material overrides.
- `NS_Enemy_Hit`, `NS_Enemy_ShieldBreak`, `NS_Enemy_DeathBurst`, and
  `NS_Enemy_Telegraph` have reusable Actor wrappers under
  `/Game/AstraRenderLab/FX/Niagara/Combat`.
- MCP reports all four Niagara systems `UpToDate`, with no errors, warnings,
  stale scripts, or active compilation.

The resumable build command is:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_enemy_fleet.py"
```

## Sequencer verification

| Sequence | Representative | Scale | Rate and range | Bindings |
| --- | --- | ---: | --- | ---: |
| `LS_EnemyPresentation_Light` | Drifter | `2.4` | 24 fps, 0-144 | 7 |
| `LS_EnemyPresentation_Specialist` | Bomber | `2.2` | 24 fps, 0-144 | 7 |
| `LS_EnemyPresentation_Heavy` | Dreadnought | `1.45` | 24 fps, 0-144 | 7 |

Each sequence retains only the enemy, camera, post process, lighting, Nebula
sky, and combat stage. The inherited Aegis left arm, right arm, engine
exhaust, and telegraph bindings were removed through Sequencer MCP.

## Visual gate

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase4_enemies.py"
```

The final nine-frame 1920x1080 proof keeps all three scale classes readable
and centered with sufficient mobile gameplay space. The procedural models
still read as production foundations rather than premium replacements,
especially the heavy class. The existing eleven React sprites remain
authoritative until a higher-detail Unreal pass beats them at gameplay scale.
