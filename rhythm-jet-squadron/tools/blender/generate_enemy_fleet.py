"""Build Astra's reusable eleven-enemy production fleet for Unreal."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ENEMIES = (
    "Drifter",
    "Sine",
    "Zigzag",
    "Orbiter",
    "Charger",
    "Splitter",
    "Bomber",
    "Sniper",
    "Swarm",
    "Dreadnought",
    "Tank",
)
MATERIAL_NAMES = (
    "Enemy_Armor",
    "Enemy_Trim",
    "Enemy_Steel",
    "Enemy_Energy",
    "Enemy_Danger",
)


def parse_args():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--preview")
    parser.add_argument("--contract")
    return parser.parse_args(args)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def material(name, color, metallic, roughness, emission=None, strength=0):
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


def finish(obj, root, collection, mat, bevel=0.08):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Enemy edge treatment", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return obj


def box(name, loc, dims, root, collection, mat, rotation=(0, 0, 0), bevel=0.12):
    bpy.ops.mesh.primitive_cube_add(
        location=(loc[0], -loc[1], loc[2]),
        rotation=(rotation[0], rotation[1], -rotation[2]),
    )
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    return finish(obj, root, collection, mat, bevel)


def pod(name, loc, scale, root, collection, mat, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1,
        location=(loc[0], -loc[1], loc[2]),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, root, collection, mat)


def cone(name, loc, radius, depth, root, collection, mat, rotation=(math.pi / 2, 0, 0), vertices=6):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=0.12,
        depth=depth,
        location=(loc[0], -loc[1], loc[2]),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat)


def ring(name, loc, major, minor, root, collection, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=20,
        minor_segments=6,
        location=(loc[0], -loc[1], loc[2]),
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat, 0.04)


def root_for(name):
    collection = bpy.data.collections.new(f"Enemy_{name}")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(f"Enemy_{name}", None)
    root["astra_enemy"] = name.lower()
    root["astra_role"] = (
        "heavy" if name in {"Dreadnought", "Tank"} else
        "specialist" if name in {"Orbiter", "Splitter", "Bomber", "Sniper"} else
        "light"
    )
    root["astra_threat_direction"] = "-Y"
    collection.objects.link(root)
    return root, collection


def common_core(name, scale, mats):
    root, collection = root_for(name)
    pod(f"{name} hull", (0, 0, 0), scale, root, collection, mats["armor"], 2)
    ring(f"{name} reactor ring", (0, -scale[1] - 0.5, 0), min(scale[0], scale[2]) * 0.38, 0.3, root, collection, mats["trim"])
    pod(f"{name} reactor", (0, -scale[1] - 0.9, 0), (1.1, 0.55, 1.1), root, collection, mats["energy"])
    box(f"{name} steel spine", (0, 0.5, 0), (1.1, scale[1] * 1.6, scale[2] * 1.2), root, collection, mats["steel"])
    box(f"{name} danger sensor", (0, -scale[1] - 1.2, scale[2] * 0.55), (0.7, 0.5, 0.7), root, collection, mats["danger"], bevel=0.05)
    return root, collection


def build_light(name, mats):
    if name == "Swarm":
        root, col = common_core(name, (3.2, 3.4, 2.4), mats)
        for side in (-1, 1):
            box(f"{name} fin {side}", (side * 3.1, 0.5, -0.3), (3.8, 1.1, 1.3), root, col, mats["steel"], rotation=(0, math.radians(side * 18), 0))
        return
    if name in {"Drifter", "Sine"}:
        root, col = common_core(name, (5.8, 4.2, 5.3), mats)
        for side in (-1, 1):
            box(f"{name} rail {side}", (side * 6.2, 1, 1), (1.2, 4.8, 8), root, col, mats["steel"], rotation=(0, 0, math.radians(side * (12 if name == "Drifter" else 24))))
            box(f"{name} trim {side}", (side * 6.7, -1.5, 1), (0.5, 1, 5.5), root, col, mats["trim"])
        return
    if name == "Charger":
        root, col = common_core(name, (4.2, 7.0, 4.2), mats)
        cone("Charger spear", (0, -8.5, 0), 2.2, 10, root, col, mats["steel"])
        for side in (-1, 1):
            box(f"Charger wing {side}", (side * 5, 1, 0), (5.5, 8, 1.3), root, col, mats["armor"], rotation=(0, 0, math.radians(side * 10)))
        return
    root, col = common_core(name, (4.6, 6.0, 4.0), mats)
    wing_angle = 32 if name == "Zigzag" else 18
    for side in (-1, 1):
        box(f"{name} swept wing {side}", (side * 5.8, 1.5, 0), (7.5, 2, 2.8), root, col, mats["armor"], rotation=(0, math.radians(side * wing_angle), 0))
        cone(f"{name} engine {side}", (side * 3, 5, -1.8), 1.1, 4.5, root, col, mats["energy"], rotation=(math.pi / 2, 0, 0))


def build_specialist(name, mats):
    if name == "Orbiter":
        root, col = common_core(name, (4.5, 3.5, 4.5), mats)
        ring("Orbiter outer ring", (0, 0, 0), 7.5, 0.65, root, col, mats["steel"])
        for index in range(6):
            a = math.radians(index * 60)
            box(f"Orbiter node {index}", (math.sin(a) * 8, 0, math.cos(a) * 8), (1.7, 1.8, 1.7), root, col, mats["trim"], rotation=(0, a, 0))
        return
    if name == "Splitter":
        root, col = common_core(name, (6.5, 4.5, 4.2), mats)
        for side in (-1, 1):
            pod(f"Splitter half {side}", (side * 5.2, 0, 0), (5, 4, 3.8), root, col, mats["armor"], 1)
            cone(f"Splitter fang {side}", (side * 5.2, -5, -2), 1.2, 5, root, col, mats["danger"])
        return
    if name == "Bomber":
        root, col = common_core(name, (6.2, 7.5, 5.2), mats)
        for side in (-1, 1):
            pod(f"Bomber payload {side}", (side * 6.8, 1.5, 0), (3.4, 5.2, 3.4), root, col, mats["steel"], 2)
            cone(f"Bomber exhaust {side}", (side * 6.8, 7, -1), 1.4, 4, root, col, mats["energy"], rotation=(math.pi / 2, 0, 0))
        return
    root, col = common_core(name, (3.2, 8.5, 3.2), mats)
    cone("Sniper needle", (0, -11, 0), 1.8, 14, root, col, mats["steel"])
    for side in (-1, 1):
        box(f"Sniper brace {side}", (side * 4, 1.5, -1), (5.5, 1.2, 3), root, col, mats["armor"], rotation=(0, math.radians(side * 20), 0))
        box(f"Sniper charge rail {side}", (side * 2.1, -4, 0), (0.7, 8, 0.7), root, col, mats["danger"])


def build_heavy(name, mats):
    if name == "Tank":
        root, col = common_core(name, (12, 7, 11), mats)
        for index in range(8):
            a = math.radians(index * 45)
            box(f"Tank armor plate {index}", (math.sin(a) * 11, 0, math.cos(a) * 10), (5.5, 7, 4.5), root, col, mats["steel"], rotation=(0, a, 0), bevel=0.35)
        for side in (-1, 1):
            box(f"Tank cannon {side}", (side * 4, -10, -7), (2.2, 13, 2.2), root, col, mats["danger"])
        return
    root, col = common_core(name, (9, 13, 9), mats)
    for side in (-1, 1):
        box(f"Dreadnought carrier wing {side}", (side * 12, 1, 0), (13, 16, 8), root, col, mats["armor"], bevel=0.45)
        box(f"Dreadnought battery {side}", (side * 12, -8, 1), (8, 5, 4), root, col, mats["steel"], bevel=0.25)
        cone(f"Dreadnought engine {side}", (side * 8, 13, -3), 2.2, 7, root, col, mats["energy"], rotation=(math.pi / 2, 0, 0))


def bounds(root):
    objects = [obj for obj in root.children_recursive if obj.type == "MESH"]
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return [round((max(p[i] for p in points) - min(p[i] for p in points)) * 100, 2) for i in range(3)]


def write_contract(path):
    records = {}
    for name in ENEMIES:
        root = bpy.data.objects[f"Enemy_{name}"]
        meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
        slots = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
        if set(slots) != set(MATERIAL_NAMES):
            raise RuntimeError(f"Enemy_{name} material slots do not match the fleet contract")
        size = bounds(root)
        limit = 4200 if name in {"Dreadnought", "Tank"} else 2800 if root["astra_role"] == "specialist" else 2400
        if max(size) > limit:
            raise RuntimeError(f"Enemy_{name} exceeds its gameplay-scale contract: {size}")
        records[name] = {
            "role": root["astra_role"],
            "meshCount": len(meshes),
            "boundsCm": size,
            "materialSlots": slots,
        }
    contract = {"schemaVersion": 1, "threatDirection": "-Y", "enemies": records}
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(contract, indent=2))


def configure_preview(path):
    positions = {
        "Drifter": (-32, 0, 21), "Sine": (-16, 0, 21), "Zigzag": (0, 0, 21),
        "Orbiter": (16, 0, 21), "Charger": (32, 0, 21),
        "Splitter": (-30, 0, 2), "Bomber": (-10, 0, 2), "Sniper": (10, 0, 2),
        "Swarm": (30, 0, 2), "Dreadnought": (-15, 0, -22), "Tank": (15, 0, -22),
    }
    for name, location in positions.items():
        bpy.data.objects[f"Enemy_{name}"].location = location
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.world.color = (0.012, 0.016, 0.03)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.7
    bpy.ops.object.camera_add(location=(72, 155, 62))
    camera = bpy.context.object
    camera.data.lens = 54
    scene.camera = camera
    camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    for location, energy, color, size in (
        ((-35, 55, 80), 12500, (0.72, 0.82, 1.0), 45),
        ((55, 25, 45), 9000, (0.4, 0.7, 1.0), 36),
        ((0, -30, 35), 7500, (0.9, 0.25, 1.0), 30),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object.data
        light.energy = energy
        light.color = color
        light.size = size
    scene.use_nodes = True
    nodes = scene.node_tree.nodes
    nodes.clear()
    layers = nodes.new("CompositorNodeRLayers")
    glare = nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.9
    composite = nodes.new("CompositorNodeComposite")
    scene.node_tree.links.new(layers.outputs["Image"], glare.inputs["Image"])
    scene.node_tree.links.new(glare.outputs["Image"], composite.inputs["Image"])
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)


def main():
    args = parse_args()
    clear_scene()
    mats = {
        "armor": material(MATERIAL_NAMES[0], (0.055, 0.025, 0.14, 1), 0.72, 0.26),
        "trim": material(MATERIAL_NAMES[1], (0.38, 0.08, 0.62, 1), 0.52, 0.2),
        "steel": material(MATERIAL_NAMES[2], (0.06, 0.09, 0.18, 1), 0.82, 0.3),
        "energy": material(MATERIAL_NAMES[3], (0.12, 0.55, 1, 1), 0.1, 0.08, (0.05, 0.55, 1, 1), 10),
        "danger": material(MATERIAL_NAMES[4], (0.9, 0.04, 0.26, 1), 0.1, 0.08, (1, 0.03, 0.18, 1), 12),
    }
    for name in ENEMIES:
        if name in {"Dreadnought", "Tank"}:
            build_heavy(name, mats)
        elif name in {"Orbiter", "Splitter", "Bomber", "Sniper"}:
            build_specialist(name, mats)
        else:
            build_light(name, mats)
    write_contract(Path(args.contract) if args.contract else None)
    source = Path(args.source)
    source.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    if args.preview:
        configure_preview(Path(args.preview))
    print(f"Saved {len(ENEMIES)}-enemy fleet source to {source}")


if __name__ == "__main__":
    main()
