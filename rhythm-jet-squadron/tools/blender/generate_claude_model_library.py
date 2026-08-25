"""Import the Claude procedural GLBs into a deterministic Blender source library."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


@dataclass(frozen=True)
class ModelSource:
    file: str
    key: str


SOURCES = (
    ModelSource("astra-interceptor.glb", "astra_interceptor"),
    ModelSource("valkyrie-lancer.glb", "valkyrie_lancer"),
    ModelSource("seraph-guard.glb", "seraph_guard"),
    ModelSource("aegis-dreadnought.glb", "aegis_dreadnought"),
    ModelSource("helios-tyrant.glb", "helios_tyrant"),
    ModelSource("cryo-leviathan.glb", "cryo_leviathan"),
    ModelSource("tank-fortress.glb", "tank_fortress"),
    ModelSource("enemy-squadron.glb", "enemy_squadron"),
    ModelSource("pickups.glb", "pickups"),
)

SHIP_ROOTS = {
    "astra_interceptor": "Claude_AstraInterceptor",
    "valkyrie_lancer": "Claude_ValkyrieLancer",
    "seraph_guard": "Claude_SeraphGuard",
}

ENEMY_TYPES = (
    "drifter",
    "sine",
    "zigzag",
    "charger",
    "sniper",
    "bomber",
    "orbiter",
    "splitter",
    "swarm",
    "dreadnought",
)


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--contract", required=True)
    return parser.parse_args(blender_args)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in tuple(bpy.data.collections):
        bpy.data.collections.remove(collection)


def import_glb(path: Path, key: str) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path), import_shading="NORMALS")
    imported = [obj for obj in bpy.data.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh objects imported from {path.name}")

    for obj in meshes:
        source_name = obj.name
        # Three.js intentionally shares geometry across mirrored meshes. FBX
        # cannot preserve different material-slot layouts on shared Blender
        # mesh data, so make each named production part independent.
        obj.data = obj.data.copy()
        obj["claude_source_name"] = source_name
        obj["claude_source_file"] = path.name
        obj.name = f"{key}__{source_name}"

    for obj in meshes:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world

    for obj in imported:
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    return meshes


def source_name(obj: bpy.types.Object) -> str:
    return str(obj.get("claude_source_name", obj.name))


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (
        Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners))),
        Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners))),
    )


def create_root(
    name: str,
    objects: list[bpy.types.Object],
    pivot: Vector | None = None,
) -> bpy.types.Object:
    if not objects:
        raise RuntimeError(f"Root {name} has no mesh objects")
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "ARROWS"
    root.location = pivot or Vector()
    bpy.context.scene.collection.objects.link(root)
    bpy.context.view_layer.update()
    for obj in objects:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = root.matrix_world.inverted() @ world
    return root


def side_pivot_x(objects: list[bpy.types.Object]) -> float:
    low, high = bounds(objects)
    return low.x if low.x > 0 else high.x


def center_pivot(objects: list[bpy.types.Object]) -> Vector:
    low, high = bounds(objects)
    return (low + high) / 2


def split_boss(
    meshes: list[bpy.types.Object],
    core_name: str,
    left_name: str,
    right_name: str,
    side_filter,
) -> list[bpy.types.Object]:
    left: list[bpy.types.Object] = []
    right: list[bpy.types.Object] = []
    core: list[bpy.types.Object] = []
    for obj in meshes:
        side = side_filter(obj)
        if side == "left":
            left.append(obj)
        elif side == "right":
            right.append(obj)
        else:
            core.append(obj)
    return [
        create_root(core_name, core),
        create_root(left_name, left, Vector((side_pivot_x(left), 0, 0))),
        create_root(right_name, right, Vector((side_pivot_x(right), 0, 0))),
    ]


def aegis_side(obj: bpy.types.Object) -> str | None:
    name = source_name(obj)
    if "port" in name:
        return "left"
    if "stbd" in name:
        return "right"
    return None


def cryo_side(obj: bpy.types.Object) -> str | None:
    name = source_name(obj)
    if not name.startswith("arm_"):
        return None
    if "port" in name:
        return "left"
    if "stbd" in name:
        return "right"
    return None


def helios_side(obj: bpy.types.Object) -> str | None:
    name = source_name(obj)
    arm_part = name.startswith(("radial_arm_", "arm_root_collar_", "arm_vent_"))
    if not arm_part:
        return None
    center = sum((obj.matrix_world @ Vector(corner) for corner in obj.bound_box), Vector()) / 8
    return "left" if center.x < 0 else "right"


def build_roots(imported: dict[str, list[bpy.types.Object]]) -> list[bpy.types.Object]:
    roots = [create_root(root_name, imported[key]) for key, root_name in SHIP_ROOTS.items()]
    roots.extend(
        split_boss(
            imported["aegis_dreadnought"],
            "Claude_Aegis_Core",
            "Claude_Aegis_LeftArm",
            "Claude_Aegis_RightArm",
            aegis_side,
        )
    )
    roots.extend(
        split_boss(
            imported["cryo_leviathan"],
            "Claude_Cryo_Core",
            "Claude_Cryo_LeftArm",
            "Claude_Cryo_RightArm",
            cryo_side,
        )
    )
    roots.extend(
        split_boss(
            imported["helios_tyrant"],
            "Claude_Helios_Core",
            "Claude_Helios_LeftArms",
            "Claude_Helios_RightArms",
            helios_side,
        )
    )
    tank_meshes = imported["tank_fortress"]
    roots.append(create_root("Claude_Enemy_Tank", tank_meshes, center_pivot(tank_meshes)))

    enemy_meshes = imported["enemy_squadron"]
    for enemy_type in ENEMY_TYPES:
        prefix = f"enemy_{enemy_type}"
        selected = [obj for obj in enemy_meshes if source_name(obj).startswith(prefix)]
        roots.append(
            create_root(
                f"Claude_Enemy_{enemy_type.title()}",
                selected,
                center_pivot(selected),
            )
        )

    pickup_meshes = imported["pickups"]
    roots.append(
        create_root(
            "Claude_Pickup_PowerChip",
            (power_chip := [
                obj for obj in pickup_meshes if source_name(obj).startswith("power_chip")
            ]),
            center_pivot(power_chip),
        )
    )
    roots.append(
        create_root(
            "Claude_Pickup_PulseRing",
            (pulse_ring := [
                obj for obj in pickup_meshes if source_name(obj).startswith("pulse_ring")
            ]),
            center_pivot(pulse_ring),
        )
    )
    return roots


def root_contract(root: bpy.types.Object) -> dict[str, object]:
    objects = [obj for obj in root.children_recursive if obj.type == "MESH"]
    low, high = bounds(objects)
    materials = sorted(
        {
            slot.material.name
            for obj in objects
            for slot in obj.material_slots
            if slot.material is not None
        }
    )
    return {
        "name": root.name,
        "meshCount": len(objects),
        "materialNames": materials,
        "boundsMeters": {"min": list(low), "max": list(high)},
        "pivotMeters": list(root.location),
    }


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir).resolve()
    blend_path = Path(args.source).resolve()
    contract_path = Path(args.contract).resolve()
    missing = [source.file for source in SOURCES if not (source_dir / source.file).is_file()]
    if missing:
        raise RuntimeError(f"Missing Claude GLB source(s): {', '.join(missing)}")

    clear_scene()
    imported = {
        source.key: import_glb(source_dir / source.file, source.key) for source in SOURCES
    }
    roots = build_roots(imported)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    contract = {
        "schemaVersion": 1,
        "sourceKind": "Claude procedural Three.js GLB handoff",
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceFiles": [
            {"file": source.file, "sha256": sha256(source_dir / source.file)}
            for source in SOURCES
        ],
        "roots": [root_contract(root) for root in roots],
    }
    contract_path.parent.mkdir(parents=True, exist_ok=True)
    contract_path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(roots)} candidate roots in {blend_path}")


if __name__ == "__main__":
    main()
