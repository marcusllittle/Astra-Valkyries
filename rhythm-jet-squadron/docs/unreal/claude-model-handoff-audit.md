# Claude Procedural Model Handoff Audit

## Scope

The `Game model creation setup.zip` handoff was inspected, rendered in its
Three.js viewers, exported to GLB, converted through Blender 4.5.10 LTS, and
imported into the open AstraValkRenderLab Unreal project through MCP.

No existing Astra mesh, Blueprint, map, sequence, render manifest decision, or
shipping React asset was replaced. All Unreal assets are isolated under:

`/Game/AstraRenderLab/Art/Candidates/ClaudeModels`

## Delivered sources

- Three player ships: Astra Interceptor, Valkyrie Lancer, Seraph Guard.
- Three bosses: Aegis Dreadnought, Cryo Leviathan, Helios Tyrant.
- Tank Fortress and ten reusable enemy craft.
- Power Chip and Pulse Ring pickups.
- Browser source with named Three.js meshes and GLB/OBJ export controls.
- Hash-pinned GLB handoffs and a generated Blender source library.

The deterministic `claude-models` export profile produces 25 FBXs. Mirrored
Three.js geometry is made single-user during Blender ingestion so distinct
material slots survive FBX export.

## Unreal verification

MCP read-back found 85 saved candidate assets: 25 Static Meshes and 60 source
comparison materials. No textures were imported.

| Group | Meshes | LOD0 triangle range | Verification |
| --- | ---: | ---: | --- |
| Player ships | 3 | 6,912-9,474 | Distinct silhouettes, seven or fewer material slots, valid bounds |
| Boss pieces | 9 | 192-7,288 | Core plus independently pivoted left/right arm assemblies for each boss |
| Enemies | 11 | 176-4,252 | Individual centered origins and valid bounds |
| Pickups | 2 | 1,952-3,840 | Individual centered origins and intact material slots |

Boss separation pivots were verified after Unreal import:

| Boss | Left pivot | Right pivot | Result |
| --- | ---: | ---: | --- |
| Aegis | -200.23 cm | 200.23 cm | Arm geometry terminates at local X=0 on each attachment side |
| Cryo | -256.92 cm | 256.92 cm | Long segmented arms are independent and symmetric |
| Helios | -526.37 cm | 526.36 cm | Four radial arms per side are independently detachable as two clusters |

The Helios assembly is intentionally the largest silhouette, with an assembled
radial span of roughly 115 m. That supports the one-ship-versus-goliath mobile
composition, but camera distance must keep the player ship and boss weak points
visible together.

## Production decision

These assets are accepted as production candidates, not approved replacements.
They solve source coverage and part separation, and the three ship thumbnails
are materially stronger than the former anonymous placeholder plane. They are
still medium-detail procedural models with flat PBR colors, no authored texture
maps, no rig, and no animation.

Next use:

1. Build comparison assemblies with Astra master materials, Neon Parallax
   Hangar/Spaceport lighting, and existing Niagara systems.
2. Render all three ships at the exact Hangar card and inspection framing.
3. Render each boss assembled, then key an arm-break proof using the independent
   pieces.
4. Approve per destination. Do not replace runtime art solely because a model
   exists in Unreal.
