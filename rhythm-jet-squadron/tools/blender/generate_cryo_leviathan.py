"""Build the three-piece Cryo Leviathan production source for Unreal."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOTS = {
    "Cryo_Core": (0.0, 0.0, 0.0),
    "Cryo_LeftArm": (-32.0, 0.0, 0.0),
    "Cryo_RightArm": (32.0, 0.0, 0.0),
}
MATERIAL_NAMES = (
    "Cryo_ArmorDark",
    "Cryo_Ice",
    "Cryo_Steel",
    "Cryo_Rime",
    "Cryo_Energy",
    "Cryo_Danger",
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


def material(
    name: str,
    color: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission: tuple[float, float, float, float] | None = None,
    strength: float = 0.0,
) -> bpy.types.Material:
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


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def finish(
    obj: bpy.types.Object,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    mat: bpy.types.Material,
    bevel: float = 0.12,
) -> bpy.types.Object:
    move_to_collection(obj, collection)
    obj.parent = root
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Cryo edge treatment", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return obj


def box(name, location, dimensions, root, collection, mat, rotation=(0, 0, 0), bevel=0.18):
    bpy.ops.mesh.primitive_cube_add(
        location=(location[0], -location[1], location[2]),
        rotation=(rotation[0], rotation[1], -rotation[2]),
    )
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    return finish(obj, root, collection, mat, bevel)


def crystal(name, location, radius, depth, root, collection, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=6,
        radius1=radius,
        radius2=radius * 0.12,
        depth=depth,
        location=(location[0], -location[1], location[2]),
        rotation=(rotation[0], rotation[1], -rotation[2]),
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat, 0.08)


def pod(name, location, scale, root, collection, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=1.0,
        location=(location[0], -location[1], location[2]),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, root, collection, mat, 0.08)


def ring(name, location, major_radius, minor_radius, root, collection, mat, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=20,
        minor_segments=6,
        location=(location[0], -location[1], location[2]),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, collection, mat, 0.05)


def create_root(name: str) -> tuple[bpy.types.Object, bpy.types.Collection]:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 1.5
    root.location = ROOTS[name]
    root["astra_piece"] = name.removeprefix("Cryo_")
    root["astra_pivot"] = "separation_socket" if "Arm" in name else "core_center"
    root["astra_assembly_location_cm"] = tuple(value * 100 for value in ROOTS[name])
    collection.objects.link(root)
    return root, collection


def build_core(mats: dict[str, bpy.types.Material]) -> None:
    root, collection = create_root("Cryo_Core")
    pod("Leviathan thorax", (0, 3, 7), (14, 11, 13), root, collection, mats["armor"])
    pod("Leviathan crown", (0, -7, 19), (10, 9, 8), root, collection, mats["ice"])
    pod("Leviathan abdomen", (0, 8, -8), (11, 10, 12), root, collection, mats["steel"])
    box("Facial armor", (0, -15, 13), (17, 5, 8), root, collection, mats["ice"], bevel=0.55)
    ring("Core energy ring", (0, -18, 12), 5.8, 0.75, root, collection, mats["energy"])
    pod("Core reactor", (0, -19, 12), (3.8, 2.2, 3.8), root, collection, mats["danger"])
    for side in (-1, 1):
        box(f"Shoulder socket {side}", (side * 19, 1, 7), (12, 13, 11), root, collection, mats["steel"], rotation=(0, 0, math.radians(side * 9)), bevel=0.5)
        ring(f"Shoulder energy seal {side}", (side * 25, 1, 7), 3.8, 0.65, root, collection, mats["danger"], rotation=(0, math.pi / 2, 0))
        crystal(f"Crown horn {side}", (side * 7, -7, 29), 3.2, 13, root, collection, mats["rime"], rotation=(0, math.radians(side * 24), 0))
        crystal(f"Jaw spear {side}", (side * 7, -19, 7), 2.0, 11, root, collection, mats["ice"], rotation=(math.radians(72), 0, 0))
        box(f"Thorax energy channel {side}", (side * 8, -8, 9), (1.0, 13, 1.2), root, collection, mats["energy"], rotation=(0, 0, math.radians(side * 8)), bevel=0.06)
    for index, z in enumerate((-18, -27, -35)):
        pod(f"Tail segment {index + 1}", (0, 12 + index * 2, z), (8 - index, 7 - index * 0.7, 7), root, collection, mats["armor"])
        crystal(f"Tail dorsal crystal {index + 1}", (0, 10 + index * 2, z + 7), 2.5, 9, root, collection, mats["rime"])


def build_arm(side: int, mats: dict[str, bpy.types.Material]) -> None:
    side_name = "Left" if side < 0 else "Right"
    root, collection = create_root(f"Cryo_{side_name}Arm")
    inward = -side
    ring("Separation socket", (inward * 5.5, 1, 7), 4.0, 0.8, root, collection, mats["danger"], rotation=(0, math.pi / 2, 0))
    for index, x in enumerate((inward * 1, side * 7, side * 16, side * 25)):
        y = 1 - index * 3.5
        z = 7 - index * 1.8
        scale = (8.5 - index * 0.8, 8.0 - index * 0.7, 7.5 - index * 0.6)
        pod(f"Weapon limb segment {index + 1}", (x, y, z), scale, root, collection, mats["armor"] if index % 2 == 0 else mats["steel"])
        crystal(f"Weapon dorsal blade {index + 1}", (x, y + 1, z + 8), 2.3, 10 + index, root, collection, mats["rime"], rotation=(0, math.radians(side * 14), 0))
        box(f"Weapon energy vein {index + 1}", (x, y - 5.8, z + 1), (5.5, 1.0, 1.1), root, collection, mats["energy"], bevel=0.06)
    box("Long gravity battery", (side * 27, -17, 2), (14, 31, 8), root, collection, mats["ice"], rotation=(0, 0, math.radians(side * 8)), bevel=0.55)
    ring("Gravity muzzle housing", (side * 29, -33, 2), 4.2, 0.8, root, collection, mats["steel"])
    ring("Gravity muzzle", (side * 29, -34, 2), 2.6, 0.7, root, collection, mats["danger"])
    for index, y in enumerate((-10, -18, -26)):
        crystal(f"Battery fang {index + 1}", (side * 33, y, -4), 1.8, 8, root, collection, mats["ice"], rotation=(0, math.radians(side * 18), 0))


def object_bounds(objects: list[bpy.types.Object]):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    return tuple(min(p[i] for p in points) for i in range(3)), tuple(max(p[i] for p in points) for i in range(3))


def write_contract(path: Path | None) -> None:
    all_meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    bounds_min, bounds_max = object_bounds(all_meshes)
    width_cm = round((bounds_max[0] - bounds_min[0]) * 100, 2)
    if not 11000 <= width_cm <= 14500:
        raise RuntimeError(f"Cryo Leviathan width outside goliath contract: {width_cm} cm")
    pieces = {}
    for root_name, assembly_location in ROOTS.items():
        root = bpy.data.objects[root_name]
        meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
        slots = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
        if set(slots) != set(MATERIAL_NAMES):
            raise RuntimeError(f"{root_name} material slots do not match the Cryo contract")
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
        "destructiblePieces": ["Core", "LeftArm", "RightArm"],
        "pieces": pieces,
    }
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(contract, indent=2))


def configure_preview(path: Path) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.world.color = (0.001, 0.004, 0.012)
    bpy.ops.object.camera_add(location=(0, 160, 105))
    camera = bpy.context.object
    camera.data.lens = 56
    scene.camera = camera
    camera.rotation_euler = ((bpy.data.objects["Cryo_Core"].location - camera.location).to_track_quat("-Z", "Y")).to_euler()
    for location, energy, color, size in (
        ((-55, 40, 75), 9000, (0.12, 0.48, 1.0), 42),
        ((55, -8, 45), 6500, (0.58, 0.12, 1.0), 32),
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


def main() -> None:
    args = parse_args()
    clear_scene()
    mats = {
        "armor": material(MATERIAL_NAMES[0], (0.018, 0.035, 0.09, 1), 0.68, 0.25),
        "ice": material(MATERIAL_NAMES[1], (0.18, 0.58, 0.88, 1), 0.22, 0.16),
        "steel": material(MATERIAL_NAMES[2], (0.045, 0.12, 0.24, 1), 0.72, 0.28),
        "rime": material(MATERIAL_NAMES[3], (0.32, 0.72, 1.0, 1), 0.08, 0.12, (0.1, 0.5, 1.0, 1), 3.5),
        "energy": material(MATERIAL_NAMES[4], (0.02, 0.22, 0.72, 1), 0.25, 0.1, (0.02, 0.65, 1.0, 1), 8.0),
        "danger": material(MATERIAL_NAMES[5], (0.38, 0.03, 0.44, 1), 0.18, 0.12, (0.85, 0.04, 1.0, 1), 10.0),
    }
    build_core(mats)
    build_arm(-1, mats)
    build_arm(1, mats)
    write_contract(Path(args.contract) if args.contract else None)
    source = Path(args.source)
    source.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    if args.preview:
        configure_preview(Path(args.preview))
    print(f"Saved three-piece Cryo Leviathan source to {source}")


if __name__ == "__main__":
    main()
