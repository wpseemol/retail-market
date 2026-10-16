import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { maskPhone } from "../lib/phone.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  WHATSAPP_PROVIDERS,
  WHATSAPP_REQUIRED_FIELDS,
  getActiveWhatsAppConfig,
  invalidateWhatsAppGatewayCache,
  isWhatsAppRowReady,
  sendViaWhatsAppGateway,
  type WhatsAppProvider,
} from "../lib/whatsappGateway.js";
import {
  revealWhatsAppSecretsSchema,
  testWhatsAppSchema,
  updateWhatsAppGatewaySchema,
} from "../validators/whatsappGateway.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/whatsapp-gateway` (super_admin only). */
export const dashboardWhatsAppGatewayRouter = Router();

type Row = Awaited<ReturnType<typeof prisma.whatsAppGatewayProvider.findMany>>[number];

const TEST_COOLDOWN_MS = 30_000;
const lastTestAt = new Map<string, number>();

function toDashboardProvider(provider: WhatsAppProvider, row: Row | undefined) {
  return {
    provider,
    is_active: row?.is_active ?? false,
    has_access_token: Boolean(row?.access_token_enc),
    has_phone_number_id: Boolean(row?.phone_number_id),
    has_account_sid: Boolean(row?.account_sid),
    has_template_name: Boolean(row?.template_name),
    template_language: row?.template_language ?? "en",
    api_version: row?.api_version ?? "v21.0",
    template_button_param: row?.template_button_param ?? true,
    ready: isWhatsAppRowReady(provider, row),
    updated_at: row?.updated_at.toISOString() ?? null,
  };
}

async function loadState() {
  const rows = await prisma.whatsAppGatewayProvider.findMany();
  const map = new Map(rows.map((r) => [r.provider, r]));
  const active = rows.find((r) => r.is_active)?.provider ?? null;
  return {
    active_provider: active,
    env_fallback:
      !active &&
      (env.whatsapp.provider === "meta_cloud" || env.whatsapp.provider === "twilio_whatsapp"),
    providers: Object.fromEntries(
      WHATSAPP_PROVIDERS.map((p) => [p, toDashboardProvider(p, map.get(p))]),
    ) as Record<WhatsAppProvider, ReturnType<typeof toDashboardProvider>>,
  };
}

dashboardWhatsAppGatewayRouter.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await loadState())),
);

dashboardWhatsAppGatewayRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateWhatsAppGatewaySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const existing = new Map(
      (await prisma.whatsAppGatewayProvider.findMany()).map((r) => [r.provider, r]),
    );
    const currentActive = [...existing.values()].find((r) => r.is_active)?.provider ?? null;
    const nextActive =
      parsed.data.active_provider !== undefined ? parsed.data.active_provider : currentActive;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const writes: Prisma.WhatsAppGatewayProviderUncheckedCreateInput[] = [];
    const errors: Record<string, string[]> = {};

    for (const provider of WHATSAPP_PROVIDERS) {
      const input = parsed.data[provider];
      const row = existing.get(provider);
      const isActive = nextActive === provider;
      if (!input && !row && !isActive) continue;

      const next = {
        is_active: isActive,
        access_token_enc:
          input?.access_token !== undefined
            ? input.access_token === null
              ? null
              : encryptSecret(input.access_token)
            : (row?.access_token_enc ?? null),
        phone_number_id:
          input?.phone_number_id !== undefined
            ? input.phone_number_id
            : (row?.phone_number_id ?? null),
        account_sid:
          input?.account_sid !== undefined ? input.account_sid : (row?.account_sid ?? null),
        template_name:
          input?.template_name !== undefined
            ? input.template_name
            : (row?.template_name ?? null),
        template_language:
          input?.template_language !== undefined && input.template_language !== null
            ? input.template_language
            : (row?.template_language ?? "en"),
        api_version:
          input?.api_version !== undefined && input.api_version !== null
            ? input.api_version
            : (row?.api_version ?? "v21.0"),
        template_button_param:
          input?.template_button_param !== undefined
            ? input.template_button_param
            : (row?.template_button_param ?? true),
        updated_by: actorId,
      };

      if (isActive && !isWhatsAppRowReady(provider, next)) {
        for (const field of WHATSAPP_REQUIRED_FIELDS[provider]) {
          const ok =
            field === "access_token"
              ? Boolean(next.access_token_enc)
              : field === "phone_number_id"
                ? Boolean(next.phone_number_id)
                : field === "account_sid"
                  ? Boolean(next.account_sid)
                  : Boolean(next.template_name);
          if (!ok) {
            errors[`${provider}.${field}`] = [`Required to activate ${provider}`];
          }
        }
      }

      const prevActive = row?.is_active ?? false;
      if (prevActive !== isActive) {
        changes[`${provider}.is_active`] = { from: prevActive, to: isActive };
      }
      if (input?.access_token !== undefined) {
        changes[`${provider}.access_token`] = {
          from: row?.access_token_enc ? "set" : "empty",
          to: input.access_token === null ? "removed" : "updated",
        };
      }
      if (input?.phone_number_id !== undefined) {
        changes[`${provider}.phone_number_id`] = {
          from: row?.phone_number_id ? "set" : "empty",
          to: input.phone_number_id ? "updated" : "removed",
        };
      }
      if (input?.account_sid !== undefined) {
        changes[`${provider}.account_sid`] = {
          from: row?.account_sid ? "set" : "empty",
          to: input.account_sid ? "updated" : "removed",
        };
      }
      if (input?.template_name !== undefined) {
        changes[`${provider}.template_name`] = {
          from: row?.template_name ?? null,
          to: input.template_name,
        };
      }
      if (input?.template_language !== undefined) {
        changes[`${provider}.template_language`] = {
          from: row?.template_language ?? "en",
          to: next.template_language,
        };
      }
      if (input?.api_version !== undefined) {
        changes[`${provider}.api_version`] = {
          from: row?.api_version ?? "v21.0",
          to: next.api_version,
        };
      }
      if (input?.template_button_param !== undefined) {
        changes[`${provider}.template_button_param`] = {
          from: row?.template_button_param ?? true,
          to: next.template_button_param,
        };
      }

      writes.push({ provider, ...next });
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Complete the required fields before activating this WhatsApp gateway",
        code: "WHATSAPP_GATEWAY_INCOMPLETE",
        errors,
      });
    }

    if (nextActive !== currentActive) {
      changes.active_provider = { from: currentActive ?? "none", to: nextActive ?? "none" };
    }

    await prisma.$transaction(
      writes.map((data) =>
        prisma.whatsAppGatewayProvider.upsert({
          where: { provider: data.provider },
          create: data,
          update: data,
        }),
      ),
    );
    invalidateWhatsAppGatewayCache();

    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "whatsapp_gateway_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: "WhatsApp gateway settings saved", ...(await loadState()) });
  }),
);

dashboardWhatsAppGatewayRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealWhatsAppSecretsSchema.safeParse(req.body);
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
      (await prisma.whatsAppGatewayProvider.findMany()).map((r) => [r.provider, r]),
    );
    const secrets = Object.fromEntries(
      WHATSAPP_PROVIDERS.map((p) => {
        const row = map.get(p);
        return [
          p,
          {
            access_token: decryptSecret(row?.access_token_enc),
            phone_number_id: row?.phone_number_id ?? null,
            account_sid: row?.account_sid ?? null,
            template_name: row?.template_name ?? null,
            template_language: row?.template_language ?? "en",
            api_version: row?.api_version ?? "v21.0",
            template_button_param: row?.template_button_param ?? true,
          },
        ];
      }),
    );

    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "whatsapp_secrets_revealed",
        note: "WhatsApp gateway credentials viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ secrets });
  }),
);

dashboardWhatsAppGatewayRouter.post(
  "/test",
  asyncHandler(async (req, res) => {
    const parsed = testWhatsAppSchema.safeParse(req.body);
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
        message: `Wait ${Math.ceil((TEST_COOLDOWN_MS - (now - last)) / 1000)}s before sending another test`,
        code: "TEST_TOO_SOON",
      });
    }

    const cfg = await getActiveWhatsAppConfig();
    if (!cfg) {
      return res.status(400).json({
        message: "No WhatsApp gateway is active. Activate one and save first.",
        code: "WHATSAPP_GATEWAY_INACTIVE",
      });
    }

    lastTestAt.set(key, now);
    try {
      // Use a clearly fake OTP so test templates still render.
      await sendViaWhatsAppGateway(cfg, parsed.data.phone, "000000");
    } catch (err) {
      console.error("[whatsapp-gateway] test send failed", err);
      return res.status(502).json({
        message: err instanceof Error ? err.message : "The gateway rejected the message",
        code: "WHATSAPP_TEST_FAILED",
      });
    }

    return res.json({
      message: `Test WhatsApp OTP template sent to ${maskPhone(parsed.data.phone)} via ${cfg.provider}`,
      provider: cfg.provider,
    });
  }),
);
