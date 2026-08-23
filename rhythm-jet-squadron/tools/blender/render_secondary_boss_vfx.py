"""Build and render secondary-ability and boss-telegraph VFX for Astra Valkyries."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy


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


def emission_material(name: str, value: float, strength: float) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    color = (value, value, value, 1.0)
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 0.2
    bsdf.inputs["Emission Color"].default_value = color
    bsdf.inputs["Emission Strength"].default_value = strength
    return material


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> bpy.types.Object:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def torus(collection: bpy.types.Collection, name: str, radius: float, thickness: float, material: bpy.types.Material) -> None:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius,
        minor_radius=thickness,
        major_segments=64,
        minor_segments=12,
    )
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.data.materials.append(material)


def sphere(collection: bpy.types.Collection, name: str, x: float, y: float, scale: tuple[float, float, float], material: bpy.types.Material) -> None:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, location=(x, y, 0))
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)


def bar(collection: bpy.types.Collection, name: str, x: float, y: float, length: float, width: float, angle: float, material: bpy.types.Material) -> None:
    bpy.ops.mesh.primitive_cube_add(location=(x, y, 0), scale=(length / 2, width / 2, 0.045), rotation=(0, 0, angle))
    obj = move_to_collection(bpy.context.object, collection)
    obj.name = name
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Soft luminous edge", "BEVEL")
    bevel.width = min(width * 0.24, 0.06)
    bevel.segments = 2


def radial_bars(collection: bpy.types.Collection, count: int, inner: float, outer: float, width: float, material: bpy.types.Material, offset: float = 0) -> None:
    for index in range(count):
        angle = math.tau * index / count + offset
        radius = (inner + outer) / 2
        bar(collection, f"Ray {index + 1}", math.cos(angle) * radius, math.sin(angle) * radius, outer - inner, width, angle, material)


def new_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def build_secondary_burst(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Secondary Burst")
    sphere(collection, "Hot core", 0, 0, (0.42, 0.42, 0.14), bright)
    torus(collection, "Shock ring", 0.82, 0.075, mid)
    torus(collection, "Outer wave", 1.56, 0.045, dim)
    radial_bars(collection, 16, 0.72, 2.55, 0.095, bright)
    radial_bars(collection, 16, 1.0, 1.82, 0.05, mid, math.pi / 16)
    return collection


def build_secondary_shield(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Secondary Shield")
    for radius, width, material in ((1.65, 0.105, bright), (1.28, 0.055, dim)):
        points = [(math.cos(math.tau * i / 6 + math.pi / 6) * radius, math.sin(math.tau * i / 6 + math.pi / 6) * radius) for i in range(6)]
        for index, start in enumerate(points):
            end = points[(index + 1) % len(points)]
            dx, dy = end[0] - start[0], end[1] - start[1]
            bar(collection, f"Hex rail {radius} {index}", (start[0] + end[0]) / 2, (start[1] + end[1]) / 2, math.hypot(dx, dy), width, math.atan2(dy, dx), material)
    radial_bars(collection, 6, 0.35, 1.18, 0.06, mid, math.pi / 6)
    for index in range(6):
        angle = math.tau * index / 6 + math.pi / 6
        sphere(collection, f"Shield node {index + 1}", math.cos(angle) * 1.65, math.sin(angle) * 1.65, (0.13, 0.13, 0.07), bright)
    return collection


def build_secondary_sigil(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Secondary Sigil")
    torus(collection, "Outer circuit", 1.72, 0.055, mid)
    torus(collection, "Inner circuit", 0.92, 0.075, bright)
    torus(collection, "Core circuit", 0.36, 0.045, dim)
    radial_bars(collection, 8, 0.42, 1.58, 0.045, mid, math.pi / 8)
    for index in range(8):
        angle = math.tau * index / 8
        sphere(collection, f"Circuit node {index + 1}", math.cos(angle) * 1.72, math.sin(angle) * 1.72, (0.11, 0.11, 0.06), bright)
    return collection


def build_secondary_target(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Secondary Target")
    torus(collection, "Target ring", 1.18, 0.07, mid)
    torus(collection, "Target core", 0.35, 0.045, bright)
    radial_bars(collection, 4, 1.0, 2.15, 0.1, bright, math.pi / 4)
    radial_bars(collection, 4, 0.42, 0.92, 0.05, dim)
    return collection


def build_boss_warning(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Boss Warning Ring")
    torus(collection, "Danger core", 0.58, 0.07, bright)
    torus(collection, "Danger perimeter", 1.72, 0.05, dim)
    radial_bars(collection, 12, 1.05, 1.72, 0.13, mid, math.pi / 12)
    for index in range(3):
        angle = -math.pi / 2 + index * math.tau / 3
        bar(collection, f"Danger mark {index + 1}", math.cos(angle) * 2.0, math.sin(angle) * 2.0, 0.62, 0.2, angle, bright)
    return collection


def build_boss_lane(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Boss Laser Lane")
    bar(collection, "Lane haze", 0, 0, 14.5, 0.72, 0, dim)
    bar(collection, "Upper rail", 0, 0.48, 14.5, 0.07, 0, mid)
    bar(collection, "Lower rail", 0, -0.48, 14.5, 0.07, 0, mid)
    bar(collection, "Core guide", 0, 0, 14.5, 0.055, 0, bright)
    for index in range(-6, 7):
        bar(collection, f"Lane chevron {index}", index * 1.08, 0, 0.92, 0.075, math.pi / 3, mid)
    return collection


def build_boss_target(bright: bpy.types.Material, mid: bpy.types.Material, dim: bpy.types.Material) -> bpy.types.Collection:
    collection = new_collection("Boss Target")
    torus(collection, "Lock ring", 1.25, 0.07, mid)
    torus(collection, "Kill ring", 0.52, 0.055, bright)
    radial_bars(collection, 4, 0.72, 1.82, 0.11, bright, math.pi / 4)
    radial_bars(collection, 8, 1.18, 1.6, 0.045, dim, math.pi / 8)
    return collection


def configure_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.resolution_percentage = 100
    bpy.ops.object.camera_add(location=(0, 0, 12))
    camera = bpy.context.object
    camera.name = "Secondary and Boss VFX Camera"
    camera.data.type = "ORTHO"
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


def render_collection(collection: bpy.types.Collection, output: Path, camera: bpy.types.Object, resolution: tuple[int, int], ortho_scale: float) -> None:
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
    mid = emission_material("Charged structure", 0.62, 4.2)
    dim = emission_material("Energy haze", 0.22, 1.8)
    renders = [
        (build_secondary_burst(bright, mid, dim), "secondary_burst.png", (256, 256), 6.2),
        (build_secondary_shield(bright, mid, dim), "secondary_shield.png", (256, 256), 5.2),
        (build_secondary_sigil(bright, mid, dim), "secondary_sigil.png", (256, 256), 5.2),
        (build_secondary_target(bright, mid, dim), "secondary_target.png", (256, 256), 5.4),
        (build_boss_warning(bright, mid, dim), "boss_warning_ring.png", (256, 256), 5.6),
        (build_boss_lane(bright, mid, dim), "boss_laser_lane.png", (512, 128), 4.2),
        (build_boss_target(bright, mid, dim), "boss_target.png", (256, 256), 5.4),
    ]
    bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
    for collection, filename, resolution, scale in renders:
        render_collection(collection, output_dir / filename, camera, resolution, scale)
    print(f"Rendered {len(renders)} secondary and boss VFX assets to {output_dir}")


if __name__ == "__main__":
    main()
