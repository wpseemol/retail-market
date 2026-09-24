import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = readFileSync(
  path.join(root, "dashboard/src/lib/categoryIcons.ts"),
  "utf8",
);

// Prefer existing shared JSON if present; otherwise extract from legacy TS.
let items;
const sharedPath = path.join(root, "shared/category-icons.json");
try {
  items = JSON.parse(readFileSync(sharedPath, "utf8"));
} catch {
  const re =
    /\{\s*name:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*group:\s*"([^"]+)",\s*Icon:\s*\w+\s*\}/g;
  items = [];
  let m;
  while ((m = re.exec(src))) {
    items.push({ name: m[1], label: m[2], group: m[3] });
  }
}

mkdirSync(path.join(root, "shared"), { recursive: true });
mkdirSync(path.join(root, "backend/src/data"), { recursive: true });
mkdirSync(path.join(root, "dashboard/src/lib/icons"), { recursive: true });

const json = JSON.stringify(items, null, 2);
writeFileSync(sharedPath, json);
writeFileSync(path.join(root, "backend/src/data/category-icons.json"), json);
writeFileSync(
  path.join(root, "dashboard/src/lib/icons/category-icons.json"),
  json,
);
console.log("synced icons", items.length);
