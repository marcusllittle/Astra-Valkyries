# Phase 9 Runtime And Release Audit

Verified on 2026-08-25 against current Astra and AstraValkRenderLab `main`.

Phase 9 adds the delivery boundary between Unreal output and Astra without
adding Unreal to the shipping runtime. The manifest currently contains 48
destinations: 45 are in progress, two are rejected, one is planned, and zero
are approved or integrated. The generated runtime catalog is therefore empty,
and every current app asset remains unchanged.

## Runtime contract

`tools/unreal/generate_runtime_media_catalog.mjs` emits only `approved` and
`integrated` entries into `src/generated/renderMediaCatalog.ts`. Every emitted
entry must have an HD URL and compact packaged fallback. `getApprovedRenderMedia`
selects HD media by default, exposes the fallback for load failure, and can
select packaged media directly for offline use. The generator runs before each
production web build, while `validate:runtime-media` detects stale checked-in
catalogs.

Electron packaging skips native dependency rebuilding because Astra's runtime
does not use a native Node module; optional WebSocket accelerators retain their
JavaScript fallback. `ASTRA_ELECTRON_DEBUG_PORT` enables CDP only when explicitly
set for package smoke testing and has no effect in normal launches.

## Verification

- Render manifest: 48 outputs cover all 15 routed screens.
- Runtime catalog: zero approved outputs, matching the manifest.
- Unit tests: 20 files and 150 tests pass.
- Vite production build: passes. The existing large-chunk warning remains.
- Browser: desktop and `390x844` mobile load without page errors, overlays, or
  horizontal overflow; start-to-menu navigation works.
- Electron: Windows x64 unpacked app and NSIS installer build successfully.
  The packaged `file://` app opens and renders through CDP without page errors.
- Capacitor: Android project generation and sync pass; Gradle `assembleDebug`
  produces `app-debug.apk`. The native directory and APK are ignored build
  artifacts. `npm run mobile:build:android` reproduces the build on Windows.
  iOS compilation requires macOS and Xcode and was not run here.

Full repository lint still reports 21 pre-existing errors in dialogue, wallet,
context, briefing, collection, leaderboard, and gameplay modules. Targeted
lint for all Phase 9 TypeScript and Node files passes. Those unrelated baseline
issues are not changed by this release slice.
