// One-shot: regenerate known-missing-assets.json from the current tree.
const { readFileSync, readdirSync, statSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");

const RE = /["'`(](\/assets\/[A-Za-z0-9_\-./]+\.(?:png|webp|jpg|jpeg|gif|svg|mp4|webm|mp3|wav|ogg))["'`)]/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx|json|css)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const missing = new Set();
let total = 0;
for (const file of walk("src")) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(RE)) {
    total += 1;
    if (!existsSync(join("public", m[1]))) missing.add(m[1]);
  }
}
const sorted = [...missing].sort();
writeFileSync("known-missing-assets.json", JSON.stringify(sorted, null, 2) + "\n");
console.log("total refs:", total, "| unique missing:", sorted.length);
for (const p of sorted) console.log("  MISSING", p);
