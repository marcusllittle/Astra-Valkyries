"""Render the Astra Interceptor hangar launch used by the mission cinematic flow."""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


FPS = 24
END_FRAME = 144


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("preview", "video"), default="preview")
    parser.add_argument("--output", required=True)
    parser.add_argument("--frame", type=int, default=62)
    return parser.parse_args(blender_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.4,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float = 0.0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Edge bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def prism(
    name: str,
    footprint: list[tuple[float, float]],
    bottom: float,
    top: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    count = len(footprint)
    vertices = [(x, y, bottom) for x, y in footprint] + [(x, y, top) for x, y in footprint]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Edge bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 2
    return obj


def fuselage_mesh(name: str, mat: bpy.types.Material) -> bpy.types.Object:
    sections = [(-4.2, 0.86, 0.68), (-2.4, 1.12, 0.76), (0.9, 1.02, 0.68), (3.4, 0.58, 0.46), (5.2, 0.05, 0.04)]
    segments = 12
    vertices: list[tuple[float, float, float]] = []
    for y, radius_x, radius_z in sections:
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((math.cos(angle) * radius_x, y, math.sin(angle) * radius_z))
    faces: list[tuple[int, ...]] = []
    for section in range(len(sections) - 1):
        start = section * segments
        nxt = (section + 1) * segments
        for index in range(segments):
            right = (index + 1) % segments
            faces.append((start + index, start + right, nxt + right, nxt + index))
    faces.append(tuple(range(segments - 1, -1, -1)))
    tip_start = (len(sections) - 1) * segments
    faces.append(tuple(tip_start + index for index in range(segments)))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Fuselage bevel", "BEVEL")
    bevel.width = 0.1
    bevel.segments = 3
    return obj


def add_engine(
    parent: bpy.types.Object,
    x: float,
    blue: bpy.types.Material,
    dark: bpy.types.Material,
    exhaust: bpy.types.Material,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.62, depth=3.5, location=(x, -2.0, 0.05), rotation=(math.pi / 2, 0, 0))
    pod = bpy.context.object
    pod.name = f"Engine pod {x:+.1f}"
    pod.data.materials.append(blue)
    pod.parent = parent

    bpy.ops.mesh.primitive_torus_add(major_radius=0.48, minor_radius=0.1, major_segments=32, minor_segments=8, location=(x, -3.82, 0.05), rotation=(math.pi / 2, 0, 0))
    ring = bpy.context.object
    ring.name = "Engine ring"
    ring.data.materials.append(dark)
    ring.parent = parent

    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.18, radius2=0.48, depth=4.5, location=(x, -6.0, 0.05), rotation=(math.pi / 2, 0, 0))
    flame = bpy.context.object
    flame.name = "Engine exhaust"
    flame.data.materials.append(exhaust)
    flame.parent = parent
    return pod, flame


def build_ship(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    ship = bpy.data.objects.new("Astra Interceptor", None)
    bpy.context.collection.objects.link(ship)

    body = fuselage_mesh("Interceptor fuselage", materials["blue"])
    body.parent = ship

    for side in (-1, 1):
        points = [(0.35 * side, -2.5), (5.2 * side, -2.2), (4.0 * side, 0.2), (0.55 * side, 1.8)]
        wing = prism(f"{'Left' if side < 0 else 'Right'} main wing", points, -0.18, 0.16, materials["blue"])
        wing.parent = ship
        accent_points = [(0.8 * side, -1.5), (4.2 * side, -1.65), (3.8 * side, -1.25), (1.0 * side, -1.05)]
        accent = prism("Wing stripe", accent_points, 0.17, 0.2, materials["white"])
        accent.parent = ship

        tail_points = [(0.45 * side, -3.0), (2.4 * side, -3.4), (1.3 * side, -1.35), (0.52 * side, -1.1)]
        tail = prism("Tail plane", tail_points, -0.05, 0.22, materials["dark"])
        tail.parent = ship

    cockpit = None
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=(0, 1.7, 0.58), scale=(0.68, 1.52, 0.5))
    cockpit = bpy.context.object
    cockpit.name = "Canopy"
    cockpit.data.materials.append(materials["glass"])
    cockpit.parent = ship

    spine = cube("White command spine", (0, -0.5, 0.64), (0.22, 2.5, 0.08), materials["white"], 0.05)
    spine.parent = ship

    for side in (-1, 1):
        fin_points = [(0.55 * side, -3.25), (1.0 * side, -2.4), (0.72 * side, -0.7), (0.48 * side, -1.2)]
        fin = prism("Vertical stabilizer", fin_points, 0.25, 1.45, materials["dark"])
        fin.rotation_euler.y = side * math.radians(8)
        fin.parent = ship

    flames: list[bpy.types.Object] = []
    for x in (-1.48, 1.48):
        _, flame = add_engine(ship, x, materials["blue"], materials["dark"], materials["exhaust"])
        flames.append(flame)

    ship.rotation_euler = (math.radians(2), 0, math.radians(-1))
    return ship, flames


def add_hangar(materials: dict[str, bpy.types.Material]) -> None:
    cube("Deck", (0, -1, -1.45), (10.5, 16, 0.25), materials["deck"])
    cube("Ceiling", (0, -1, 7.25), (10.5, 16, 0.25), materials["deck"])
    cube("Left wall", (-10.25, -1, 3), (0.25, 16, 4.4), materials["deck"])
    cube("Right wall", (10.25, -1, 3), (0.25, 16, 4.4), materials["deck"])

    for y in (-14, -8, -2, 4, 10):
        cube("Hangar arch left", (-8.8, y, 3.0), (0.28, 0.35, 4.2), materials["metal"])
        cube("Hangar arch right", (8.8, y, 3.0), (0.28, 0.35, 4.2), materials["metal"])
        cube("Hangar arch roof", (0, y, 6.45), (9.0, 0.35, 0.28), materials["metal"])
        cube("Arch light left", (-8.45, y - 0.38, 3.2), (0.07, 0.08, 2.8), materials["cyan"])
        cube("Arch light right", (8.45, y - 0.38, 3.2), (0.07, 0.08, 2.8), materials["cyan"])

    for side in (-1, 1):
        for x in (2.1, 4.2, 6.3):
            cube("Runway strip", (x * side, -1.0, -1.16), (0.055, 14.8, 0.035), materials["cyan"])

    cube("Door lintel", (0, 12.0, 6.5), (9.0, 0.5, 0.35), materials["metal"])
    cube("Door left", (-8.65, 12.0, 2.7), (0.35, 0.5, 4.1), materials["metal"])
    cube("Door right", (8.65, 12.0, 2.7), (0.35, 0.5, 4.1), materials["metal"])
    cube("Launch horizon", (0, 12.45, -0.9), (8.7, 0.12, 0.12), materials["gold"])

    for y in (-11, -5, 1, 7):
        bpy.ops.object.light_add(type="AREA", location=(0, y, 6.2))
        light = bpy.context.object
        light.data.energy = 900
        light.data.color = (0.28, 0.62, 1.0)
        light.data.shape = "RECTANGLE"
        light.data.size = 7
        light.data.size_y = 1.5
        light.data.use_shadow = False
        light.rotation_euler = (0, 0, 0)


def add_space(materials: dict[str, bpy.types.Material]) -> None:
    random.seed(23)
    star_mesh = bpy.data.meshes.new("StarfieldMesh")
    vertices = []
    for _ in range(180):
        vertices.append((random.uniform(-48, 48), random.uniform(28, 120), random.uniform(-18, 48)))
    star_mesh.from_pydata(vertices, [], [])
    star_mesh.update()
    stars = bpy.data.objects.new("Starfield", star_mesh)
    bpy.context.collection.objects.link(stars)
    stars.data.materials.append(materials["stars"])
    stars.modifiers.new("Star geometry", "NODES")
    node_group = bpy.data.node_groups.new("StarGeometry", "GeometryNodeTree")
    stars.modifiers[-1].node_group = node_group
    node_group.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    node_group.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nodes = node_group.nodes
    links = node_group.links
    input_node = nodes.new("NodeGroupInput")
    output_node = nodes.new("NodeGroupOutput")
    ico = nodes.new("GeometryNodeMeshIcoSphere")
    ico.inputs["Radius"].default_value = 0.045
    ico.inputs["Subdivisions"].default_value = 1
    instance = nodes.new("GeometryNodeInstanceOnPoints")
    realize = nodes.new("GeometryNodeRealizeInstances")
    set_material = nodes.new("GeometryNodeSetMaterial")
    set_material.inputs["Material"].default_value = materials["stars"]
    links.new(input_node.outputs["Geometry"], instance.inputs["Points"])
    links.new(ico.outputs["Mesh"], instance.inputs["Instance"])
    links.new(instance.outputs["Instances"], realize.inputs["Geometry"])
    links.new(realize.outputs["Geometry"], set_material.inputs["Geometry"])
    links.new(set_material.outputs["Geometry"], output_node.inputs["Geometry"])

    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=(28, 82, 20), scale=(17, 17, 17))
    planet = bpy.context.object
    planet.name = "Slipstream planet"
    planet.data.materials.append(materials["planet"])

    for index in range(22):
        x = random.choice((-1, 1)) * random.uniform(8, 38)
        y = random.uniform(25, 105)
        z = random.uniform(-8, 34)
        streak = cube("Slipstream streak", (x, y, z), (0.025, random.uniform(0.9, 3.2), 0.025), materials["cyan"])
        streak.rotation_euler.z = random.uniform(-0.08, 0.08)


