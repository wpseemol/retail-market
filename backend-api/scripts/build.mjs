import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const execPath = process.execPath.replaceAll("\\", "/");
const skip = String(process.env.PRISMA_SKIP_POSTINSTALL_GENERATE || "").toLowerCase();
const onCpanel =
  execPath.includes("/nodevenv/") ||
  execPath.includes("/alt-nodejs") ||
  skip === "1" ||
  skip === "true" ||
  skip === "yes";

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

if (onCpanel) {
  run("node scripts/install-cpanel-client.mjs");
  if (existsSync("node_modules/typescript/lib/tsc.js")) {
    run("tsc");
  } else if (existsSync("dist/server.js")) {
    console.log("Using the dist folder shipped in the zip.");
  } else {
    console.error("dist/server.js is missing. Pack the zip again on your PC with npm run pack:cpanel.");
    process.exit(1);
  }
} else {
  run("prisma generate && tsc");
}
