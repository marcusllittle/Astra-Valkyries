import { access, readFile } from "node:fs/promises";

const manifestUrl = new URL("./render-manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

const routedScreens = [
  "home",
  "hangar",
  "shmup",
  "shmup-results",
  "shop",
  "collection",
  "settings",
  "leaderboard",
  "briefing",
  "video-cutscene",
  "codex",
  "spaceport",
  "missions",
  "skills",
  "network",
];
const statuses = new Set(["planned", "in-progress", "approved", "integrated", "rejected"]);
const routedScreenSet = new Set(routedScreens);
const ids = new Set();
const coveredScreens = new Set();
const errors = [];
const transitionFallbacks = new Set([
  "/assets/cutins/nova/nova_leaving_port.mp4",
  "/assets/cutins/nova/nova_return_to_port.mp4",
  "/assets/cutins/ships/astra_interceptor_launch.mp4",
]);

if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (manifest.project?.contentRoot !== "/Game/AstraRenderLab") {
  errors.push("project.contentRoot must be /Game/AstraRenderLab");
}

if (!Array.isArray(manifest.outputs) || manifest.outputs.length === 0) {
  errors.push("outputs must be a non-empty array");
}

for (const output of manifest.outputs ?? []) {
  if (!output.id || ids.has(output.id)) errors.push(`duplicate or missing output id: ${output.id}`);
  ids.add(output.id);
  for (const screen of output.screens ?? []) {
    if (!routedScreenSet.has(screen)) errors.push(`${output.id}: unknown screen: ${screen}`);
    coveredScreens.add(screen);
  }

  for (const key of ["map", "sequence", "renderPreset"]) {
    const value = output.unreal?.[key];
    if (!value?.startsWith("/Game/AstraRenderLab/")) {
      errors.push(`${output.id}: unreal.${key} is outside /Game/AstraRenderLab`);
    }
  }
  for (const preset of output.unreal?.alternateRenderPresets ?? []) {
    if (!preset.startsWith("/Game/AstraRenderLab/")) {
      errors.push(`${output.id}: alternate render preset is outside /Game/AstraRenderLab`);
    }
  }
  if (!statuses.has(output.unreal?.status)) errors.push(`${output.id}: invalid status`);
  if (output.provenance) {
    if (!output.provenance.sourceType) errors.push(`${output.id}: provenance.sourceType is required`);
    if (output.provenance.sourceType === "marketplace" && !output.provenance.package) {
      errors.push(`${output.id}: marketplace provenance requires package`);
    }
    if (output.provenance.sourceType === "marketplace" && !output.provenance.license) {
      errors.push(`${output.id}: marketplace provenance requires license`);
    }
  }
  if (output.render?.resolution && !/^\d+x\d+$/.test(output.render.resolution)) {
    errors.push(`${output.id}: render.resolution must use WIDTHxHEIGHT`);
  }
  if (output.integration?.destination?.includes("environment") && transitionFallbacks.has(output.delivery?.localFallback)) {
    errors.push(`${output.id}: transition video cannot be used as an environment fallback`);
  }
  if (!output.delivery?.hd?.startsWith("https://media.joinhavn.io/astra/")) {
    errors.push(`${output.id}: delivery.hd must use media.joinhavn.io/astra`);
  }
  for (const key of ["localAsset", "poster", "localFallback"]) {
    const localPath = output.delivery?.[key];
    if (!localPath) continue;
    if (!localPath.startsWith("/assets/")) {
      errors.push(`${output.id}: delivery.${key} must be an /assets path`);
      continue;
    }
    const assetUrl = new URL(`../../public${localPath}`, import.meta.url);
    try {
      await access(assetUrl);
    } catch {
      errors.push(`${output.id}: delivery.${key} does not exist: ${localPath}`);
    }
  }
  if (output.unreal?.status === "integrated" && !output.delivery?.localAsset) {
    errors.push(`${output.id}: integrated output requires delivery.localAsset`);
  }
  if (["approved", "integrated"].includes(output.unreal?.status)) {
    const compactFallback =
      output.delivery?.localFallback ?? output.delivery?.localAsset ?? output.delivery?.poster;
    if (!compactFallback) {
      errors.push(`${output.id}: approved output requires a compact local fallback`);
    }
  }
}

for (const screen of routedScreens) {
  if (!coveredScreens.has(screen)) errors.push(`screen has no render destination: ${screen}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Render manifest valid: ${ids.size} outputs cover ${coveredScreens.size} screens.`);
}
