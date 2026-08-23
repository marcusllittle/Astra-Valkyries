"""Render the production Astra Interceptor launch cinematic."""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy


FPS = 24
END_FRAME = 168


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("preview", "video"), default="preview")
    parser.add_argument("--output", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--frame", type=int, default=36)
    return parser.parse_args(blender_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0,
    roughness: float = 0.4,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_planet_surface(mat: bpy.types.Material) -> None:
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 2.8
    noise.inputs["Detail"].default_value = 5.5
    noise.inputs["Roughness"].default_value = 0.72
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.002, 0.018, 0.06, 1)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = (0.015, 0.22, 0.48, 1)
    mid = ramp.color_ramp.elements.new(0.52)
    mid.color = (0.01, 0.075, 0.18, 1)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])


def cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    bevel: float = 0,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Edge bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def prism(
    name: str,
    footprint: list[tuple[float, float]],
    bottom: float,
    top: float,
    mat: bpy.types.Material,
    *,
    bevel: float = 0.06,
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
    if bevel:
        modifier = obj.modifiers.new("Edge bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def parent_to(obj: bpy.types.Object, parent: bpy.types.Object) -> bpy.types.Object:
    obj.parent = parent
    return obj


def fuselage(name: str, mat: bpy.types.Material) -> bpy.types.Object:
    sections = [
        (-5.1, 0.72, 0.55),
        (-3.7, 1.2, 0.76),
        (-1.3, 1.35, 0.88),
        (1.4, 1.18, 0.82),
        (3.8, 0.72, 0.55),
        (5.6, 0.24, 0.2),
        (6.5, 0.02, 0.02),
    ]
    segments = 24
    vertices: list[tuple[float, float, float]] = []
    for y, radius_x, radius_z in sections:
        for index in range(segments):
            angle = math.tau * index / segments
            x = math.cos(angle) * radius_x
            z = math.sin(angle) * radius_z
            if z < 0:
                z *= 0.72
            vertices.append((x, y, z))
    faces: list[tuple[int, ...]] = []
    for section in range(len(sections) - 1):
        start = section * segments
        nxt = (section + 1) * segments
        for index in range(segments):
            right = (index + 1) % segments
            faces.append((start + index, start + right, nxt + right, nxt + index))
    faces.append(tuple(range(segments - 1, -1, -1)))
    tip = (len(sections) - 1) * segments
    faces.append(tuple(tip + index for index in range(segments)))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Fuselage finish", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 3
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (math.pi / 2, 0, 0),
    vertices: int = 48,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Machined edge", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 2
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (math.pi / 2, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def build_interceptor(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, list[bpy.types.Object], list[bpy.types.PointLight]]:
    ship = bpy.data.objects.new("Astra Interceptor Hero", None)
    bpy.context.collection.objects.link(ship)
    parent_to(fuselage("Needle fuselage", materials["blue"]), ship)

    # Layered delta wings match the painted Interceptor instead of the old box silhouette.
    wing_points = [(0.62, -2.7), (6.6, -1.9), (5.25, 1.15), (1.05, 2.4)]
    for side in (-1, 1):
        mirrored = [(x * side, y) for x, y in wing_points]
        parent_to(prism(f"{'Left' if side < 0 else 'Right'} delta wing", mirrored, -0.2, 0.12, materials["blue"], bevel=0.1), ship)
        inset = [(1.0 * side, -1.95), (5.35 * side, -1.48), (4.55 * side, 0.65), (1.34 * side, 1.48)]
        parent_to(prism("White wing blade", inset, 0.13, 0.19, materials["white"], bevel=0.035), ship)
        dark_panel = [(1.35 * side, -1.35), (4.45 * side, -1.1), (3.65 * side, 0.25), (1.55 * side, 0.8)]
        parent_to(prism("Carbon wing panel", dark_panel, 0.2, 0.235, materials["carbon"], bevel=0.025), ship)

        # Wingtip rail and forward lance turn the silhouette into a weapon platform.
        rail = cylinder("Wingtip rail", (5.55 * side, 0.15, 0.08), 0.13, 4.6, materials["carbon"], vertices=24)
        parent_to(rail, ship)
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.2, radius2=0.015, depth=2.4, location=(5.55 * side, 3.52, 0.08), rotation=(math.pi / 2, 0, 0))
        parent_to(bpy.context.object, ship).data.materials.append(materials["blue"])

        # Twin swept vertical tails.
        fin_points = [(1.3 * side, -4.25), (1.9 * side, -3.35), (1.62 * side, -1.45), (1.16 * side, -2.0)]
        fin = parent_to(prism("Swept vertical stabilizer", fin_points, 0.3, 1.72, materials["carbon"], bevel=0.08), ship)
        fin.rotation_euler.y = side * math.radians(9)

    # Armored spine and segmented dorsal panels.
    parent_to(prism("Command spine", [(-0.25, -3.7), (0.25, -3.7), (0.38, 4.4), (-0.38, 4.4)], 0.72, 0.87, materials["white"], bevel=0.04), ship)
    for index, y in enumerate((-3.0, -2.1, -1.2, 3.95, 4.55)):
        panel = cube(f"Dorsal service panel {index + 1}", (0, y, 0.93), (0.42 if y < 0 else 0.22, 0.3, 0.035), materials["carbon"], bevel=0.025)
        parent_to(panel, ship)

    # Long framed canopy with a bright cockpit rim.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=(0, 2.4, 0.83), scale=(0.66, 1.75, 0.48))
    canopy = parent_to(bpy.context.object, ship)
    canopy.name = "Panoramic canopy"
    canopy.data.materials.append(materials["glass"])
    for side in (-1, 1):
        rail = cube(
            "Canopy frame rail",
            (0.54 * side, 2.28, 1.04),
            (0.035, 1.3, 0.035),
            materials["white"],
            bevel=0.025,
            rotation=(math.radians(-4), 0, 0),
        )
        parent_to(rail, ship)

    flames: list[bpy.types.Object] = []
    engine_lights: list[bpy.types.PointLight] = []
    for side in (-1, 1):
        x = 1.75 * side
        parent_to(cylinder("Engine nacelle", (x, -2.15, 0.12), 0.78, 5.4, materials["blue"]), ship)
        parent_to(cylinder("Engine armor", (x, -1.1, 0.12), 0.82, 1.15, materials["white"]), ship)
        for y in (-4.75, -4.45, -4.15):
            parent_to(torus("Engine turbine ring", (x, y, 0.12), 0.66, 0.085, materials["carbon"]), ship)
        parent_to(torus("Engine ignition ring", (x, -4.94, 0.12), 0.53, 0.11, materials["cyan"]), ship)
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.13, radius2=0.57, depth=6.8, location=(x, -8.25, 0.12), rotation=(math.pi / 2, 0, 0))
        outer_flame = parent_to(bpy.context.object, ship)
        outer_flame.name = "Engine plasma plume"
        outer_flame.data.materials.append(materials["exhaust"])
        flames.append(outer_flame)
        bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.07, radius2=0.28, depth=4.9, location=(x, -7.35, 0.12), rotation=(math.pi / 2, 0, 0))
        inner_flame = parent_to(bpy.context.object, ship)
        inner_flame.name = "White exhaust core"
        inner_flame.data.materials.append(materials["hot"])
        flames.append(inner_flame)
        bpy.ops.object.light_add(type="POINT", location=(x, -5.2, 0.12))
        light = parent_to(bpy.context.object, ship)
        light.name = "Engine bloom light"
        light.data.color = (0.05, 0.55, 1.0)
        light.data.energy = 0
        light.data.shadow_soft_size = 2.6
        light.data.use_shadow = False
        engine_lights.append(light.data)

    ship.rotation_euler = (0, 0, math.radians(-0.7))
    return ship, flames, engine_lights


