import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { verifyPassword } from "../lib/password.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  SOCIAL_PROVIDERS,
  invalidateSocialLoginCache,
  type SocialProvider,
} from "../lib/socialLogin.js";
import {
  revealSocialSecretsSchema,
  updateSocialLoginSchema,
} from "../validators/socialLogin.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/social-login` (super_admin only). */
export const dashboardSocialLoginRouter = Router();

type Row = Awaited<ReturnType<typeof prisma.socialLoginProvider.findMany>>[number];

const REVEAL_MAX_FAILS = 5;
const REVEAL_WINDOW_MS = 15 * 60 * 1000;
const revealFails = new Map<string, { count: number; resetAt: number }>();

function toDashboardProvider(provider: SocialProvider, row: Row | undefined) {
  const hasSecret = Boolean(row?.client_secret_enc);
  const hasPrivateKey = Boolean(row?.private_key_enc);
  const clientId = row?.client_id ?? null;
  const ready =
    provider === "facebook" ? Boolean(clientId && hasSecret) : Boolean(clientId);

  return {
    provider,
    is_enabled: row?.is_enabled ?? false,
    client_id: clientId,
    has_client_secret: hasSecret,
    team_id: row?.team_id ?? null,
    key_id: row?.key_id ?? null,
    has_private_key: hasPrivateKey,
    ready,
    /** Google only: storefront still uses GOOGLE_CLIENT_ID until saved here. */
    env_fallback: provider === "google" && !row && Boolean(env.googleClientId),
    updated_at: row?.updated_at.toISOString() ?? null,
  };
}

async function loadProviders() {
  const rows = await prisma.socialLoginProvider.findMany();
  const map = new Map(rows.map((r) => [r.provider, r]));
  return Object.fromEntries(
    SOCIAL_PROVIDERS.map((p) => [p, toDashboardProvider(p, map.get(p))]),
  ) as Record<SocialProvider, ReturnType<typeof toDashboardProvider>>;
}

dashboardSocialLoginRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    return res.json({ providers: await loadProviders() });
  }),
);

dashboardSocialLoginRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateSocialLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = new Map(
      (await prisma.socialLoginProvider.findMany()).map((r) => [r.provider, r]),
    );
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const writes: Array<{ provider: SocialProvider; data: Prisma.SocialLoginProviderUncheckedCreateInput }> = [];
    const errors: Record<string, string[]> = {};

    for (const provider of SOCIAL_PROVIDERS) {
      const input = parsed.data[provider];
      if (!input) continue;
      const row = existing.get(provider);

      const next = {
        is_enabled: input.is_enabled ?? row?.is_enabled ?? false,
        client_id: input.client_id !== undefined ? input.client_id : (row?.client_id ?? null),
        client_secret_enc:
          "client_secret" in input && input.client_secret !== undefined
            ? input.client_secret === null
              ? null
              : encryptSecret(input.client_secret)
            : (row?.client_secret_enc ?? null),
        team_id:
          "team_id" in input && input.team_id !== undefined ? input.team_id : (row?.team_id ?? null),
        key_id:
          "key_id" in input && input.key_id !== undefined ? input.key_id : (row?.key_id ?? null),
        private_key_enc:
          "private_key" in input && input.private_key !== undefined
            ? input.private_key === null
              ? null
              : encryptSecret(input.private_key.replace(/\r\n/g, "\n"))
            : (row?.private_key_enc ?? null),
      };

      if (next.is_enabled && !next.client_id) {
        errors[`${provider}.client_id`] = ["Required before enabling this provider"];
      }
      if (next.is_enabled && provider === "facebook" && !next.client_secret_enc) {
        errors[`${provider}.client_secret`] = ["App secret is required before enabling Facebook"];
      }

      const label = (k: string) => `${provider}.${k}`;
      if (next.is_enabled !== (row?.is_enabled ?? false)) {
        changes[label("is_enabled")] = { from: row?.is_enabled ?? false, to: next.is_enabled };
      }
      if (next.client_id !== (row?.client_id ?? null)) {
        changes[label("client_id")] = { from: row?.client_id ?? null, to: next.client_id };
      }
      for (const k of ["team_id", "key_id"] as const) {
        if (next[k] !== (row?.[k] ?? null)) {
          changes[label(k)] = { from: row?.[k] ?? null, to: next[k] };
        }
      }
      // Never log secret values — only that they changed.
      if (next.client_secret_enc !== (row?.client_secret_enc ?? null)) {
        changes[label("client_secret")] = {
          from: row?.client_secret_enc ? "set" : "empty",
          to: next.client_secret_enc ? "updated" : "removed",
        };
      }
      if (next.private_key_enc !== (row?.private_key_enc ?? null)) {
        changes[label("private_key")] = {
          from: row?.private_key_enc ? "set" : "empty",
          to: next.private_key_enc ? "updated" : "removed",
        };
      }

      writes.push({ provider, data: { provider, ...next, updated_by: actorId } });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Add the required credentials before enabling a provider",
        code: "SOCIAL_LOGIN_INCOMPLETE",
        errors,
      });
    }

    await prisma.$transaction(
      writes.map(({ provider, data }) =>
        prisma.socialLoginProvider.upsert({
          where: { provider },
          create: data,
          update: data,
        }),
      ),
    );
    invalidateSocialLoginCache();

    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "social_login_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({
      message: "Social login settings saved",
      providers: await loadProviders(),
    });
  }),
);

/** Decrypted secrets — requires the signed-in super admin's password. */
dashboardSocialLoginRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealSocialSecretsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const key = actorId.toString();
    const now = Date.now();
    const fails = revealFails.get(key);
    if (fails && fails.resetAt > now && fails.count >= REVEAL_MAX_FAILS) {
      return res.status(429).json({
        message: "Too many wrong passwords. Try again in a few minutes.",
        code: "REVEAL_RATE_LIMITED",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: actorId },
      select: { password: true },
    });
    const ok =
      Boolean(user?.password) &&
      (await verifyPassword(parsed.data.password, user!.password!));

    if (!ok) {
      const entry =
        fails && fails.resetAt > now ? fails : { count: 0, resetAt: now + REVEAL_WINDOW_MS };
      entry.count += 1;
      revealFails.set(key, entry);
      return res.status(401).json({
        message: "Incorrect password",
        code: "INVALID_PASSWORD",
        errors: { password: ["Incorrect password"] },
      });
    }
    revealFails.delete(key);

    const rows = await prisma.socialLoginProvider.findMany();
    const map = new Map(rows.map((r) => [r.provider, r]));
    const secrets = Object.fromEntries(
      SOCIAL_PROVIDERS.map((p) => {
        const row = map.get(p);
        return [
          p,
          {
            client_secret: decryptSecret(row?.client_secret_enc),
            private_key: decryptSecret(row?.private_key_enc),
          },
        ];
      }),
    );

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "social_secrets_revealed",
        note: "Social login secrets viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ secrets });
  }),
);
