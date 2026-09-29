import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { maskEmail } from "../lib/phone.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  EMAIL_PRESETS,
  EMAIL_PROVIDERS,
  getActiveEmailConfig,
  invalidateEmailProviderCache,
  isEmailRowReady,
  type EmailField,
  type EmailProviderId,
} from "../lib/emailProvider.js";
import { sendEmailWith } from "../lib/messaging.js";
import {
  revealEmailSecretsSchema,
  testEmailSchema,
  updateEmailProviderSchema,
} from "../validators/emailProvider.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/email-provider` (super_admin only). */
export const dashboardEmailProviderRouter = Router();

type Row = Awaited<ReturnType<typeof prisma.emailProvider.findMany>>[number];

const TEST_COOLDOWN_MS = 30_000;
const lastTestAt = new Map<string, number>();
const isEmail = (v: string) => z.string().email().safeParse(v).success;

function toDashboardProvider(provider: EmailProviderId, row: Row | undefined) {
  // Only the password is secret; it is returned by POST /reveal (password re-auth).
  return {
    provider,
    is_active: row?.is_active ?? false,
    host: row?.host ?? null,
    port: row?.port ?? null,
    secure: row?.secure ?? null,
    username: row?.username ?? null,
    from_email: row?.from_email ?? null,
    from_name: row?.from_name ?? null,
    has_password: Boolean(row?.password_enc),
    ready: isEmailRowReady(provider, row),
    updated_at: row?.updated_at.toISOString() ?? null,
  };
}

async function loadState() {
  const rows = await prisma.emailProvider.findMany();
  const map = new Map(rows.map((r) => [r.provider, r]));
  const active = rows.find((r) => r.is_active)?.provider ?? null;
  return {
    active_provider: active,
    /** No dashboard provider active, but SMTP_HOST in .env still sends real email. */
    env_fallback: !active && Boolean(env.smtp.host),
    providers: Object.fromEntries(
      EMAIL_PROVIDERS.map((p) => [p, toDashboardProvider(p, map.get(p))]),
    ) as Record<EmailProviderId, ReturnType<typeof toDashboardProvider>>,
  };
}

dashboardEmailProviderRouter.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await loadState())),
);

dashboardEmailProviderRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateEmailProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = new Map(
      (await prisma.emailProvider.findMany()).map((r) => [r.provider, r]),
    );
    const currentActive = [...existing.values()].find((r) => r.is_active)?.provider ?? null;
    const nextActive =
      parsed.data.active_provider !== undefined ? parsed.data.active_provider : currentActive;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const writes: Prisma.EmailProviderUncheckedCreateInput[] = [];
    const errors: Record<string, string[]> = {};

    for (const provider of EMAIL_PROVIDERS) {
      const input = parsed.data[provider];
      const row = existing.get(provider);
      const isActive = nextActive === provider;
      if (!input && !row && !isActive) continue;

      const preset = EMAIL_PRESETS[provider];
      const custom = provider === "smtp";
      const pick = <K extends "host" | "port" | "secure" | "username" | "from_email" | "from_name">(k: K) =>
        input?.[k] !== undefined ? input[k] : (row?.[k] ?? null);

      const next = {
        is_active: isActive,
        host: custom ? (pick("host") as string | null) : null,
        port: custom ? (pick("port") as number | null) : null,
        secure: custom ? (pick("secure") as boolean | null) : null,
        username: preset.fixedUsername ? null : (pick("username") as string | null),
        password_enc:
          input?.password !== undefined
            ? input.password === null
              ? null
              : encryptSecret(input.password)
            : (row?.password_enc ?? null),
        from_email: preset.fromIsUsername ? null : (pick("from_email") as string | null),
        from_name: pick("from_name") as string | null,
      };

      if (preset.fromIsUsername && next.username && !isEmail(next.username)) {
        errors[`${provider}.username`] = ["Use the full email address of the mailbox"];
      }
      if (isActive) {
        const has: Record<EmailField, boolean> = {
          host: Boolean(next.host),
          port: Boolean(next.port),
          username: Boolean(next.username),
          password: Boolean(next.password_enc),
          from_email: Boolean(next.from_email),
        };
        for (const field of preset.required) {
          if (!has[field]) errors[`${provider}.${field}`] = ["Required before activating this provider"];
        }
      }

      const plain = ["host", "port", "secure", "username", "from_email", "from_name"] as const;
      for (const k of plain) {
        const from = row?.[k] ?? null;
        if (from !== next[k]) changes[`${provider}.${k}`] = { from, to: next[k] };
      }
      // History is visible without re-auth, so never log the password.
      if ((row?.password_enc ?? null) !== next.password_enc) {
        changes[`${provider}.password`] = {
          from: row?.password_enc ? "set" : "empty",
          to: next.password_enc ? "updated" : "removed",
        };
      }

      writes.push({ provider, ...next, updated_by: actorId });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Fix the highlighted fields before saving",
        code: "EMAIL_PROVIDER_INCOMPLETE",
        errors,
      });
    }

    if (nextActive !== currentActive) {
      changes.active_provider = { from: currentActive ?? "none", to: nextActive ?? "none" };
    }

    await prisma.$transaction(
      writes.map((data) =>
        prisma.emailProvider.upsert({
          where: { provider: data.provider },
          create: data,
          update: data,
        }),
      ),
    );
    invalidateEmailProviderCache();

    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "email_provider_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: "Email provider settings saved", ...(await loadState()) });
  }),
);

/** Decrypted passwords — requires the signed-in super admin's password. */
dashboardEmailProviderRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealEmailSecretsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const guard = await confirmActorPassword(actorId, parsed.data.password);
    if (!guard.ok) return res.status(guard.status).json(guard.body);

    const map = new Map((await prisma.emailProvider.findMany()).map((r) => [r.provider, r]));
    const secrets = Object.fromEntries(
      EMAIL_PROVIDERS.map((p) => [p, { password: decryptSecret(map.get(p)?.password_enc) }]),
    );

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "email_secrets_revealed",
        note: "Email provider passwords viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ secrets });
  }),
);

/** Sends one real email through the saved active provider. */
dashboardEmailProviderRouter.post(
  "/test",
  asyncHandler(async (req, res) => {
    const parsed = testEmailSchema.safeParse(req.body);
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
        message: `Wait ${Math.ceil((TEST_COOLDOWN_MS - (now - last)) / 1000)}s before sending another test email`,
        code: "TEST_TOO_SOON",
      });
    }

    const cfg = await getActiveEmailConfig();
    if (!cfg) {
      return res.status(400).json({
        message: "No email provider is active. Activate one and save first.",
        code: "EMAIL_PROVIDER_INACTIVE",
      });
    }

    lastTestAt.set(key, now);
    try {
      await sendEmailWith(cfg, {
        to: parsed.data.to,
        subject: `${env.appName}: test email`,
        text: `This is a test email from your ${env.appName} dashboard. Your email provider (${cfg.provider}) is working.`,
      });
    } catch (err) {
      console.error("[email-provider] test send failed", err);
      return res.status(502).json({
        message: err instanceof Error ? err.message : "The provider rejected the email",
        code: "EMAIL_TEST_FAILED",
      });
    }

    return res.json({
      message: `Test email sent to ${maskEmail(parsed.data.to)} via ${cfg.provider}`,
      provider: cfg.provider,
    });
  }),
);
