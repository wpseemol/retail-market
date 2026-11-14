/**
 * Create a dated backup under backups/<YYYY-MM-DD_HHmm>/:
 *   uploads-<stamp>.zip
 *   database-<stamp>.sql.zip
 *   manifest.json
 *
 *   pnpm backup
 *   pnpm --filter backend-api backup
 *
 * Prefer this from system crontab on Spaceship/Passenger (process may sleep):
 *   0 3 * * * cd /path/to/backend-api && /usr/bin/node --import tsx scripts/run-backup.ts
 * Or after build: node -e "import('./dist/…')" — use `pnpm backup` with tsx locally.
 */
import "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { runBackup } from "../src/lib/backup.js";

async function main() {
  const manifest = await runBackup();
  console.log(JSON.stringify(manifest, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
