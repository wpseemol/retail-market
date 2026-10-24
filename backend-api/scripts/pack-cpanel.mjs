import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

function run(command) {
  const result = spawnSync(command, { stdio: "inherit", shell: true, env: process.env });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

run("prisma generate");
run("tsc");

const clientPkg = dirname(require.resolve("@prisma/client/package.json"));
const source = join(clientPkg, "..", "..", ".prisma", "client");
if (!existsSync(join(source, "index.js"))) {
  console.error(`Prisma Client was not generated at ${source}`);
  process.exit(1);
}

const dest = "prisma/cpanel-client";
rmSync(dest, { recursive: true, force: true });

function copyClient(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    if (name.endsWith(".dll.node") || name.includes(".tmp")) continue;
    const from = join(fromDir, name);
    const to = join(toDir, name);
    if (statSync(from).isDirectory()) copyClient(from, to);
    else cpSync(from, to);
  }
}

copyClient(source, dest);
const engines = readdirSync(dest).filter((name) => name.endsWith(".so.node"));
if (engines.length === 0) {
  console.error("No Linux query engines were copied. Check binaryTargets in schema.prisma.");
  process.exit(1);
}
console.log(`Linux engines: ${engines.join(", ")}`);

const migrationsDir = "prisma/migrations";
const folders = readdirSync(migrationsDir)
  .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
  .sort();

const adminPassword = "SuperAdmin123!";
const passwordHash = bcrypt.hashSync(adminPassword, 12);
let sql = `SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- Import this once in phpMyAdmin on an empty database.
-- Dashboard login after import: superadmin@niyenin.local / ${adminPassword}
-- Change that password after the first login.

`;

for (const folder of folders) {
  const file = join(migrationsDir, folder, "migration.sql");
  if (!existsSync(file)) continue;
  sql += `\n-- ${folder}\n${readFileSync(file, "utf8").trim()}\n`;
}

sql += `
INSERT INTO \`users\` (
  \`first_name\`, \`last_name\`, \`username\`, \`email\`, \`phone\`, \`password\`,
  \`role\`, \`status\`, \`email_verified_at\`, \`phone_verified_at\`, \`created_at\`, \`updated_at\`
) VALUES (
  'Super', 'Admin', 'superadmin', 'superadmin@niyenin.local', '+8801700000001',
  '${passwordHash}', 'super_admin', 'active', NOW(3), NOW(3), NOW(3), NOW(3)
);

SET FOREIGN_KEY_CHECKS=1;
`;

writeFileSync("prisma/cpanel-import.sql", sql);

const zip = join(root, "..", "niyenin-api.zip");
rmSync(zip, { force: true });
const excludes = ["node_modules", "./.env", "uploads", "package-lock.json", "coverage"];
for (const name of readdirSync(".")) {
  if (name.startsWith("uploads.backup")) excludes.push(name);
}
const excludeArgs = excludes.map((name) => `--exclude=${name}`).join(" ");
run(`tar ${excludeArgs} -a -cf "${zip}" .`);

console.log(`\nZip ready: ${zip}`);
console.log("phpMyAdmin file: prisma/cpanel-import.sql");
