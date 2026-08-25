# Phase 6 Collection Presentation Audit

Verified through Unreal MCP, Movie Render Queue, and in-app browser review on
2026-08-25 against `D:/UnrealProjects/AstraValkRenderLab`.

Phase 6 establishes reusable gacha, collection, and dossier render sources. It
also upgrades the shipping Collection and Shop preview experience to use the
existing outfit motion assets. No Unreal proof replaces current character,
boss, or enemy art in this pass.

## Runtime audit

- Shop already plays an outfit-specific cut-in for SR pulls and the full outfit
  cutscene for SSR pulls. The old standalone SSR fallback was not referenced by
  the runtime.
- Collection card art is strong, but its preview duplicated the card inside a
  small modal and disabled motion.
- Codex entries resolve authored close-up images from `lore.ts`; the Unreal
  override map remains intentionally empty until a render wins visual review.
- The Render Lab does not yet contain production pilot/outfit geometry, so a
  useful Collection turntable cannot be rendered honestly.

The React integration replaces the duplicated Shop/Collection card modal with
one responsive media viewer. It autoplays each outfit's existing portrait
cutscene, retains the still as poster/fallback, and presents pilot, kit,
calibration, shard, and acquisition state without changing progression logic.

## Unreal assets

Build or refresh the Phase 6 content with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_build_phase6_collection.py"
```

Owned maps:

- `/Game/AstraRenderLab/Maps/Stages/L_GachaStage`
- `/Game/AstraRenderLab/Maps/Stages/L_CollectionStage`
- `/Game/AstraRenderLab/Maps/Stages/L_DossierStage`

Owned sequences:

- `LS_GachaReveal_SSR`
- `LS_CollectionTurntable_Template`
- `LS_Dossier_AegisDreadnought`
- `LS_Dossier_HeliosTyrant`
- `LS_Dossier_CryoLeviathan`
- `LS_Dossier_Enemy_Drifter`
- `LS_Dossier_Enemy_Dreadnought`

The slice also includes three stage wrappers, `MI_Gacha_SSR_Energy`,
`NS_GachaReveal_SSR`, and `BP_GachaReveal_SSR_FX` under the Phase 6-owned
Collection folders.

## MCP verification

- `BP_Astra_GachaStage`, `BP_Astra_CollectionStage`,
  `BP_Astra_DossierStage`, and `BP_GachaReveal_SSR_FX` compile with warnings
  treated as errors.
- `NS_GachaReveal_SSR` reports `UpToDate`; all Niagara scripts are clean.
- `LS_GachaReveal_SSR` runs at 24 fps over frames `0-48` and has six explicit
  bindings after removing inherited Helios boss geometry.
- Its reveal energy and burst have keyed location and scale at start, charge,
  and impact frames.
- `LS_CollectionTurntable_Template` runs at 30 fps over frames `0-180`.
- All five dossier sequences run at 24 fps over frames `0-144`.
- Only Phase 6-owned assets were saved and copied into source control.

## Visual gate

Render the comparison set with:

```text
py "D:/UnrealProjects/AstraValkRenderLab/Content/Python/astra_mrq_sample_phase6_collection.py"
```

The sampler produced nine proof frames under
`Saved/AstraRenders/phase6-collection-proof-1080p`: three 1920x1080 gacha
frames, one empty Collection studio frame, and five 4K dossiers.

- The gacha pass reads as a blue energy chamber and can support a future
  character reveal, but it is not strong enough as a standalone replacement.
- The Collection stage renders black by design because no placeholder pilot is
  allowed to masquerade as production character geometry.
- Aegis, Helios, Cryo, Drifter, and Dreadnought are less detailed and less
  legible than their current Codex close-ups.

Keep all current Codex art and outfit cutscenes. Resume Collection turntables
after production pilot geometry arrives; revisit dossiers after material,
lighting, and camera passes produce a clearly superior real-size comparison.
