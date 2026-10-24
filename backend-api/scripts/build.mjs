import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const clientPath = "node_modules/.prisma/client/index.js";

// cPanel's "Run JS script" uses the nodevenv binary and a memory cap that
// cannot start Prisma's schema-engine WebAssembly module.
const onCpanel = process.execPath.replaceAll("\\", "/").includes("/nodevenv/");

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
  if (!existsSync(clientPath)) {
    console.error(`Prisma Client is missing (${clientPath}).

Generate it over SSH, then compile. Activate the virtualenv shown on
Setup Node.js App, cd to this application root, and run:

  npx prisma generate
  npx prisma migrate deploy
  npm run build

cPanel's Run JS script and the web terminal stop while loading
node_modules/prisma/build/index.js (the log ends near __wbindgen_start).
That process needs more memory than those tools allow. SSH has the room.
`);
    process.exit(1);
  }
  console.log("cPanel detected: Prisma Client is already generated, running tsc.");
  run("tsc");
} else {
  run("prisma generate && tsc");
}
