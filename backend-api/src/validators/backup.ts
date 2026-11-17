import { z } from "zod";

/** Backup folder stamp: `YYYY-MM-DD_HHmm` (matches `lib/backup.ts` STAMP_RE). */
export const backupStampSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}_\d{4}$/, "Invalid backup stamp");

export const backupKindSchema = z.enum(["uploads", "database"]);

export const backupDownloadParamsSchema = z.object({
  stamp: backupStampSchema,
  kind: backupKindSchema,
});

export type BackupDownloadParams = z.infer<typeof backupDownloadParamsSchema>;