def build_launch_deck(materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, list[bpy.types.Object], list[bpy.types.Object]]:
    existing_objects = set(bpy.context.scene.objects)
    hangar_root = bpy.data.objects.new("Launch deck environment", None)
    bpy.context.collection.objects.link(hangar_root)
    cube("Launch deck", (0, 0, -1.58), (12, 24, 0.3), materials["deck"], bevel=0.08)
    cube("Ceiling", (0, 0, 8.7), (12, 24, 0.3), materials["deck"])
    cube("Port wall", (-11.7, 0, 3.6), (0.3, 24, 5.4), materials["deck"])
    cube("Starboard wall", (11.7, 0, 3.6), (0.3, 24, 5.4), materials["deck"])

    for y in range(-20, 23, 5):
        cube("Hangar rib port", (-10.3, y, 3.5), (0.34, 0.3, 4.7), materials["steel"], bevel=0.08)
        cube("Hangar rib starboard", (10.3, y, 3.5), (0.34, 0.3, 4.7), materials["steel"], bevel=0.08)
        cube("Hangar rib roof", (0, y, 7.8), (10.5, 0.3, 0.28), materials["steel"], bevel=0.08)
        cube("Port rib light", (-9.92, y - 0.34, 3.7), (0.055, 0.08, 3.15), materials["cyan"])
        cube("Starboard rib light", (9.92, y - 0.34, 3.7), (0.055, 0.08, 3.15), materials["cyan"])

    for side in (-1, 1):
        cube("Launch rail", (3.1 * side, 0, -1.2), (0.12, 23, 0.08), materials["cyan"])
        cube("Safety rail", (7.6 * side, 0, -1.22), (0.055, 23, 0.04), materials["gold"])
        cube("Catwalk", (9.1 * side, -2, 1.1), (1.2, 17, 0.12), materials["steel"], bevel=0.05)
        for y in range(-17, 20, 4):
            cube("Catwalk support", (9.1 * side, y, -0.1), (0.1, 0.1, 1.2), materials["steel"])

    # Repeating deck chevrons create acceleration parallax.
    for y in range(-19, 23, 3):
        for side in (-1, 1):
            chevron = cube("Deck chevron", (1.35 * side, y, -1.22), (0.55, 0.16, 0.035), materials["white"], rotation=(0, 0, side * math.radians(26)))
            chevron.data.materials.clear()
            chevron.data.materials.append(materials["white"])

    clamps: list[bpy.types.Object] = []
    for side in (-1, 1):
        for y in (-2.8, 0.6):
            pivot = bpy.data.objects.new("Launch clamp pivot", None)
            pivot.location = (4.9 * side, y, -1.05)
            bpy.context.collection.objects.link(pivot)
            arm = cube("Hydraulic launch clamp", (-1.65 * side, 0, 1.0), (1.8, 0.24, 0.2), materials["gold"], bevel=0.08)
            parent_to(arm, pivot)
            pad = cube("Clamp magnetic pad", (-3.2 * side, 0, 1.0), (0.38, 0.46, 0.5), materials["carbon"], bevel=0.1)
            parent_to(pad, pivot)
            clamps.append(pivot)

    doors: list[bpy.types.Object] = []
    for side in (-1, 1):
        door = cube("Launch iris door", (5.6 * side, 23.5, 3.4), (5.55, 0.55, 4.8), materials["steel"], bevel=0.12)
        doors.append(door)
    cube("Door header", (0, 23.5, 8.05), (11.2, 0.6, 0.45), materials["steel"], bevel=0.1)
    for obj in set(bpy.context.scene.objects) - existing_objects:
        if obj != hangar_root and obj.parent is None:
            obj.parent = hangar_root
    return hangar_root, clamps, doors


