"""Build the three-piece Helios Tyrant production source for Unreal."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOTS = {
    "Helios_Core": (0.0, 0.0, 0.0),
    "Helios_LeftLance": (-34.0, 0.0, 0.0),
    "Helios_RightLance": (34.0, 0.0, 0.0),
}
MATERIAL_NAMES = (
    "Helios_Armor",
    "Helios_Gold",
    "Helios_Steel",
    "Helios_Heat",
    "Helios_CoreEnergy",
    "Helios_Danger",
)


def parse_args() -> argparse.Namespace:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--preview")
    parser.add_argument("--contract")
    return parser.parse_args(args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def material(name, color, metallic, roughness, emission=None, strength=0.0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        emission_input.default_value = emission
        shader.inputs["Emission Strength"].default_value = strength
    return result


def finish(obj, root, collection, mat, bevel=0.12):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Helios edge treatment", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return obj


def box(name, location, dimensions, root, collection, mat, rotation=(0, 0, 0), bevel=0.16):
    bpy.ops.mesh.primitive_cube_add(
        location=(location[0], -location[1], location[2]),
        rotation=(rotation[0], rotation[1], -rotation[2]),
    )
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    return finish(obj, root, collection, mat, bevel)


def cylinder(name, location, radius, depth, root, collection, mat, vertices=20, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=(location[0], -location[1], location[2]),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat, 0.1)


def ring(name, location, major_radius, minor_radius, root, collection, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=24,
        minor_segments=8,
        location=(location[0], -location[1], location[2]),
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat, 0.04)


def create_root(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 1.5
    root.location = ROOTS[name]
    root["astra_piece"] = name.removeprefix("Helios_")
    root["astra_pivot"] = "separation_socket" if "Lance" in name else "reactor_center"
    root["astra_assembly_location_cm"] = tuple(value * 100 for value in ROOTS[name])
    collection.objects.link(root)
    return root, collection


def radial_box(name, angle, radius, dimensions, root, collection, mat, y=1.0):
    x = math.sin(angle) * radius
    z = math.cos(angle) * radius
    return box(
        name,
        (x, y, z),
        dimensions,
        root,
        collection,
        mat,
        rotation=(0, angle, 0),
        bevel=0.28,
    )


def build_core(mats):
    root, collection = create_root("Helios_Core")
    cylinder("Reactor armored body", (0, 4, 0), 23, 14, root, collection, mats["armor"], vertices=24)
    cylinder("Reactor gold shell", (0, -4, 0), 19, 4, root, collection, mats["gold"], vertices=24)
    ring("Outer heat ring", (0, -8, 0), 19.5, 1.4, root, collection, mats["heat"])
    ring("Inner containment ring", (0, -10, 0), 12.8, 1.1, root, collection, mats["steel"])
    cylinder("Solar heart", (0, -12, 0), 10.8, 3.0, root, collection, mats["core"], vertices=24)
    cylinder("Danger aperture", (0, -14, 0), 5.2, 2.0, root, collection, mats["danger"], vertices=20)
    for index in range(12):
        angle = math.radians(index * 30)
        radial_box(
            f"Armored corona vane {index + 1}",
            angle,
            29,
            (6.5, 5.0, 20 if index % 2 == 0 else 15),
            root,
            collection,
            mats["gold"] if index % 2 == 0 else mats["steel"],
        )
        radial_box(
            f"Corona heat channel {index + 1}",
            angle,
            31,
            (1.2, 5.6, 12),
            root,
            collection,
            mats["heat"],
            y=-2,
        )
    for side in (-1, 1):
        box(f"Lance socket armor {side}", (side * 27, 0, -8), (12, 15, 14), root, collection, mats["armor"], bevel=0.5)
        ring(f"Lance socket energy {side}", (side * 31, -7, -8), 4.4, 0.8, root, collection, mats["danger"])


def build_lance(side, mats):
    side_name = "Left" if side < 0 else "Right"
    root, collection = create_root(f"Helios_{side_name}Lance")
    inward = -side
    ring("Separation seal", (inward * 4, -7, -8), 4.3, 0.85, root, collection, mats["danger"])
    box("Lance shoulder", (side * 3, 0, -8), (16, 15, 14), root, collection, mats["armor"], bevel=0.55)
    box("Long solar-lance body", (side * 8, -3, -35), (11, 13, 46), root, collection, mats["steel"], bevel=0.48)
    box("Lance gold armor", (side * 8, -10, -34), (8, 2.5, 38), root, collection, mats["gold"], bevel=0.3)
    box("Lance heat spine", (side * 8, -12, -35), (2.1, 1.2, 39), root, collection, mats["heat"], bevel=0.06)
    cylinder("Lance solar capacitor", (side * 8, -12, -16), 3.2, 1.8, root, collection, mats["core"], vertices=16)
    cylinder("Beam muzzle housing", (side * 8, -4, -60), 6.0, 12, root, collection, mats["armor"], vertices=16, rotation=(0, 0, 0))
    cylinder("Beam muzzle", (side * 8, -4, -67), 3.5, 4, root, collection, mats["danger"], vertices=16, rotation=(0, 0, 0))
    for index, z in enumerate((-15, -30, -45)):
        box(
            f"Solar mirror {index + 1}",
            (side * 22, 3, z),
            (22, 2.2, 10),
            root,
            collection,
            mats["gold"],
            rotation=(0, math.radians(side * (14 + index * 4)), 0),
            bevel=0.22,
        )
        box(
            f"Mirror heat rail {index + 1}",
            (side * 22, 1, z),
            (18, 1.1, 1.4),
            root,
            collection,
            mats["heat"],
            rotation=(0, math.radians(side * (14 + index * 4)), 0),
            bevel=0.05,
        )


def object_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    return tuple(min(p[i] for p in points) for i in range(3)), tuple(max(p[i] for p in points) for i in range(3))


def write_contract(path):
    all_meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    bounds_min, bounds_max = object_bounds(all_meshes)
    width_cm = round((bounds_max[0] - bounds_min[0]) * 100, 2)
    if not 10500 <= width_cm <= 14500:
        raise RuntimeError(f"Helios Tyrant width outside goliath contract: {width_cm} cm")
    pieces = {}
    for root_name, assembly_location in ROOTS.items():
        root = bpy.data.objects[root_name]
        meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
        slots = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
        if set(slots) != set(MATERIAL_NAMES):
            raise RuntimeError(f"{root_name} material slots do not match the Helios contract")
        pieces[root_name] = {
            "assemblyLocationCm": [round(value * 100, 2) for value in assembly_location],
            "meshCount": len(meshes),
            "materialSlots": slots,
        }
    contract = {
        "schemaVersion": 1,
        "assembledBoundsCm": {
            "min": [round(value * 100, 2) for value in bounds_min],
            "max": [round(value * 100, 2) for value in bounds_max],
            "width": width_cm,
        },
        "threatDirection": "-Y",
        "destructiblePieces": ["Core", "LeftLance", "RightLance"],
        "pieces": pieces,
    }
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(contract, indent=2))


def configure_preview(path):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.world.color = (0.008, 0.001, 0.0)
    bpy.ops.object.camera_add(location=(0, 340, 95))
    camera = bpy.context.object
    camera.data.lens = 52
    scene.camera = camera
    camera.rotation_euler = ((bpy.data.objects["Helios_Core"].location - camera.location).to_track_quat("-Z", "Y")).to_euler()
    for location, energy, color, size in (
        ((-65, 35, 80), 10000, (1.0, 0.18, 0.015), 44),
        ((65, 10, 35), 7000, (1.0, 0.72, 0.18), 34),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object.data
        light.energy = energy
        light.color = color
        light.shape = "DISK"
        light.size = size
    scene.use_nodes = True
    nodes = scene.node_tree.nodes
    nodes.clear()
    render_layers = nodes.new("CompositorNodeRLayers")
    glare = nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.8
    glare.size = 7
    composite = nodes.new("CompositorNodeComposite")
    scene.node_tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    scene.node_tree.links.new(glare.outputs["Image"], composite.inputs["Image"])
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)


def main():
    args = parse_args()
    clear_scene()
    mats = {
        "armor": material(MATERIAL_NAMES[0], (0.11, 0.018, 0.008, 1), 0.78, 0.25),
        "gold": material(MATERIAL_NAMES[1], (0.72, 0.16, 0.018, 1), 0.68, 0.2),
        "steel": material(MATERIAL_NAMES[2], (0.16, 0.055, 0.018, 1), 0.82, 0.3),
        "heat": material(MATERIAL_NAMES[3], (0.9, 0.12, 0.005, 1), 0.2, 0.1, (1.0, 0.08, 0.002, 1), 8),
        "core": material(MATERIAL_NAMES[4], (1.0, 0.58, 0.08, 1), 0.12, 0.08, (1.0, 0.42, 0.025, 1), 14),
        "danger": material(MATERIAL_NAMES[5], (1.0, 0.04, 0.01, 1), 0.12, 0.08, (1.0, 0.015, 0.002, 1), 16),
    }
    build_core(mats)
    build_lance(-1, mats)
    build_lance(1, mats)
    write_contract(Path(args.contract) if args.contract else None)
    source = Path(args.source)
    source.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    if args.preview:
        configure_preview(Path(args.preview))
    print(f"Saved three-piece Helios Tyrant source to {source}")


if __name__ == "__main__":
    main()
