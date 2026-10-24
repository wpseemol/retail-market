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

const from = "prisma/cpanel-client";
if (!existsSync(join(from, "index.js"))) {
  console.error(
    "prisma/cpanel-client is missing. Upload the zip made by npm run pack:cpanel on your PC.",
  );
  process.exit(1);
}

mkdirSync("node_modules/.prisma", { recursive: true });
mkdirSync("uploads", { recursive: true });
cpSync(from, "node_modules/.prisma/client", { recursive: true, force: true });
console.log("Installed the prebuilt Prisma Client for cPanel.");
