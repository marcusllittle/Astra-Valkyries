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

  for (const key of ["map", "sequence"]) {
    const value = output.unreal?.[key];
    if (!value?.startsWith("/Game/AstraRenderLab/")) {
      errors.push(`${output.id}: unreal.${key} is outside /Game/AstraRenderLab`);
    }
  }
  if (!statuses.has(output.unreal?.status)) errors.push(`${output.id}: invalid status`);
  if (!output.delivery?.hd?.startsWith("https://media.joinhavn.io/astra/")) {
    errors.push(`${output.id}: delivery.hd must use media.joinhavn.io/astra`);
  }
  if (output.delivery?.localFallback && !output.delivery.localFallback.startsWith("/assets/")) {
    errors.push(`${output.id}: localFallback must be an /assets path`);
  } else if (output.delivery?.localFallback) {
    const fallbackUrl = new URL(`../../public${output.delivery.localFallback}`, import.meta.url);
    try {
      await access(fallbackUrl);
    } catch {
      errors.push(`${output.id}: localFallback does not exist: ${output.delivery.localFallback}`);
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
