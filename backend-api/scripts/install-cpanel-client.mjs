import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const execPath = process.execPath.replaceAll("\\", "/");
const skip = String(process.env.PRISMA_SKIP_POSTINSTALL_GENERATE || "").toLowerCase();
const onCpanel =
  execPath.includes("/nodevenv/") ||
  execPath.includes("/alt-nodejs") ||
  skip === "1" ||
  skip === "true" ||
  skip === "yes";

if (!onCpanel) process.exit(0);

const from = join(root, "prisma/cpanel-client");
if (!existsSync(join(from, "index.js"))) {
  console.error("prisma/cpanel-client is missing from " + root);
  process.exit(1);
}

function venvNodeModules() {
  const parts = execPath.split("/");
  const marker = parts.indexOf("nodevenv");
  if (marker < 0) return null;
  const versionAt = parts.findIndex((part, index) => index > marker && /^\d+$/.test(part));
  if (versionAt < 0) return null;
  return parts.slice(0, versionAt + 1).join("/") + "/lib/node_modules";
}

const venvModules = venvNodeModules();
const destRoot = venvModules && existsSync(venvModules) ? venvModules : join(root, "node_modules");
const dest = join(destRoot, ".prisma", "client");
mkdirSync(dirname(dest), { recursive: true });
mkdirSync(join(root, "uploads"), { recursive: true });
cpSync(from, dest, { recursive: true, force: true });
console.log("Installed the prebuilt Prisma Client at " + dest);