def look_at(obj: bpy.types.Object, target: bpy.types.Object) -> None:
    constraint = obj.constraints.new(type="TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"


def keyframe(obj: bpy.types.Object, frame: int, location: tuple[float, float, float]) -> None:
    obj.location = location
    obj.keyframe_insert(data_path="location", frame=frame)


def animate(ship: bpy.types.Object, flames: list[bpy.types.Object], materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    keyframe(ship, 1, (0, -0.4, 0))
    keyframe(ship, 38, (0, -0.4, 0))
    keyframe(ship, 74, (0, 12.0, 1.2))
    keyframe(ship, 144, (0, 92.0, 13.0))
    ship.rotation_euler.z = math.radians(-1)
    ship.keyframe_insert(data_path="rotation_euler", frame=1)
    ship.rotation_euler.z = math.radians(5)
    ship.keyframe_insert(data_path="rotation_euler", frame=144)

    for action in (ship.animation_data.action,) if ship.animation_data and ship.animation_data.action else ():
        for curve in action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"
                point.handle_left_type = "AUTO_CLAMPED"
                point.handle_right_type = "AUTO_CLAMPED"

    for flame in flames:
        flame.scale = (0.65, 0.65, 0.22)
        flame.keyframe_insert(data_path="scale", frame=1)
        flame.scale = (0.9, 0.9, 0.5)
        flame.keyframe_insert(data_path="scale", frame=34)
        flame.scale = (1.0, 1.0, 2.2)
        flame.keyframe_insert(data_path="scale", frame=58)
        flame.scale = (1.2, 1.2, 4.0)
        flame.keyframe_insert(data_path="scale", frame=90)

    target = bpy.data.objects.new("Camera target", None)
    bpy.context.collection.objects.link(target)
    target.parent = ship
    target.location = (0, 1.0, 0.25)
    return target


def add_camera(target: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=(8.6, -14.5, 4.8))
    camera = bpy.context.object
    camera.name = "Launch camera"
    camera.data.lens = 46
    camera.data.sensor_width = 36
    look_at(camera, target)
    keyframe(camera, 1, (8.6, -14.5, 4.8))
    keyframe(camera, 44, (6.8, -11.8, 3.7))
    keyframe(camera, 86, (4.4, -8.0, 2.5))
    keyframe(camera, 144, (2.3, -3.0, 1.7))
    bpy.context.scene.camera = camera
    return camera


def setup_scene(output: Path, mode: str, preview_frame: int) -> None:
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 60 if mode == "preview" else 100
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = END_FRAME
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.001, 0.003, 0.009)
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.001, 0.004, 0.015, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12

    materials = {
        "blue": material("Astra blue", (0.018, 0.18, 0.52, 1), metallic=0.82, roughness=0.23),
        "white": material("Command white", (0.72, 0.84, 0.95, 1), metallic=0.48, roughness=0.22),
        "dark": material("Carbon armor", (0.006, 0.012, 0.026, 1), metallic=0.9, roughness=0.2),
        "glass": material("Canopy glass", (0.01, 0.05, 0.09, 1), metallic=0.45, roughness=0.08),
        "deck": material("Hangar deck", (0.026, 0.044, 0.078, 1), metallic=0.7, roughness=0.32),
        "metal": material("Hangar braces", (0.075, 0.12, 0.2, 1), metallic=0.78, roughness=0.3),
        "cyan": material("Guidance cyan", (0.01, 0.2, 0.48, 1), emission=(0.0, 0.44, 1.0, 1), emission_strength=8),
        "gold": material("Launch gold", (0.7, 0.28, 0.02, 1), emission=(1.0, 0.22, 0.01, 1), emission_strength=12),
        "exhaust": material("Engine plasma", (0.02, 0.32, 1.0, 1), emission=(0.01, 0.42, 1.0, 1), emission_strength=10),
        "stars": material("Stars", (1, 1, 1, 1), emission=(0.7, 0.9, 1.0, 1), emission_strength=7),
        "planet": material("Planet", (0.015, 0.07, 0.16, 1), metallic=0.05, roughness=0.72),
    }

    add_hangar(materials)
    add_space(materials)
    ship, flames = build_ship(materials)
    target = animate(ship, flames, materials)
    add_camera(target)

    bpy.ops.object.light_add(type="AREA", location=(-4, -5, 5.2))
    key = bpy.context.object
    key.name = "Ship key light"
    key.data.energy = 1500
    key.data.color = (0.18, 0.5, 1.0)
    key.data.shape = "DISK"
    key.data.size = 7
    key.data.use_shadow = False
    look_at(key, ship)

    bpy.ops.object.light_add(type="AREA", location=(5, -1, 2.8))
    rim = bpy.context.object
    rim.name = "Warm rim light"
    rim.data.energy = 1100
    rim.data.color = (1.0, 0.22, 0.04)
    rim.data.size = 4
    rim.data.use_shadow = False
    look_at(rim, ship)

    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    render_layers = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.8
    glare.size = 6
    composite = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], composite.inputs["Image"])

    output.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(output)
    if mode == "video":
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
        bpy.ops.render.render(animation=True)
    else:
        scene.frame_set(max(1, min(END_FRAME, preview_frame)))
        bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    setup_scene(Path(args.output), args.mode, args.frame)


if __name__ == "__main__":
    main()
