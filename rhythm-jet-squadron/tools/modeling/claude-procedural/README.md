# Claude Procedural Model Handoff

This directory preserves the browser-based Three.js sources delivered in
`Game model creation setup.zip`. The source archive SHA-256 is
`f439df83e45a311c758a86266a6492b8eea1937eef7cb1febad39ebbd6d1b6df`.

The pages build named procedural meshes for three player ships, three bosses,
the Tank Fortress, ten enemy craft, and two pickups. Each page can export GLB
or OBJ/MTL. The checked-in GLB handoffs live in
`tools/blender/imports/claude-models`; Blender remains the source of the FBX
files imported into Unreal.

Run a local viewer from this directory:

```bash
python3 -m http.server 4179
```

Then open `http://127.0.0.1:4179`. The pages load pinned Three.js modules from
unpkg, so the viewer and browser export buttons require network access.

These are candidate production bases, not approved replacements. They have
named mesh parts and PBR colors but no texture maps, UV-authored surface pass,
rig, or animation. Unreal materials, lighting, VFX, animation, and comparison
renders are still required before any Astra runtime destination can change.
