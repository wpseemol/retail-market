import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { maskPhone } from "../lib/phone.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  SMS_PROVIDERS,
  SMS_REQUIRED_FIELDS,
  getActiveSmsConfig,
  invalidateSmsGatewayCache,
  isRowReady,
  sendViaGateway,
  type SmsProvider,
} from "../lib/smsGateway.js";
import {
  revealSmsSecretsSchema,
  testSmsSchema,
  updateSmsGatewaySchema,
} from "../validators/smsGateway.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/sms-gateway` (super_admin only). */
export const dashboardSmsGatewayRouter = Router();

type Row = Awaited<ReturnType<typeof prisma.smsGatewayProvider.findMany>>[number];

const TEST_COOLDOWN_MS = 30_000;
const lastTestAt = new Map<string, number>();

function toDashboardProvider(provider: SmsProvider, row: Row | undefined) {
  // Credential values are only returned by POST /reveal (password re-auth).
  return {
    provider,
    is_active: row?.is_active ?? false,
    has_api_key: Boolean(row?.api_key_enc),
    has_sender_id: Boolean(row?.sender_id),
    has_account_sid: Boolean(row?.account_sid),
    ready: isRowReady(provider, row),
    updated_at: row?.updated_at.toISOString() ?? null,
  };
}

async function loadState() {
  const rows = await prisma.smsGatewayProvider.findMany();
  const map = new Map(rows.map((r) => [r.provider, r]));
  const active = rows.find((r) => r.is_active)?.provider ?? null;
  return {
    active_provider: active,
    /** No dashboard gateway active, but SMS_PROVIDER in .env still sends real SMS. */
    env_fallback: !active && env.sms.provider !== "console",
    providers: Object.fromEntries(
      SMS_PROVIDERS.map((p) => [p, toDashboardProvider(p, map.get(p))]),
    ) as Record<SmsProvider, ReturnType<typeof toDashboardProvider>>,
  };
}

dashboardSmsGatewayRouter.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await loadState())),
);

dashboardSmsGatewayRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateSmsGatewaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = new Map(
      (await prisma.smsGatewayProvider.findMany()).map((r) => [r.provider, r]),
    );
    const currentActive = [...existing.values()].find((r) => r.is_active)?.provider ?? null;
    const nextActive =
      parsed.data.active_provider !== undefined ? parsed.data.active_provider : currentActive;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const writes: Prisma.SmsGatewayProviderUncheckedCreateInput[] = [];
    const errors: Record<string, string[]> = {};

    for (const provider of SMS_PROVIDERS) {
      const input = parsed.data[provider];
      const row = existing.get(provider);
      const isActive = nextActive === provider;
      if (!input && !row && !isActive) continue;

      const next = {
        is_active: isActive,
        api_key_enc:
          input?.api_key !== undefined
            ? input.api_key === null
              ? null
              : encryptSecret(input.api_key)
            : (row?.api_key_enc ?? null),
        sender_id: input?.sender_id !== undefined ? input.sender_id : (row?.sender_id ?? null),
        account_sid:
          input && "account_sid" in input && input.account_sid !== undefined
            ? input.account_sid
            : (row?.account_sid ?? null),
      };

      if (isActive) {
        const has = {
          api_key: Boolean(next.api_key_enc),
          sender_id: Boolean(next.sender_id),
          account_sid: Boolean(next.account_sid),
        };
        for (const field of SMS_REQUIRED_FIELDS[provider]) {
          if (!has[field]) errors[`${provider}.${field}`] = ["Required before activating this gateway"];
        }
      }

      // History is visible without re-auth, so never log credential values.
      const tracked = [
        ["sender_id", row?.sender_id ?? null, next.sender_id],
        ["account_sid", row?.account_sid ?? null, next.account_sid],
        ["api_key", row?.api_key_enc ?? null, next.api_key_enc],
      ] as const;
      for (const [k, from, to] of tracked) {
        if (from !== to) {
          changes[`${provider}.${k}`] = { from: from ? "set" : "empty", to: to ? "updated" : "removed" };
        }
      }

      writes.push({ provider, ...next, updated_by: actorId });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Add the required credentials before activating a gateway",
        code: "SMS_GATEWAY_INCOMPLETE",
        errors,
      });
    }

    if (nextActive !== currentActive) {
      changes.active_provider = { from: currentActive ?? "none", to: nextActive ?? "none" };
    }

    await prisma.$transaction(
      writes.map((data) =>
        prisma.smsGatewayProvider.upsert({
          where: { provider: data.provider },
          create: data,
          update: data,
        }),
      ),
    );
    invalidateSmsGatewayCache();

    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "sms_gateway_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: "SMS gateway settings saved", ...(await loadState()) });
  }),
);

/** Decrypted secrets — requires the signed-in super admin's password. */
dashboardSmsGatewayRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealSmsSecretsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const guard = await confirmActorPassword(actorId, parsed.data.password);
    if (!guard.ok) return res.status(guard.status).json(guard.body);

    const map = new Map(
      (await prisma.smsGatewayProvider.findMany()).map((r) => [r.provider, r]),
    );
    const secrets = Object.fromEntries(
      SMS_PROVIDERS.map((p) => {
        const row = map.get(p);
        return [
          p,
          {
            api_key: decryptSecret(row?.api_key_enc),
            sender_id: row?.sender_id ?? null,
            account_sid: row?.account_sid ?? null,
          },
        ];
      }),
    );

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "sms_secrets_revealed",
        note: "SMS gateway credentials viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ secrets });
  }),
);

/** Sends one real SMS through the saved active gateway. */
dashboardSmsGatewayRouter.post(
  "/test",
  asyncHandler(async (req, res) => {
    const parsed = testSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const key = req.auth!.userId.toString();
    const now = Date.now();
    const last = lastTestAt.get(key) ?? 0;
    if (now - last < TEST_COOLDOWN_MS) {
      return res.status(429).json({
        message: `Wait ${Math.ceil((TEST_COOLDOWN_MS - (now - last)) / 1000)}s before sending another test SMS`,
        code: "TEST_TOO_SOON",
      });
    }

    const cfg = await getActiveSmsConfig();
    if (!cfg) {
      return res.status(400).json({
        message: "No SMS gateway is active. Activate one and save first.",
        code: "SMS_GATEWAY_INACTIVE",
      });
    }

    lastTestAt.set(key, now);
    try {
      await sendViaGateway(
        cfg,
        parsed.data.phone,
        `${env.appName}: test SMS from your dashboard. Your SMS gateway is working.`,
      );
    } catch (err) {
      console.error("[sms-gateway] test send failed", err);
      return res.status(502).json({
        message: err instanceof Error ? err.message : "The gateway rejected the message",
        code: "SMS_TEST_FAILED",
      });
    }

    return res.json({
      message: `Test SMS sent to ${maskPhone(parsed.data.phone)} via ${cfg.provider}`,
      provider: cfg.provider,
    });
  }),
);
