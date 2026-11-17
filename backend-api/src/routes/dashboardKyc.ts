import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  ensureKycSettings,
  invalidateKycCache,
  isKycMode,
  isKycProvider,
  kycPaidApiReady,
  parsePartnerTerms,
} from "../lib/kyc.js";
import { revealKycSchema, updateKycSettingsSchema } from "../validators/kycSettings.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { STAFF_DOC_CHECKLIST } from "../lib/sellerApplication.js";

/** Mounted under `/api/dashboard/site-settings/kyc` (super_admin only). */
export const dashboardKycRouter = Router();

function toDashboardDto(row: Awaited<ReturnType<typeof ensureKycSettings>>) {
  return {
    mode: isKycMode(row.mode) ? row.mode : "staff",
    is_enabled: row.is_enabled,
    provider: row.provider,
    has_api_key: Boolean(row.api_key_enc),
    api_base_url: row.api_base_url,
    ready: row.mode === "staff" || kycPaidApiReady(row),
    partner_terms: parsePartnerTerms(row.partner_terms),
    staff_checklist: STAFF_DOC_CHECKLIST,
    updated_at: row.updated_at.toISOString(),
  };
}

dashboardKycRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const row = await ensureKycSettings();
    return res.json({ kyc: toDashboardDto(row) });
  }),
);

dashboardKycRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateKycSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = await ensureKycSettings();
    const input = parsed.data;

    const next = {
      mode: input.mode ?? (isKycMode(existing.mode) ? existing.mode : "staff"),
      is_enabled: input.is_enabled ?? existing.is_enabled,
      provider:
        input.provider !== undefined ? input.provider : existing.provider,
      api_key_enc:
        input.api_key !== undefined
          ? input.api_key === null
            ? null
            : encryptSecret(input.api_key)
          : existing.api_key_enc,
      api_base_url:
        input.api_base_url !== undefined
          ? input.api_base_url
          : existing.api_base_url,
      partner_terms:
        input.partner_terms !== undefined
          ? (input.partner_terms as unknown as Prisma.InputJsonValue)
          : (existing.partner_terms as Prisma.InputJsonValue | null),
    };

    if (next.provider && !isKycProvider(next.provider)) {
      return res.status(400).json({
        message: "Unknown KYC provider",
        code: "KYC_PROVIDER_INVALID",
      });
    }

    const errors: Record<string, string[]> = {};
    if (next.mode === "paid_api" && next.is_enabled) {
      if (!next.provider) errors.provider = ["Provider is required for paid KYC"];
      if (!next.api_key_enc) errors.api_key = ["API key is required for paid KYC"];
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Add provider and API key before enabling paid KYC",
        code: "KYC_INCOMPLETE",
        errors,
      });
    }

    const row = await prisma.kycSettings.update({
      where: { id: 1 },
      data: {
        mode: next.mode,
        is_enabled: next.is_enabled,
        provider: next.provider,
        api_key_enc: next.api_key_enc,
        api_base_url: next.api_base_url,
        partner_terms: next.partner_terms ?? undefined,
        updated_by: actorId,
      },
    });
    invalidateKycCache();

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "kyc_settings_updated",
        changes: {
          mode: { from: existing.mode, to: row.mode },
          is_enabled: { from: existing.is_enabled, to: row.is_enabled },
          provider: {
            from: existing.provider ?? null,
            to: row.provider ?? null,
          },
          api_key: {
            from: existing.api_key_enc ? "set" : "empty",
            to: row.api_key_enc ? "updated" : "removed",
          },
        } as Prisma.InputJsonValue,
      },
    }).catch(() => undefined);

    return res.json({
      message: "KYC settings saved",
      kyc: toDashboardDto(row),
    });
  }),
);

dashboardKycRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealKycSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const ok = await confirmActorPassword(req.auth!.userId, parsed.data.password);
    if (!ok) {
      return res.status(403).json({ message: "Password incorrect", code: "BAD_PASSWORD" });
    }
    const row = await ensureKycSettings();
    return res.json({
      secrets: {
        api_key: decryptSecret(row.api_key_enc),
        provider: row.provider,
        api_base_url: row.api_base_url,
        mode: row.mode,
      },
    });
  }),
);
