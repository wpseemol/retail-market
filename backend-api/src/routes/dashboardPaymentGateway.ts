import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { confirmActorPassword } from "../lib/revealGuard.js";
import { decryptSecret, encryptSecret } from "../lib/secretBox.js";
import {
  envSslcommerzConfig,
  getSslcommerzConfig,
  invalidatePaymentGatewayCache,
  loadSslcommerzRow,
  type SslcommerzConfig,
} from "../lib/paymentGateway.js";
import { initSslcommerzSession, SSLCZ_CALLBACK_BASE } from "../lib/sslcommerz.js";
import {
  revealPaymentSecretsSchema,
  updateSslcommerzSchema,
} from "../validators/paymentGateway.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Mounted under `/api/dashboard/site-settings/payment-gateway` (super_admin only). */
export const dashboardPaymentGatewayRouter = Router();

const TEST_COOLDOWN_MS = 30_000;
const lastTestAt = new Map<string, number>();

function isLocalUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return true;
  }
}

async function loadState() {
  const [row, active] = await Promise.all([loadSslcommerzRow(), getSslcommerzConfig()]);
  const callback = (path: string) => `${env.publicBaseUrl}${SSLCZ_CALLBACK_BASE}/${path}`;
  return {
    sslcommerz: {
      saved: Boolean(row),
      is_enabled: row?.is_enabled ?? false,
      is_live: row?.is_live ?? false,
      // Both credentials are only returned by POST /reveal after password confirmation.
      has_store_id: Boolean(row?.store_id),
      has_store_password: Boolean(row?.store_password_enc),
      ready: Boolean(row?.store_id && decryptSecret(row?.store_password_enc)),
      updated_at: row?.updated_at.toISOString() ?? null,
      /** Which credentials checkout is using right now. */
      active_source: active?.source ?? "none",
      active_mode: active ? (active.isLive ? "live" : "sandbox") : null,
      /** No dashboard row yet, but SSLCZ_* in .env still takes payments. */
      env_fallback: !row && envSslcommerzConfig() !== null,
      callback_urls: {
        success: callback("success"),
        fail: callback("fail"),
        cancel: callback("cancel"),
        ipn: callback("ipn"),
      },
      /** IPN is server-to-server; SSLCOMMERZ cannot reach localhost. */
      callbacks_public: !isLocalUrl(env.publicBaseUrl),
    },
  };
}

dashboardPaymentGatewayRouter.get(
  "/",
  asyncHandler(async (_req, res) => res.json(await loadState())),
);

dashboardPaymentGatewayRouter.patch(
  "/sslcommerz",
  asyncHandler(async (req, res) => {
    const parsed = updateSslcommerzSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const input = parsed.data;
    const row = await prisma.paymentGateway.findUnique({ where: { provider: "sslcommerz" } });

    const next = {
      is_enabled: input.is_enabled ?? row?.is_enabled ?? false,
      is_live: input.is_live ?? row?.is_live ?? false,
      store_id: input.store_id !== undefined ? input.store_id : (row?.store_id ?? null),
      store_password_enc:
        input.store_password !== undefined
          ? input.store_password === null
            ? null
            : encryptSecret(input.store_password)
          : (row?.store_password_enc ?? null),
    };

    if (next.is_enabled) {
      const errors: Record<string, string[]> = {};
      if (!next.store_id) errors.store_id = ["Required before turning on online payment"];
      if (!next.store_password_enc) errors.store_password = ["Required before turning on online payment"];
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          message: "Add the store ID and store password before turning on SSLCOMMERZ",
          code: "PAYMENT_GATEWAY_INCOMPLETE",
          errors,
        });
      }
    }

    // History is visible without re-auth, so never log credential values.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const before = {
      is_enabled: row?.is_enabled ?? false,
      is_live: row?.is_live ?? false,
    };
    for (const key of ["is_enabled", "is_live"] as const) {
      if (before[key] !== next[key]) changes[`sslcommerz.${key}`] = { from: before[key], to: next[key] };
    }
    if ((row?.store_id ?? null) !== next.store_id) {
      changes["sslcommerz.store_id"] = {
        from: row?.store_id ? "set" : "empty",
        to: next.store_id ? "updated" : "removed",
      };
    }
    if ((row?.store_password_enc ?? null) !== next.store_password_enc) {
      changes["sslcommerz.store_password"] = {
        from: row?.store_password_enc ? "set" : "empty",
        to: next.store_password_enc ? "updated" : "removed",
      };
    }

    await prisma.paymentGateway.upsert({
      where: { provider: "sslcommerz" },
      create: { provider: "sslcommerz", ...next, updated_by: actorId },
      update: { ...next, updated_by: actorId },
    });
    invalidatePaymentGatewayCache();

    if (Object.keys(changes).length > 0 || !row) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: actorId,
          action: "payment_gateway_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: "SSLCOMMERZ settings saved", ...(await loadState()) });
  }),
);

