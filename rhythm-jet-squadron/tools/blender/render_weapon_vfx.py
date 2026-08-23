"""Build and render rarity-tiered projectile VFX for Astra Valkyries."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy


FAMILIES = ("lance", "pulse", "blade", "missile")
TIERS = ("common", "rare", "sr", "ssr")


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--source", required=True)
    return parser.parse_args(blender_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def emission_material(name: str, value: float, strength: float) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    color = (value, value, value, 1.0)
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.18
    bsdf.inputs["Metallic"].default_value = 0.12
    bsdf.inputs["Emission Color"].default_value = color
    bsdf.inputs["Emission Strength"].default_value = strength
    return material


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> bpy.types.Object:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def uv_sphere(
    collection: bpy.types.Collection,
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=location)
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Soft edge", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 2
    return obj


def cone_x(
    collection: bpy.types.Collection,
    name: str,
    location: tuple[float, float, float],
    depth: float,
    radius_back: float,
    radius_front: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=48,
        radius1=radius_back,
        radius2=radius_front,
        depth=depth,
        location=location,
        rotation=(0, math.pi / 2, 0),
    )
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Edge glow", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 2
    return obj


def torus(
    collection: bpy.types.Collection,
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    scale: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=12,
        location=location,
    )
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def prism(
    collection: bpy.types.Collection,
    name: str,
    points: list[tuple[float, float]],
    depth: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    half = depth / 2
    count = len(points)
    vertices = [(x, y, -half) for x, y in points] + [(x, y, half) for x, y in points]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Edge bevel", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 2
    return obj


def add_tier_details(
    collection: bpy.types.Collection,
    tier: str,
    bright: bpy.types.Material,
    mid: bpy.types.Material,
) -> None:
    tier_index = TIERS.index(tier)
    if tier_index >= 1:
        for side in (-1, 1):
            prism(
                collection,
                f"Rare stabilizer {side}",
                [(-1.0, 0.18 * side), (0.55, 0.34 * side), (1.35, 0.12 * side), (-0.7, 0.08 * side)],
                0.1,
                mid,
            )
    if tier_index >= 2:
        torus(collection, "SR containment ring", (-0.45, 0, 0), 0.48, 0.065, (0.42, 1, 1), bright)
        for side in (-1, 1):
            uv_sphere(collection, f"SR satellite {side}", (-0.3, 0.68 * side, 0), (0.18, 0.09, 0.08), bright)
    if tier_index >= 3:
        torus(collection, "SSR forward halo", (0.55, 0, 0), 0.62, 0.055, (0.34, 1, 1), bright)
        for index in range(4):
            angle = math.tau * index / 4
            uv_sphere(
                collection,
                f"SSR orbit node {index + 1}",
                (0.5 + math.cos(angle) * 0.42, math.sin(angle) * 0.62, 0),
                (0.12, 0.08, 0.08),
                bright,
            )


def build_projectile(
    family: str,
    tier: str,
    bright: bpy.types.Material,
    mid: bpy.types.Material,
    dim: bpy.types.Material,
) -> bpy.types.Collection:
    collection = bpy.data.collections.new(f"Projectile {family.title()} {tier.upper()}")
    bpy.context.scene.collection.children.link(collection)

    if family == "lance":
        uv_sphere(collection, "Lance core", (0, 0, 0), (1.65, 0.32, 0.22), bright)
        cone_x(collection, "Lance tip", (1.75, 0, 0), 1.85, 0.48, 0.0, bright)
        cone_x(collection, "Lance wake", (-1.8, 0, 0), 2.1, 0.0, 0.42, dim)
        for side in (-1, 1):
            prism(collection, f"Lance vane {side}", [(-0.8, 0), (0.15, 0.48 * side), (1.05, 0.13 * side)], 0.11, mid)
    elif family == "pulse":
        uv_sphere(collection, "Pulse heart", (0.3, 0, 0), (0.82, 0.58, 0.3), bright)
        torus(collection, "Pulse ring", (0.1, 0, 0), 0.72, 0.09, (1.0, 0.74, 1), mid)
        cone_x(collection, "Pulse wake", (-1.35, 0, 0), 2.2, 0.0, 0.5, dim)
        cone_x(collection, "Pulse point", (1.15, 0, 0), 1.1, 0.42, 0.0, bright)
    elif family == "blade":
        uv_sphere(collection, "Blade core", (0, 0, 0), (1.2, 0.26, 0.2), bright)
        for side in (-1, 1):
            prism(
                collection,
                f"Void blade {side}",
                [(-1.8, 0.12 * side), (-0.25, 0.8 * side), (1.75, 0.26 * side), (0.45, 0.08 * side)],
                0.12,
                mid,
            )
        cone_x(collection, "Blade wake", (-1.65, 0, 0), 2.4, 0.0, 0.34, dim)
    else:
        uv_sphere(collection, "Missile body", (-0.15, 0, 0), (1.45, 0.42, 0.3), mid)
        cone_x(collection, "Missile nose", (1.45, 0, 0), 1.45, 0.46, 0.0, bright)
        cone_x(collection, "Missile exhaust", (-1.65, 0, 0), 2.1, 0.0, 0.38, dim)
        for side in (-1, 1):
            prism(collection, f"Missile fin {side}", [(-1.2, 0.08 * side), (-0.35, 0.7 * side), (0.15, 0.2 * side)], 0.13, mid)

    add_tier_details(collection, tier, bright, mid)
    return collection


def build_trail(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = bpy.data.collections.new("Weapon Trail")
    bpy.context.scene.collection.children.link(collection)
    cone_x(collection, "Long plasma wake", (-1.4, 0, 0), 5.8, 0.0, 0.54, dim)
    cone_x(collection, "Mid plasma wake", (-0.65, 0, 0.02), 3.9, 0.0, 0.31, mid)
    cone_x(collection, "Hot wake core", (0.25, 0, 0.04), 2.1, 0.0, 0.16, bright)
    return collection


def build_muzzle(bright: bpy.types.Material, mid: bpy.types.Material) -> bpy.types.Collection:
    collection = bpy.data.collections.new("Weapon Muzzle")
    bpy.context.scene.collection.children.link(collection)
    torus(collection, "Muzzle ring", (0, 0, 0), 0.72, 0.09, (1, 1, 1), mid)
    uv_sphere(collection, "Muzzle heart", (0, 0, 0), (0.46, 0.46, 0.2), bright)
    for index in range(8):
        angle = math.tau * index / 8
        length = 2.15 if index % 2 == 0 else 1.45
        width = 0.11 if index % 2 == 0 else 0.075
        direction = (math.cos(angle), math.sin(angle))
        perpendicular = (-direction[1], direction[0])
        points = [
            (perpendicular[0] * width, perpendicular[1] * width),
            (direction[0] * length, direction[1] * length),
            (-perpendicular[0] * width, -perpendicular[1] * width),
        ]
        prism(collection, f"Muzzle ray {index + 1}", points, 0.08, bright if index % 2 == 0 else mid)
    return collection


def build_impact(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = bpy.data.collections.new("Weapon Impact")
    bpy.context.scene.collection.children.link(collection)
    torus(collection, "Impact outer ring", (0, 0, 0), 1.34, 0.09, (1, 1, 1), dim)
    torus(collection, "Impact inner ring", (0, 0, 0), 0.68, 0.12, (1, 1, 1), bright)
    uv_sphere(collection, "Impact heart", (0, 0, 0), (0.34, 0.34, 0.18), bright)
    for index in range(12):
        angle = math.tau * index / 12 + (0.08 if index % 2 else 0)
        inner = 0.72
        outer = 2.35 if index % 3 == 0 else 1.72
        width = 0.09
        direction = (math.cos(angle), math.sin(angle))
        perpendicular = (-direction[1], direction[0])
        points = [
            (direction[0] * inner + perpendicular[0] * width, direction[1] * inner + perpendicular[1] * width),
            (direction[0] * outer, direction[1] * outer),
            (direction[0] * inner - perpendicular[0] * width, direction[1] * inner - perpendicular[1] * width),
        ]
        prism(collection, f"Impact shard {index + 1}", points, 0.08, mid if index % 2 else bright)
    return collection


def configure_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.compression = 15
    bpy.ops.object.camera_add(location=(0, 0, 12))
    camera = bpy.context.object
    camera.name = "VFX Orthographic Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 8
    camera.rotation_euler = (0, 0, 0)
    scene.camera = camera

    scene.use_nodes = True
    nodes = scene.node_tree.nodes
    nodes.clear()
    render_layers = nodes.new("CompositorNodeRLayers")
    glare = nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.2
    glare.size = 6
    composite = nodes.new("CompositorNodeComposite")
    scene.node_tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    scene.node_tree.links.new(glare.outputs["Image"], composite.inputs["Image"])
    return camera


def render_collection(
    collection: bpy.types.Collection,
    output: Path,
    camera: bpy.types.Object,
    resolution: tuple[int, int],
    ortho_scale: float,
) -> None:
    for item in bpy.data.collections:
        if item.name != "Collection":
            item.hide_render = item != collection
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = resolution
    camera.data.ortho_scale = ortho_scale
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    source_path = Path(args.source)
    source_path.parent.mkdir(parents=True, exist_ok=True)
    clear_scene()
    camera = configure_scene()
    bright = emission_material("Hot white core", 1.0, 8.0)
    mid = emission_material("Charged shell", 0.62, 4.2)
    dim = emission_material("Plasma wake", 0.24, 2.0)

    projectile_collections: dict[tuple[str, str], bpy.types.Collection] = {}
    for family in FAMILIES:
        for tier in TIERS:
            projectile_collections[(family, tier)] = build_projectile(family, tier, bright, mid, dim)
    trail = build_trail(bright, mid, dim)
    muzzle = build_muzzle(bright, mid)
    impact = build_impact(bright, mid, dim)

    bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
    for (family, tier), collection in projectile_collections.items():
        render_collection(collection, output_dir / f"weapon_{family}_{tier}.png", camera, (256, 96), 8.4)
    render_collection(trail, output_dir / "weapon_trail.png", camera, (256, 64), 8.8)
    render_collection(muzzle, output_dir / "weapon_muzzle.png", camera, (256, 256), 6.2)
    render_collection(impact, output_dir / "weapon_impact.png", camera, (256, 256), 6.4)
    print(f"Rendered {len(projectile_collections) + 3} weapon VFX assets to {output_dir}")


if __name__ == "__main__":
    main()
