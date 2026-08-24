"""Export existing Astra Blender geometry as deterministic Unreal-ready FBX files."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import bpy
from mathutils import Matrix


@dataclass(frozen=True)
class ExportTarget:
    asset_name: str
    source_kind: str
    source_name: str
    normalize_root: bool = False
    assembly_location_cm: tuple[float, float, float] | None = None


PROFILES: dict[str, tuple[ExportTarget, ...]] = {
    "launch-v2": (
        ExportTarget("SM_AstraInterceptor", "root", "Astra Interceptor Hero"),
        ExportTarget("SM_LaunchDeck", "root", "Launch deck environment"),
        ExportTarget("SM_AstraOrbitalWorld", "object", "Astra orbital world"),
    ),
    "weapon-vfx": tuple(
        ExportTarget(
            f"SM_Projectile_{family.title()}_{tier.upper()}",
            "collection",
            f"Projectile {family.title()} {tier.upper()}",
        )
        for family in ("lance", "pulse", "blade", "missile")
        for tier in ("common", "rare", "sr", "ssr")
    )
    + (
        ExportTarget("SM_WeaponTrail", "collection", "Weapon Trail"),
        ExportTarget("SM_WeaponMuzzle", "collection", "Weapon Muzzle"),
        ExportTarget("SM_WeaponImpact", "collection", "Weapon Impact"),
    ),
    "secondary-boss-vfx": (
        ExportTarget("SM_SecondaryBurst", "collection", "Secondary Burst"),
        ExportTarget("SM_SecondaryShield", "collection", "Secondary Shield"),
        ExportTarget("SM_SecondarySigil", "collection", "Secondary Sigil"),
        ExportTarget("SM_SecondaryTarget", "collection", "Secondary Target"),
        ExportTarget("SM_BossWarningRing", "collection", "Boss Warning Ring"),
        ExportTarget("SM_BossLaserLane", "collection", "Boss Laser Lane"),
        ExportTarget("SM_BossTarget", "collection", "Boss Target"),
    ),
    "aegis-boss": (
        ExportTarget(
            "SM_Aegis_Core",
            "root",
            "Aegis_Core",
            normalize_root=True,
            assembly_location_cm=(0, 0, 0),
        ),
        ExportTarget(
            "SM_Aegis_LeftArm",
            "root",
            "Aegis_LeftArm",
            normalize_root=True,
            assembly_location_cm=(-3600, 0, 0),
        ),
        ExportTarget(
            "SM_Aegis_RightArm",
            "root",
            "Aegis_RightArm",
            normalize_root=True,
            assembly_location_cm=(3600, 0, 0),
        ),
    ),
}


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=tuple(PROFILES), required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args(blender_args)


def descendants(root: bpy.types.Object) -> set[bpy.types.Object]:
    found = {root}
    pending = list(root.children)
    while pending:
        child = pending.pop()
        if child in found:
            continue
        found.add(child)
        pending.extend(child.children)
    return found


def collection_objects(collection: bpy.types.Collection) -> set[bpy.types.Object]:
    found = set(collection.all_objects)
    for child in collection.children_recursive:
        found.update(child.all_objects)
    return found


def resolve_objects(target: ExportTarget) -> set[bpy.types.Object]:
    if target.source_kind == "collection":
        collection = bpy.data.collections.get(target.source_name)
        if collection is None:
            raise RuntimeError(f"Missing collection: {target.source_name}")
        return collection_objects(collection)

    obj = bpy.data.objects.get(target.source_name)
    if obj is None:
        raise RuntimeError(f"Missing object: {target.source_name}")
    return descendants(obj) if target.source_kind == "root" else {obj}


def export_target(target: ExportTarget, output_dir: Path) -> dict[str, object]:
    objects = resolve_objects(target)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)

    output_path = output_dir / f"{target.asset_name}.fbx"
    root = bpy.data.objects.get(target.source_name) if target.normalize_root else None
    original_matrix = root.matrix_world.copy() if root else None
    try:
        if root:
            root.matrix_world = Matrix.Identity(4)
            bpy.context.view_layer.update()
        bpy.ops.export_scene.fbx(
            filepath=str(output_path),
            use_selection=True,
            object_types={"EMPTY", "MESH"},
            use_mesh_modifiers=True,
            mesh_smooth_type="SMOOTH_GROUP",
            apply_unit_scale=True,
            # Bake Blender meters to FBX centimeters. Unreal's MCP FbxFactory
            # ignores the equivalent unit scale when it is stored as FBX metadata.
            apply_scale_options="FBX_SCALE_NONE",
            axis_forward="-Y",
            axis_up="Z",
            bake_anim=False,
            path_mode="AUTO",
        )
    finally:
        if root and original_matrix:
            root.matrix_world = original_matrix
            bpy.context.view_layer.update()
    return {
        "assetName": target.asset_name,
        "file": output_path.name,
        "bytes": output_path.stat().st_size,
        "sourceKind": target.source_kind,
        "sourceName": target.source_name,
        "objectCount": len(objects),
        "pivotNormalized": target.normalize_root,
        "assemblyLocationCm": target.assembly_location_cm,
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    source = Path(args.source).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if Path(bpy.data.filepath).resolve() != source:
        raise RuntimeError(
            "The open Blender file does not match --source. "
            "Pass the .blend file before --background when launching Blender."
        )

    exports = [export_target(target, output_dir) for target in PROFILES[args.profile]]
    metadata = {
        "schemaVersion": 1,
        "profile": args.profile,
        "source": source.name,
        "sourceSha256": sha256(source),
        "blenderVersion": bpy.app.version_string,
        "generatedAt": datetime.now(UTC).isoformat(),
        "coordinateContract": {
            "sourceUnits": "meters",
            "format": "Autodesk FBX binary",
            "forwardAxis": "-Y",
            "upAxis": "+Z",
            "unrealUnits": "centimeters",
        },
        "exports": exports,
    }
    (output_dir / "exports.json").write_text(
        json.dumps(metadata, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Exported {len(exports)} Unreal source assets to {output_dir}")


if __name__ == "__main__":
    main()