def build_space(materials: dict[str, bpy.types.Material]) -> None:
    random.seed(72)
    for index in range(260):
        x = random.uniform(-85, 85)
        y = random.uniform(28, 180)
        z = random.uniform(-45, 75)
        radius = random.uniform(0.025, 0.085)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=(x, y, z))
        star = bpy.context.object
        star.name = f"Star {index + 1}"
        star.data.materials.append(materials["stars"])

    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, location=(52, 130, -32), scale=(46, 46, 46))
    planet = bpy.context.object
    planet.name = "Astra orbital world"
    planet.data.materials.append(materials["planet"])
def look_at(obj: bpy.types.Object, target: bpy.types.Object) -> None:
    constraint = obj.constraints.new(type="TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"


def key_location(obj: bpy.types.Object, frame: int, location: tuple[float, float, float]) -> None:
    obj.location = location
    obj.keyframe_insert(data_path="location", frame=frame)


def add_camera(name: str, location: tuple[float, float, float], lens: float, target: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.name = name
    camera.data.lens = lens
    camera.data.sensor_width = 36
    look_at(camera, target)
    return camera


def set_interpolation(obj: bpy.types.Object, mode: str) -> None:
    if not obj.animation_data or not obj.animation_data.action:
        return
    for curve in obj.animation_data.action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = mode


def animate_scene(
    scene: bpy.types.Scene,
    ship: bpy.types.Object,
    flames: list[bpy.types.Object],
    engine_lights: list[bpy.types.PointLight],
    clamps: list[bpy.types.Object],
    doors: list[bpy.types.Object],
    hangar_root: bpy.types.Object,
) -> None:
    key_location(ship, 1, (0, -3.2, 0))
    key_location(ship, 36, (0, -3.2, 0))
    key_location(ship, 50, (0, -2.4, 0.08))
    key_location(ship, 82, (0, 15, 1.1))
    key_location(ship, 112, (0, 41, 7.0))
    key_location(ship, 168, (25, 126, 30))
    ship.rotation_euler = (0, 0, math.radians(-0.7))
    ship.keyframe_insert(data_path="rotation_euler", frame=1)
    ship.keyframe_insert(data_path="rotation_euler", frame=96)
    ship.rotation_euler = (math.radians(8), math.radians(-5), math.radians(-22))
    ship.keyframe_insert(data_path="rotation_euler", frame=168)
    set_interpolation(ship, "BEZIER")

    for index, flame in enumerate(flames):
        is_outer = index % 2 == 0
        idle_width = 0.42 if is_outer else 0.24
        charge_width = 0.58 if is_outer else 0.34
        launch_width = 0.66 if is_outer else 0.38
        flame.scale = (idle_width, idle_width, 0.08)
        flame.keyframe_insert(data_path="scale", frame=1)
        flame.scale = (charge_width, charge_width, 0.18)
        flame.keyframe_insert(data_path="scale", frame=20)
        flame.scale = (launch_width, launch_width, 0.4 if is_outer else 0.5)
        flame.keyframe_insert(data_path="scale", frame=36)
        flame.scale = (launch_width, launch_width, 0.82)
        flame.keyframe_insert(data_path="scale", frame=52)
        flame.scale = (launch_width * 1.08, launch_width * 1.08, 1.35)
        flame.keyframe_insert(data_path="scale", frame=82)
        flame.scale = (charge_width, charge_width, 0.82)
        flame.keyframe_insert(data_path="scale", frame=168)
    for light in engine_lights:
        for frame, energy in ((1, 0), (20, 120), (36, 420), (52, 950), (112, 680), (168, 360)):
            light.energy = energy
            light.keyframe_insert(data_path="energy", frame=frame)

    for index, clamp in enumerate(clamps):
        clamp.rotation_euler = (0, 0, 0)
        clamp.keyframe_insert(data_path="rotation_euler", frame=1)
        clamp.keyframe_insert(data_path="rotation_euler", frame=26 + index % 2 * 2)
        clamp.rotation_euler.z = math.radians((58 if clamp.location.x > 0 else -58))
        clamp.keyframe_insert(data_path="rotation_euler", frame=42 + index % 2 * 2)

    for door in doors:
        start = door.location.copy()
        door.keyframe_insert(data_path="location", frame=1)
        door.keyframe_insert(data_path="location", frame=24)
        door.location.x = start.x + (6.2 if start.x > 0 else -6.2)
        door.keyframe_insert(data_path="location", frame=48)

    key_location(hangar_root, 1, (0, 0, 0))
    key_location(hangar_root, 112, (0, 0, 0))
    key_location(hangar_root, 113, (0, -500, 0))
    set_interpolation(hangar_root, "CONSTANT")

    target = bpy.data.objects.new("Ship camera target", None)
    bpy.context.collection.objects.link(target)
    target.parent = ship
    target.location = (0, 0.35, 0.35)

    hero_camera = add_camera("Hero inspection camera", (6.8, 14.0, 7.75), 43, target)
    key_location(hero_camera, 1, (6.8, 14.0, 7.75))
    key_location(hero_camera, 44, (4.6, 10.8, 6.3))

    ignition_camera = add_camera("Ignition camera", (0.2, -14.8, 1.7), 42, target)
    key_location(ignition_camera, 45, (0.2, -14.8, 1.7))
    key_location(ignition_camera, 76, (-1.2, -11.4, 2.15))
    key_location(ignition_camera, 112, (-2.8, -5.5, 3.0))

    orbital_camera = add_camera("Orbital flyby camera", (-23, 49, 31), 48, target)
    key_location(orbital_camera, 113, (-23, 49, 31))
    key_location(orbital_camera, 168, (-7, 72, 39))

    scene.camera = hero_camera
    for name, frame, camera in (
        ("Hero detail", 1, hero_camera),
        ("Ignition", 45, ignition_camera),
        ("Orbital release", 113, orbital_camera),
    ):
        marker = scene.timeline_markers.new(name, frame=frame)
        marker.camera = camera


def add_lighting(materials: dict[str, bpy.types.Material], ship: bpy.types.Object) -> None:
    for y in (-16, -7, 2, 11, 20):
        bpy.ops.object.light_add(type="AREA", location=(0, y, 7.55))
        light = bpy.context.object
        light.name = "Flight deck softbox"
        light.data.energy = 1050
        light.data.color = (0.16, 0.48, 1.0)
        light.data.shape = "RECTANGLE"
        light.data.size = 8
        light.data.size_y = 1.4
        light.data.use_shadow = False

    bpy.ops.object.light_add(type="AREA", location=(-6, -7, 5.5))
    key = bpy.context.object
    key.name = "Hero key"
    key.data.energy = 2200
    key.data.color = (0.3, 0.68, 1.0)
    key.data.shape = "DISK"
    key.data.size = 7
    key.data.use_shadow = False
    look_at(key, ship)

    bpy.ops.object.light_add(type="AREA", location=(6.5, -1.5, 3.8))
    rim = bpy.context.object
    rim.name = "Launch rim"
    rim.data.energy = 1800
    rim.data.color = (1.0, 0.2, 0.035)
    rim.data.size = 5
    rim.data.use_shadow = False
    look_at(rim, ship)

    bpy.ops.object.light_add(type="SUN", location=(0, 60, 30))
    sun = bpy.context.object
    sun.name = "Orbital sunlight"
    sun.data.energy = 2.2
    sun.data.use_shadow = False
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-24))

    bpy.ops.object.light_add(type="AREA", location=(-18, 78, 48))
    orbital_key = bpy.context.object
    orbital_key.name = "Orbital hero light"
    orbital_key.data.energy = 7200
    orbital_key.data.color = (0.38, 0.62, 1.0)
    orbital_key.data.shape = "DISK"
    orbital_key.data.size = 18
    orbital_key.data.use_shadow = False
    look_at(orbital_key, ship)


