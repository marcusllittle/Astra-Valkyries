"""Build the three-piece Aegis Dreadnought production source for Unreal."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOTS = {
    "Aegis_Core": (0.0, 0.0, 0.0),
    "Aegis_LeftArm": (-30.0, 0.0, 0.0),
    "Aegis_RightArm": (30.0, 0.0, 0.0),
}
MATERIAL_NAMES = (
    "Aegis_CarbonArmor",
    "Aegis_CommandCeramic",
    "Aegis_DeckSteel",
    "Aegis_GoldTrim",
    "Aegis_Energy_Cyan",
    "Aegis_Energy_Danger",
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
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        emission_input = shader.inputs.get("Emission Color")
        if emission_input is None:
            emission_input = shader.inputs.get("Emission")
        emission_input.default_value = emission
        shader.inputs["Emission Strength"].default_value = emission_strength
    return result


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def finish_mesh(
    obj: bpy.types.Object,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    mat: bpy.types.Material,
    bevel: float = 0.18,
) -> bpy.types.Object:
    move_to_collection(obj, collection)
    obj.parent = root
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Production edge treatment", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return obj


def box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.2,
) -> bpy.types.Object:
    # The verified Unreal FBX path flips Blender Y while preserving X and Z.
    # Author the longitudinal geometry mirrored so the imported threat axis is -Y.
    export_location = (location[0], -location[1], location[2])
    export_rotation = (rotation[0], rotation[1], -rotation[2])
    bpy.ops.mesh.primitive_cube_add(location=export_location, rotation=export_rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    return finish_mesh(obj, root, collection, mat, bevel)


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (math.pi / 2, 0.0, 0.0),
    vertices: int = 16,
) -> bpy.types.Object:
    export_location = (location[0], -location[1], location[2])
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=export_location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish_mesh(obj, root, collection, mat, 0.12)


def wedge(
    name: str,
    location: tuple[float, float, float],
    width: float,
    length: float,
    height: float,
    root: bpy.types.Object,
    collection: bpy.types.Collection,
    mat: bpy.types.Material,
    point_forward: bool = True,
) -> bpy.types.Object:
    half_w = width / 2
    rear_y = -length / 2
    front_y = length / 2
    front_width = half_w * (0.28 if point_forward else 0.72)
    vertices = [
        (-half_w, rear_y, -height / 2), (half_w, rear_y, -height / 2),
        (-front_width, front_y, -height / 2), (front_width, front_y, -height / 2),
        (-half_w, rear_y, height / 2), (half_w, rear_y, height / 2),
        (-front_width, front_y, height / 2), (front_width, front_y, height / 2),
    ]
    faces = [
        (0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
        (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (location[0], -location[1], location[2])
    collection.objects.link(obj)
    return finish_mesh(obj, root, collection, mat, 0.22)


def create_root(name: str) -> tuple[bpy.types.Object, bpy.types.Collection]:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 1.5
    root.location = ROOTS[name]
    root["astra_piece"] = name.removeprefix("Aegis_")
    root["astra_pivot"] = "separation_socket" if "Arm" in name else "core_center"
    root["astra_assembly_location_cm"] = tuple(value * 100 for value in ROOTS[name])
    collection.objects.link(root)
    return root, collection


def build_core(materials: dict[str, bpy.types.Material]) -> None:
    root, collection = create_root("Aegis_Core")
    box("Core main armor", (0, 2, 0), (54, 44, 8), root, collection, materials["carbon"], bevel=0.8)
    wedge("Core forward keel", (0, -25, -1.5), 28, 20, 8, root, collection, materials["ceramic"])
    box("Citadel", (0, 7, 7.5), (19, 23, 15), root, collection, materials["steel"], bevel=0.6)
    wedge("Command crown", (0, 5, 16), 11, 17, 9, root, collection, materials["ceramic"], point_forward=False)
    box("Port armor plane", (-17, -4, 4.5), (18, 31, 4.2), root, collection, materials["ceramic"], rotation=(0, 0, math.radians(-5)), bevel=0.55)
    box("Starboard armor plane", (17, -4, 4.5), (18, 31, 4.2), root, collection, materials["ceramic"], rotation=(0, 0, math.radians(5)), bevel=0.55)
    box("Port shoulder mass", (-24, 7, 2.5), (12, 22, 8), root, collection, materials["steel"], rotation=(0, 0, math.radians(-7)), bevel=0.6)
    box("Starboard shoulder mass", (24, 7, 2.5), (12, 22, 8), root, collection, materials["steel"], rotation=(0, 0, math.radians(7)), bevel=0.6)
    cylinder("Front reactor housing", (0, -19.8, 1.5), 8.5, 3.2, root, collection, materials["gold"], vertices=20)
    cylinder("Front reactor", (0, -21.7, 1.5), 6.2, 1.2, root, collection, materials["cyan"], vertices=20)
    for side in (-1, 1):
        box(f"Core trim {side}", (side * 10.5, -14, 5.9), (0.7, 17, 0.5), root, collection, materials["gold"], rotation=(0, 0, math.radians(side * 7)), bevel=0.08)
        box(f"Core energy channel {side}", (side * 17, 4, 5.9), (0.55, 18, 0.55), root, collection, materials["cyan"], bevel=0.06)
        cylinder(f"Core engine {side}", (side * 7, 20.8, 1), 2.1, 4.5, root, collection, materials["danger"], vertices=12)


def build_arm(side: int, materials: dict[str, bpy.types.Material]) -> None:
    side_name = "Left" if side < 0 else "Right"
    root, collection = create_root(f"Aegis_{side_name}Arm")
    inward = -side
    box("Separation collar", (inward * 8.0, 2, 0), (15, 15, 9), root, collection, materials["steel"], bevel=0.55)
    cylinder("Exposed socket", (inward * 15.2, 2, 0), 3.5, 1.6, root, collection, materials["danger"], rotation=(0, math.pi / 2, 0), vertices=16)
    box("Shoulder armor", (side * 1.5, 0, 1.5), (23, 25, 11), root, collection, materials["carbon"], rotation=(0, 0, math.radians(side * 4)), bevel=0.7)
    box("Outer shield plane", (side * 3.0, -4, 6.3), (21, 31, 4.2), root, collection, materials["ceramic"], rotation=(0, 0, math.radians(side * 4)), bevel=0.55)
    wedge("Long weapon battery", (side * 3.0, -20, 0), 13, 37, 7.5, root, collection, materials["steel"])
    box("Battery upper armor", (side * 3.0, -18, 4.8), (12, 27, 2.8), root, collection, materials["carbon"], bevel=0.4)
    box("Battery gold rail", (side * 4.2, -20, 5.3), (1.0, 24, 0.55), root, collection, materials["gold"], bevel=0.06)
    box("Battery energy channel", (side * 2.4, -19, 5.35), (0.65, 22, 0.5), root, collection, materials["cyan"], bevel=0.05)
    cylinder("Primary muzzle housing", (side * 4.2, -37.2, 0), 4.2, 3.2, root, collection, materials["gold"], vertices=16)
    cylinder("Primary muzzle", (side * 4.2, -39.0, 0), 2.7, 1.1, root, collection, materials["danger"], vertices=16)
    for index, y in enumerate((-9.5, -17.5, -25.5)):
        cylinder(f"Battery vent {index + 1}", (side * 7.2, y, 1.2), 1.1, 1.0, root, collection, materials["cyan"], rotation=(0, math.pi / 2, 0), vertices=12)


def object_world_bounds(objects: list[bpy.types.Object]) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    return (
        tuple(min(point[index] for point in points) for index in range(3)),
        tuple(max(point[index] for point in points) for index in range(3)),
    )


def validate_and_write_contract(path: Path | None) -> None:
    object_names = {obj.name for obj in bpy.data.objects}
    missing_roots = sorted(set(ROOTS) - object_names)
    if missing_roots:
        raise RuntimeError(f"Missing Aegis roots: {missing_roots}")
    material_names = {mat.name for mat in bpy.data.materials}
    missing_materials = sorted(set(MATERIAL_NAMES) - material_names)
    if missing_materials:
        raise RuntimeError(f"Missing Aegis materials: {missing_materials}")

    all_meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    bounds_min, bounds_max = object_world_bounds(all_meshes)
    width_cm = round((bounds_max[0] - bounds_min[0]) * 100, 2)
    if not 8800 <= width_cm <= 9200:
        raise RuntimeError(f"Aegis assembled width must be near 9000 cm, got {width_cm}")

    piece_data = {}
    local_bounds = {}
    for root_name, assembly_location in ROOTS.items():
        root = bpy.data.objects[root_name]
        meshes = [obj for obj in root.children_recursive if obj.type == "MESH"]
        slots = sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material})
        if not meshes:
            raise RuntimeError(f"{root_name} has no mesh children")
        if set(slots) != set(MATERIAL_NAMES):
            raise RuntimeError(f"{root_name} material slots do not match the Aegis contract")
        if tuple(round(value, 4) for value in root.location) != assembly_location:
            raise RuntimeError(f"{root_name} assembly location changed: {tuple(root.location)}")
        world_min, world_max = object_world_bounds(meshes)
        local_bounds[root_name] = (
            tuple(world_min[index] - assembly_location[index] for index in range(3)),
            tuple(world_max[index] - assembly_location[index] for index in range(3)),
        )
        piece_data[root_name] = {
            "assemblyLocationCm": [round(value * 100, 2) for value in assembly_location],
            "meshCount": len(meshes),
            "materialSlots": slots,
        }
    left_min, left_max = local_bounds["Aegis_LeftArm"]
    right_min, right_max = local_bounds["Aegis_RightArm"]
    mirrored_pairs = zip(
        (left_min[0], left_max[0], left_min[1], left_max[1], left_min[2], left_max[2]),
        (-right_max[0], -right_min[0], right_min[1], right_max[1], right_min[2], right_max[2]),
    )
    if any(abs(left - right) > 0.01 for left, right in mirrored_pairs):
        raise RuntimeError("Aegis arm bounds are not mirrored around the core")
    contract = {
        "schemaVersion": 1,
        "assembledBoundsCm": {
            "min": [round(value * 100, 2) for value in bounds_min],
            "max": [round(value * 100, 2) for value in bounds_max],
            "width": width_cm,
        },
        "threatDirection": "-Y",
        "pieces": piece_data,
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
    scene.world.color = (0.001, 0.003, 0.009)
    bpy.ops.object.camera_add(location=(0, 155, 110))
    camera = bpy.context.object
    camera.name = "Aegis contract preview camera"
    camera.data.lens = 50
    scene.camera = camera
    direction = (bpy.data.objects["Aegis_Core"].location - camera.location).to_track_quat("-Z", "Y")
    camera.rotation_euler = direction.to_euler()
    bpy.ops.object.light_add(type="AREA", location=(-38, 48, 65))
    bpy.context.object.data.energy = 8500
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 35
    bpy.context.object.data.color = (0.3, 0.55, 1.0)
    bpy.ops.object.light_add(type="AREA", location=(45, 8, 35))
    bpy.context.object.data.energy = 6500
    bpy.context.object.data.size = 28
    bpy.context.object.data.color = (1.0, 0.18, 0.06)
    scene.use_nodes = True
    nodes = scene.node_tree.nodes
    nodes.clear()
    render_layers = nodes.new("CompositorNodeRLayers")
    glare = nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.6
    glare.size = 7
    composite = nodes.new("CompositorNodeComposite")
    scene.node_tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    scene.node_tree.links.new(glare.outputs["Image"], composite.inputs["Image"])
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    clear_scene()
    materials = {
        "carbon": material(MATERIAL_NAMES[0], (0.055, 0.012, 0.14, 1), 0.52, 0.28),
        "ceramic": material(MATERIAL_NAMES[1], (0.32, 0.07, 0.5, 1), 0.42, 0.22),
        "steel": material(MATERIAL_NAMES[2], (0.1, 0.025, 0.2, 1), 0.72, 0.28),
        "gold": material(MATERIAL_NAMES[3], (0.62, 0.2, 0.035, 1), 0.78, 0.2),
        "cyan": material(MATERIAL_NAMES[4], (0.01, 0.24, 0.55, 1), 0.3, 0.13, (0.01, 0.65, 1.0, 1), 7.0),
        "danger": material(MATERIAL_NAMES[5], (0.5, 0.025, 0.01, 1), 0.2, 0.15, (1.0, 0.035, 0.005, 1), 8.0),
    }
    build_core(materials)
    build_arm(-1, materials)
    build_arm(1, materials)
    validate_and_write_contract(Path(args.contract) if args.contract else None)
    source = Path(args.source)
    source.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    if args.preview:
        configure_preview(Path(args.preview))
    print(f"Saved three-piece Aegis source to {source}")


if __name__ == "__main__":
    main()
