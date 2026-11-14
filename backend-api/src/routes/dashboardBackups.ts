import { createReadStream } from "node:fs";
import type { Response } from "express";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import {
  isValidBackupStamp,
  listBackups,
  resolveBackupFile,
  runBackup,
  type BackupKind,
} from "../lib/backup.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardBackupsRouter = Router();

/** Every backup route is super_admin only. Download re-checks the DB role. */
dashboardBackupsRouter.use(requireAuth, requireRoles("super_admin"));

/**
 * Re-load the user from the DB and confirm they are still an active super_admin.
 * JWT role alone is not enough for downloading backup archives.
 */
async function assertActiveSuperAdmin(userId: bigint, res: Response) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    select: { id: true, role: true, status: true },
  });
  if (!user) {
    res.status(401).json({ message: "User not found", code: "AUTH_REQUIRED" });
    return null;
  }
  if (user.status !== "active") {
    res.status(403).json({ message: `Account is ${user.status}`, code: "ACCOUNT_INACTIVE" });
    return null;
  }
  if (user.role !== "super_admin") {
    res.status(403).json({
      message: "Only an active super admin can download backups",
      code: "SUPER_ADMIN_REQUIRED",
    });
    return null;
  }
  return user;
}

dashboardBackupsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const backups = await listBackups();
    res.json({
      backups,
      config: {
        enabled: env.backup.enabled,
        cron: env.backup.cron,
        retention_days: env.backup.retentionDays,
        dir: env.backup.dir,
      },
    });
  }),
);

dashboardBackupsRouter.post(
  "/run",
  asyncHandler(async (req, res) => {
    const ok = await assertActiveSuperAdmin(req.auth!.userId, res);
    if (!ok) return;

    try {
      const manifest = await runBackup();
      res.status(201).json({ message: "Backup created", backup: manifest });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backup failed";
      const status = message.includes("already running") || message.includes("already exists") ? 409 : 500;
      res.status(status).json({
        message,
        code: status === 409 ? "BACKUP_IN_PROGRESS" : "BACKUP_FAILED",
      });
    }
  }),
);

dashboardBackupsRouter.get(
  "/:stamp/:kind",
  asyncHandler(async (req, res) => {
    const ok = await assertActiveSuperAdmin(req.auth!.userId, res);
    if (!ok) return;

    const stamp = String(req.params.stamp ?? "");
    const kind = String(req.params.kind ?? "") as BackupKind;
    if (!isValidBackupStamp(stamp)) {
      return res.status(400).json({ message: "Invalid backup stamp", code: "INVALID_STAMP" });
    }
    if (kind !== "uploads" && kind !== "database") {
      return res.status(400).json({
        message: "kind must be uploads or database",
        code: "INVALID_KIND",
      });
    }

    const file = await resolveBackupFile(stamp, kind);
    if (!file) {
      return res.status(404).json({ message: "Backup file not found", code: "BACKUP_NOT_FOUND" });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", String(file.bytes));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName}"`,
    );
    createReadStream(file.absolute).pipe(res);
  }),
);