def setup_scene(output: Path, source: Path, mode: str, preview_frame: int) -> None:
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 50 if mode == "preview" else 100
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = END_FRAME
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.001, 0.003, 0.009)
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.001, 0.004, 0.014, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.08

    materials = {
        "blue": material("Astra sapphire armor", (0.008, 0.12, 0.46, 1), metallic=0.9, roughness=0.18),
        "white": material("Command ceramic", (0.68, 0.82, 0.94, 1), metallic=0.52, roughness=0.2),
        "carbon": material("Carbon armor", (0.003, 0.008, 0.02, 1), metallic=0.94, roughness=0.16),
        "glass": material("Cockpit glass", (0.002, 0.025, 0.055, 1), metallic=0.48, roughness=0.06),
        "deck": material("Flight deck", (0.012, 0.025, 0.052, 1), metallic=0.78, roughness=0.28),
        "steel": material("Hangar structure", (0.035, 0.075, 0.14, 1), metallic=0.82, roughness=0.3),
        "cyan": material("Astra guidance light", (0.01, 0.3, 0.8, 1), emission=(0.01, 0.55, 1.0, 1), emission_strength=5),
        "gold": material("Launch warning light", (0.75, 0.2, 0.015, 1), emission=(1.0, 0.14, 0.01, 1), emission_strength=5),
        "exhaust": material("Engine plasma", (0.01, 0.18, 0.72, 1), emission=(0.01, 0.3, 0.85, 1), emission_strength=4.5),
        "hot": material("Exhaust core", (0.7, 0.9, 1, 1), emission=(0.55, 0.82, 1.0, 1), emission_strength=7),
        "stars": material("Stars", (1, 1, 1, 1), emission=(0.7, 0.9, 1, 1), emission_strength=8),
        "planet": material("Orbital world", (0.015, 0.09, 0.24, 1), metallic=0.02, roughness=0.76),
        "atmosphere": material("Atmosphere", (0.02, 0.32, 0.9, 1), emission=(0.02, 0.42, 1, 1), emission_strength=4),
    }
    add_planet_surface(materials["planet"])

    hangar_root, clamps, doors = build_launch_deck(materials)
    build_space(materials)
    ship, flames, engine_lights = build_interceptor(materials)
    add_lighting(materials, ship)
    animate_scene(scene, ship, flames, engine_lights, clamps, doors, hangar_root)

    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    render_layers = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.7
    glare.size = 7
    composite = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], composite.inputs["Image"])

    output.parent.mkdir(parents=True, exist_ok=True)
    source.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    scene.render.filepath = str(output)
    if mode == "video":
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "HIGH"
        scene.render.ffmpeg.ffmpeg_preset = "GOOD"
        bpy.ops.render.render(animation=True)
    else:
        scene.frame_set(max(1, min(END_FRAME, preview_frame)))
        bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    setup_scene(Path(args.output), Path(args.source), args.mode, args.frame)


if __name__ == "__main__":
    main()
