# Shmup assets in use

Path:
- `rhythm-jet-squadron/public/assets/shmup/`

The current shmup vertical slice now reuses the existing project art here first.

## Currently used by the slice
- `background_far.svg`
- `background_near.svg`
- `player_ship.svg` (legacy fallback style reference)
- `enemy_drifter.svg`
- `enemy_sine.svg`
- `boss_dreadnought.svg`
- `bullet_player.svg`
- `bullet_enemy.svg`
- `bullet_boss.svg`
- `impact_burst.svg`
- `power_chip.svg`
- `pulse_ring.svg`
- `ships/astra_interceptor_sprite.svg`

## Existing additional ship sprites
- `ships/valkyrie_lancer_sprite.svg`
- `ships/seraph_guard_sprite.svg`

## If you want dedicated new replacements later
These are the thematic names the last pass originally proposed, but they are not required for the current build:
- `player_ship_astra.png`
- `enemy_scout_null.png`
- `enemy_striker_null.png`
- `boss_null_seraph.png`
- `background_deep_space.png`
- `background_nebula_layer.png`
- `background_orbital_silhouette.png`
- `bullet_player_energy.png`
- `bullet_enemy_null.png`
- `pickup_power_core.png`

The game should continue to work without those newer names because it now points at the repo's existing shmup assets first.
