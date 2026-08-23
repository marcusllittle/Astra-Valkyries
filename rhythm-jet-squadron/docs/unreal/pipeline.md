# Blender to Unreal Production Pipeline

## Source of truth

- Procedural geometry: `tools/blender/*.blend` and their generating Python files.
- Staged interchange files: `tools/unreal/staging/` (generated and ignored).
- Unreal content: `/Game/AstraRenderLab` in `AstraValkRenderLab.uproject`.
- Render delivery contract: `tools/unreal/render-manifest.json`.
- Shipping fallbacks: `public/assets`.
- Approved HD delivery: `https://media.joinhavn.io/astra/`.

## Export

Run from Windows PowerShell in the app directory:

```powershell
powershell -ExecutionPolicy Bypass -File tools/unreal/export_blender_assets.ps1
```

The wrapper opens each existing `.blend` source in Blender 4.5 and invokes
`tools/blender/export_unreal_geometry.py`. It exports selected root objects or
named collections as binary FBX (`.fbx`) and writes an `exports.json` beside
each profile. The metadata records the source SHA-256, Blender version,
coordinate contract, object count, and output byte size.

Profiles:

| Profile | Existing source | Unreal use |
| --- | --- | --- |
| `launch-v2` | `astra_interceptor_launch_v2.blend` | Interceptor, launch deck, orbital world |
| `weapon-vfx` | `astra_weapon_vfx.blend` | Projectile meshes and weapon FX source geometry |
| `secondary-boss-vfx` | `astra_secondary_boss_vfx.blend` | Secondary and boss telegraph source geometry |

Do not hand-edit staged FBX files. Change the procedural Blender source and
export again.

## Unreal import

Import with the Unreal MCP
`editor_toolset.toolsets.static_mesh.StaticMeshTools.import_file` operation. Use
`combine_meshes=true` for each named export and keep generated material import
disabled once Astra master materials exist. Phase 1 imports may retain source
materials solely for geometry comparison.

Destination rules:

| Export | Destination |
| --- | --- |
| Ship geometry | `/Game/AstraRenderLab/Art/Ships/Blender` |
| Launch deck/environment | `/Game/AstraRenderLab/Art/Environments/Blender` |
| Projectile geometry | `/Game/AstraRenderLab/Art/Props/Weapons/Blender` |
| Secondary/boss geometry | `/Game/AstraRenderLab/FX/SourceGeometry/Blender` |

After import, use MCP read-back tools to verify asset class, bounds, vertex and
triangle counts, material slots, and Nanite state. Never save unrelated dirty
assets.

The MCP import operation currently accepts FBX and OBJ through Unreal's
`FbxFactory`; GLB is not accepted by this tool even when Interchange is enabled
in the editor. The exporter bakes Blender's meter-to-centimeter conversion into
mesh coordinates because this import path does not honor FBX unit metadata.
The currently verified MCP surface is recorded in
`docs/unreal/mcp-capabilities.md`.

## Render delivery

Every sequence/render must have an entry in `render-manifest.json` before final
rendering. The entry records the owning screen, Unreal map and sequence, HD URL,
local fallback, phase, and approval status.

Validate the contract with:

```bash
npm run validate:render-manifest
```

Status progression is `planned` -> `in-progress` -> `approved` -> `integrated`.
Use `rejected` when an Unreal candidate does not beat the current asset.

## Quality gate

An Unreal candidate can replace a current asset only when all are true:

1. The subject is more legible and materially more polished at its real UI size.
2. Desktop and mobile crops preserve controls and text hierarchy.
3. Encoding size and decode behavior are acceptable for web and packaged apps.
4. A compact local fallback remains valid.
5. Web tests/build, Electron smoke verification, and mobile sync/build pass.
