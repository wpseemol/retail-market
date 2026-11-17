import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  ensureRecaptchaSettings,
  invalidateRecaptchaCache,
  isRecaptchaVersion,
  recaptchaReady,
} from "../lib/recaptcha.js";
import {
  revealRecaptchaSchema,
  updateRecaptchaSchema,
} from "../validators/recaptcha.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/recaptcha` (super_admin only). */
export const dashboardRecaptchaRouter = Router();

function toDashboardDto(
  row: Awaited<ReturnType<typeof ensureRecaptchaSettings>>,
) {
  const version = isRecaptchaVersion(row.version) ? row.version : "v2";
  const hasSecret = Boolean(row.secret_key_enc);
  const ready = recaptchaReady(row);
  return {
    is_enabled: row.is_enabled,
    version,
    site_key: row.site_key ?? null,
    has_site_key: Boolean(row.site_key?.trim()),
    has_secret_key: hasSecret,
    v3_min_score: row.v3_min_score,
    ready,
    updated_at: row.updated_at.toISOString(),
  };
}

dashboardRecaptchaRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const row = await ensureRecaptchaSettings();
    return res.json({ recaptcha: toDashboardDto(row) });
  }),
);

dashboardRecaptchaRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateRecaptchaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = await ensureRecaptchaSettings();
    const input = parsed.data;

    const next = {
      is_enabled: input.is_enabled ?? existing.is_enabled,
      version: input.version ?? (isRecaptchaVersion(existing.version) ? existing.version : "v2"),
      site_key:
        input.site_key !== undefined ? input.site_key : existing.site_key,
      secret_key_enc:
        input.secret_key !== undefined
          ? input.secret_key === null
            ? null
            : encryptSecret(input.secret_key)
          : existing.secret_key_enc,
      v3_min_score:
        input.v3_min_score !== undefined
          ? input.v3_min_score
          : existing.v3_min_score,
    };

    const errors: Record<string, string[]> = {};
    if (next.is_enabled && !next.site_key?.trim()) {
      errors.site_key = ["Site key is required before enabling reCAPTCHA"];
    }
    if (next.is_enabled && !next.secret_key_enc) {
      errors.secret_key = ["Secret key is required before enabling reCAPTCHA"];
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Add site key and secret key before enabling reCAPTCHA",
        code: "RECAPTCHA_INCOMPLETE",
        errors,
      });
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (next.is_enabled !== existing.is_enabled) {
      changes.is_enabled = { from: existing.is_enabled, to: next.is_enabled };
    }
    if (next.version !== existing.version) {
      changes.version = { from: existing.version, to: next.version };
    }
    if (next.v3_min_score !== existing.v3_min_score) {
      changes.v3_min_score = {
        from: existing.v3_min_score,
        to: next.v3_min_score,
      };
    }
    if ((existing.site_key ?? null) !== (next.site_key ?? null)) {
      changes.site_key = {
        from: existing.site_key ? "set" : "empty",
        to: next.site_key ? "updated" : "removed",
      };
    }
    if ((existing.secret_key_enc ?? null) !== (next.secret_key_enc ?? null)) {
      changes.secret_key = {
        from: existing.secret_key_enc ? "set" : "empty",
        to: next.secret_key_enc ? "updated" : "removed",
      };
    }

    const row = await prisma.recaptchaSettings.update({
      where: { id: 1 },
      data: {
        ...next,
        updated_by: actorId,
      },
    });
    invalidateRecaptchaCache();

    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "recaptcha_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({
      message: "reCAPTCHA settings saved",
      recaptcha: toDashboardDto(row),
    });
  }),
);

dashboardRecaptchaRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealRecaptchaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const guard = await confirmActorPassword(actorId, parsed.data.password);
    if (!guard.ok) return res.status(guard.status).json(guard.body);

    const row = await ensureRecaptchaSettings();

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "recaptcha_secrets_revealed",
        note: "reCAPTCHA credentials viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      secrets: {
        site_key: row.site_key ?? null,
        secret_key: decryptSecret(row.secret_key_enc),
        version: isRecaptchaVersion(row.version) ? row.version : "v2",
        v3_min_score: row.v3_min_score,
      },
    });
  }),
);
