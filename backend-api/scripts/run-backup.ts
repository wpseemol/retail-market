/**
 * Create a dated backup under backups/<YYYY-MM-DD_HHmm>/:
 *   uploads-<stamp>.zip
 *   database-<stamp>.sql.zip
 *   manifest.json
 *
 *   pnpm backup
 *   pnpm backup -- --notify   # also inbox-notify every super_admin (use from crontab)
 *
 * Monthly system crontab example (1st of month 03:00 UTC):
 *   0 3 1 * * cd /path/to/backend-api && pnpm backup -- --notify
 */
import "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { runBackup } from "../src/lib/backup.js";
import { notifySuperAdminsBackupCron } from "../src/lib/notifications.js";

const notify = process.argv.includes("--notify");

async function main() {
  try {
    const manifest = await runBackup();
    console.log(JSON.stringify(manifest, null, 2));
    if (notify) {
      await notifySuperAdminsBackupCron({
        ok: true,
        stamp: manifest.stamp,
        uploadsBytes: manifest.uploads.bytes,
        databaseBytes: manifest.database.bytes,
      });
      console.log("[backup] Notified super admins");
    }
  } catch (err) {
    if (notify) {
      await notifySuperAdminsBackupCron({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
