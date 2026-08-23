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
mesh coordinates because this import path does not honor FBX unit metadata. It
also writes explicit FBX smoothing groups for Unreal's normal import path. The
currently verified MCP surface is recorded in
`docs/unreal/mcp-capabilities.md`.

## Render delivery

Every sequence/render must have an entry in `render-manifest.json` before final
rendering. The entry records the owning screen, Unreal map, sequence, render
preset, HD URL, local fallback, phase, and approval status.

The project-owned MRQ presets live under
`/Game/AstraRenderLab/Cinematics/RenderPresets`:

| Preset | Delivery role |
| --- | --- |
| `MPC_Astra_Cinematic_1080p` | 24 fps 16:9 cinematics and combat plates |
| `MPC_Astra_UILoop_1080p` | 30 fps 16:9 UI loops |
| `MPC_Astra_Still_4K` | 4K still and dossier masters |
| `MPC_Astra_VFXAlpha_1080p` | 60 fps RGBA VFX image sequences |
| `MPC_Astra_Marketing_4K` | 4K horizontal marketing masters |
| `MPC_Astra_Marketing_Vertical_4K` | 4K vertical marketing masters |
| `MPC_Astra_Validation_640x360` | One-frame render-pipeline checks |

From Unreal's Output Log command field, create or refresh the presets with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_presets.py"
```

Run the current one-frame-per-sequence Hub validation with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_validate.py"
```

Run the start/midpoint/end Hub composition sampler with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_hub.py"
```

Run the equivalent proof frames with each sequence's assigned 1080p production
preset with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_hub_1080p.py"
```

After those proofs pass, render the full Home, Spaceport, and Hangar masters
with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_render_hub.py"
```

The Hub UI loops write 300 PNGs at 30 fps under `ui-loop-1080p`; the Hangar
inspection writes 240 PNGs at 24 fps under `cinematic-1080p`. Encode review
MP4s only after confirming the expected frame counts. For example:

```bash
ffmpeg -framerate 30 -start_number 0 \
  -i "Saved/AstraRenders/ui-loop-1080p/LS_HomeOrbitLoop/no shot/%04d.png" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -movflags +faststart Saved/AstraRenders/encoded/LS_HomeOrbitLoop_1080p.mp4
```

Use 30 fps for Home and Spaceport and 24 fps for Hangar. Validate each encode
with `ffprobe -count_frames` before comparison or delivery.

Preset audits and rendered image sequences are generated under
`Saved/AstraRenders` and are intentionally excluded from source control. The
source MRQ assets and scripts are versioned. Output paths use the queue job name
rather than the sequence-name token, which the PIE executor can leave empty.
Alpha output requires the checked in `r.PostProcessing.PropagateAlpha=True`
renderer setting. Video encoding is a separate delivery step after
image-sequence review.

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
