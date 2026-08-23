# Unreal MCP Capability Baseline

Verified against the open Unreal 5.8 project
`D:/UnrealProjects/AstraValkRenderLab/AstraValkRenderLab.uproject` on
2026-08-23. These checks were read-only. No asset was created, deleted, moved,
renamed, imported, or saved during capability verification.

| Production area | Callable toolset | Representative verified call |
| --- | --- | --- |
| Actors | `editor_toolset.toolsets.actor.ActorTools` | `find_actors` returned actors from the open world |
| Scene | `editor_toolset.toolsets.scene.SceneTools` | Current level and scene actors were readable |
| Assets | `editor_toolset.toolsets.asset.AssetTools` | `find_assets`, `list_folders`, and plugin content discovery succeeded |
| Static meshes | `editor_toolset.toolsets.static_mesh.StaticMeshTools` | Inspection tools and `import_file` are registered and callable |
| Blueprints | `editor_toolset.toolsets.blueprint.BlueprintTools` | Graph DSL documentation was returned |
| Materials | `editor_toolset.toolsets.material.MaterialTools` | Expression-class discovery succeeded against an engine material |
| Material instances | `editor_toolset.toolsets.material_instance.MaterialInstanceTools` | Parameters were listed from an engine template instance |
| Niagara | `NiagaraToolsets.NiagaraToolset_Assets`, `_System`, `_Component`, `_Blueprint`, `_Info` | Asset discovery plus system and emitter schema calls succeeded |
| Sequencer | `animation_toolset.toolsets.sequencer.SequencerTools` | Current-sequence query succeeded |
| Keyframing | `animation_toolset.toolsets.keyframing.SequencerKeyframingTools` | Selected-channel query succeeded |
| Cameras | `EditorToolset.EditorAppToolset` and Sequencer camera bindings | Active viewport camera transform was returned |
| Automation | `AutomationTestToolset.AutomationTestToolset` | Test-controller status was returned |
| Editor logs | `EditorToolset.LogsToolset` | Log categories and current-session entries were returned |

Additional callable production toolsets include textures, skeletal meshes,
Control Rig, Sequencer Control Rig, Sequencer import/export, UMG, PCG,
Dataflow, physics assets, data assets/tables, curves, gameplay tags, Slate
editor automation, object-property inspection, and programmatic tool
orchestration.

The initial `/Game` registry was empty. Phase 1 created only the folder tree
under `/Game/AstraRenderLab`; `find_assets` still returns no assets there.