/** Store ID + decrypted store password — requires the signed-in super admin's password. */
dashboardPaymentGatewayRouter.post(
  "/reveal",
  asyncHandler(async (req, res) => {
    const parsed = revealPaymentSecretsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const actorId = req.auth!.userId;
    const guard = await confirmActorPassword(actorId, parsed.data.password);
    if (!guard.ok) return res.status(guard.status).json(guard.body);

    const row = await prisma.paymentGateway.findUnique({ where: { provider: "sslcommerz" } });
    await prisma.siteSettingsHistory.create({
      data: {
        settings_id: 1,
        actor_id: actorId,
        action: "payment_secrets_revealed",
        note: "SSLCOMMERZ credentials viewed after password confirmation",
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      secrets: {
        sslcommerz: {
          store_id: row?.store_id ?? null,
          store_password: decryptSecret(row?.store_password_enc),
        },
      },
    });
  }),
);

/**
 * Opens a ৳10 session with the saved credentials (even while disabled) to
 * prove they work. Nothing is charged and no order/payment row is created.
 */
dashboardPaymentGatewayRouter.post(
  "/sslcommerz/test",
  asyncHandler(async (req, res) => {
    const key = req.auth!.userId.toString();
    const now = Date.now();
    const last = lastTestAt.get(key) ?? 0;
    if (now - last < TEST_COOLDOWN_MS) {
      return res.status(429).json({
        message: `Wait ${Math.ceil((TEST_COOLDOWN_MS - (now - last)) / 1000)}s before testing again`,
        code: "TEST_TOO_SOON",
      });
    }

    const row = await prisma.paymentGateway.findUnique({ where: { provider: "sslcommerz" } });
    const password = decryptSecret(row?.store_password_enc);
    const cfg: SslcommerzConfig | null =
      row?.store_id && password
        ? { storeId: row.store_id, storePassword: password, isLive: row.is_live, source: "dashboard" }
        : envSslcommerzConfig();
    if (!cfg) {
      return res.status(400).json({
        message: "Save a store ID and store password first.",
        code: "PAYMENT_GATEWAY_INCOMPLETE",
      });
    }

    lastTestAt.set(key, now);
    const callback = (path: string) => `${env.publicBaseUrl}${SSLCZ_CALLBACK_BASE}/${path}`;
    const fields = {
      total_amount: "10.00",
      currency: "BDT",
      tran_id: `TEST-${Date.now()}`,
      success_url: callback("success"),
      fail_url: callback("fail"),
      cancel_url: callback("cancel"),
      cus_name: "Dashboard test",
      cus_email: "test@example.com",
      cus_add1: "Test address",
      cus_city: "Dhaka",
      cus_postcode: "1200",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      shipping_method: "NO",
      num_of_item: "1",
      product_name: "Connection test",
      product_category: "General",
      product_profile: "general",
    };
    const result = await initSslcommerzSession(cfg, fields);

    const mode = cfg.isLive ? "live" : "sandbox";
    if (result.status !== "SUCCESS" || !result.GatewayPageURL) {
      // Sandbox and live store IDs are separate accounts; the gateway only says
      // "Store Credential Error", so check whether the other mode accepts them.
      const otherMode = cfg.isLive ? "sandbox" : "live";
      const other = await initSslcommerzSession(
        { ...cfg, isLive: !cfg.isLive },
        { ...fields, tran_id: `TEST-${Date.now()}-x` },
      );
      if (other.status === "SUCCESS" && other.GatewayPageURL) {
        return res.status(502).json({
          message: `These are SSLCOMMERZ ${otherMode} credentials, but Live mode is ${cfg.isLive ? "on" : "off"}. Turn Live mode ${cfg.isLive ? "off" : "on"} (or enter your ${mode} store ID and password) and save.`,
          code: "PAYMENT_MODE_MISMATCH",
          detected_mode: otherMode,
        });
      }
      return res.status(502).json({
        message: `SSLCOMMERZ (${mode}) rejected the credentials: ${result.failedreason || "unknown error"}`,
        code: "PAYMENT_TEST_FAILED",
      });
    }
    return res.json({
      message: `Connected to SSLCOMMERZ ${mode} using ${cfg.source === "env" ? ".env" : "saved"} credentials`,
      mode,
    });
  }),
);
