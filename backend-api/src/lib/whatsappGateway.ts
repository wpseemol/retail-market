import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { decryptSecret } from "./secretBox.js";

export const WHATSAPP_PROVIDERS = ["meta_cloud", "twilio_whatsapp"] as const;
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

export function isWhatsAppProvider(value: unknown): value is WhatsAppProvider {
  return (WHATSAPP_PROVIDERS as readonly unknown[]).includes(value);
}

/** Fields required before a provider can be activated. */
export const WHATSAPP_REQUIRED_FIELDS: Record<
  WhatsAppProvider,
  ReadonlyArray<
    "access_token" | "phone_number_id" | "account_sid" | "template_name"
  >
> = {
  meta_cloud: ["access_token", "phone_number_id", "template_name"],
  twilio_whatsapp: ["access_token", "phone_number_id", "account_sid", "template_name"],
};

export type WhatsAppGatewayConfig = {
  provider: WhatsAppProvider;
  accessToken: string;
  phoneNumberId: string;
  accountSid: string | null;
  templateName: string;
  templateLanguage: string;
  apiVersion: string;
  templateButtonParam: boolean;
};

export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    public code: "NOT_ON_WHATSAPP" | "WHATSAPP_REJECTED" | "WHATSAPP_MISCONFIGURED",
  ) {
    super(message);
  }
}

type Row = Awaited<ReturnType<typeof prisma.whatsAppGatewayProvider.findMany>>[number];

const CACHE_MS = 30_000;
let cache: { at: number; rows: Row[] } | null = null;

export function invalidateWhatsAppGatewayCache() {
  cache = null;
}

async function loadRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await prisma.whatsAppGatewayProvider.findMany();
  cache = { at: Date.now(), rows };
  return rows;
}

export function isWhatsAppRowReady(
  provider: WhatsAppProvider,
  row:
    | Pick<Row, "access_token_enc" | "phone_number_id" | "account_sid" | "template_name">
    | undefined,
) {
  if (!row) return false;
  const has = {
    access_token: Boolean(row.access_token_enc),
    phone_number_id: Boolean(row.phone_number_id),
    account_sid: Boolean(row.account_sid),
    template_name: Boolean(row.template_name),
  };
  return WHATSAPP_REQUIRED_FIELDS[provider].every((f) => has[f]);
}

function configFromEnv(): WhatsAppGatewayConfig | null {
  const provider = env.whatsapp.provider;
  if (provider !== "meta_cloud" && provider !== "twilio_whatsapp") return null;
  if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId || !env.whatsapp.templateName) {
    return null;
  }
  if (provider === "twilio_whatsapp" && !env.whatsapp.accountSid) return null;
  return {
    provider,
    accessToken: env.whatsapp.accessToken,
    phoneNumberId: env.whatsapp.phoneNumberId,
    accountSid: env.whatsapp.accountSid || null,
    templateName: env.whatsapp.templateName,
    templateLanguage: env.whatsapp.templateLanguage || "en",
    apiVersion: env.whatsapp.apiVersion || "v21.0",
    templateButtonParam: env.whatsapp.templateButtonParam,
  };
}

/** Dashboard-configured gateway, or WHATSAPP_* env fallback, or null. */
export async function getActiveWhatsAppConfig(): Promise<WhatsAppGatewayConfig | null> {
  const rows = await loadRows();
  const active = rows.find((r) => r.is_active && isWhatsAppProvider(r.provider));
  if (active) {
    const accessToken = decryptSecret(active.access_token_enc);
    if (!accessToken) {
      throw new Error(
        "Saved WhatsApp access token cannot be decrypted (SETTINGS_ENCRYPTION_KEY changed?)",
      );
    }
    if (!active.phone_number_id || !active.template_name) {
      throw new WhatsAppSendError(
        "WhatsApp gateway is incomplete (phone number id / template missing)",
        "WHATSAPP_MISCONFIGURED",
      );
    }
    return {
      provider: active.provider as WhatsAppProvider,
      accessToken,
      phoneNumberId: active.phone_number_id,
      accountSid: active.account_sid,
      templateName: active.template_name,
      templateLanguage: active.template_language || "en",
      apiVersion: active.api_version || "v21.0",
      templateButtonParam: active.template_button_param,
    };
  }
  return configFromEnv();
}

/** True when a WhatsApp OTP path is configured (dashboard or env). */
export async function isWhatsAppDeliveryReady(): Promise<boolean> {
  try {
    return (await getActiveWhatsAppConfig()) !== null;
  } catch {
    return false;
  }
}

async function readBody(res: Response) {
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { text, json: json as Record<string, unknown> | null };
}

function digitsOnly(to: string) {
  return to.replace(/^\+/, "").replace(/\D/g, "");
}

function metaErrorCode(json: Record<string, unknown> | null): number | null {
  const err = json?.error;
  if (!err || typeof err !== "object") return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "number" ? code : Number(code) || null;
}

/** `to` must be E.164. `code` is the 6-digit OTP placed into the approved template. */
export async function sendViaWhatsAppGateway(
  cfg: WhatsAppGatewayConfig,
  to: string,
  code: string,
) {
  const digits = digitsOnly(to);
  const signal = AbortSignal.timeout(15_000);

  switch (cfg.provider) {
    case "meta_cloud": {
      const components: Array<Record<string, unknown>> = [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
      ];
      if (cfg.templateButtonParam) {
        components.push({
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        });
      }

      const version = cfg.apiVersion.replace(/^\/+|\/+$/g, "") || "v21.0";
      const url = `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phoneNumberId)}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: digits,
          type: "template",
          template: {
            name: cfg.templateName,
            language: { code: cfg.templateLanguage },
            components,
          },
        }),
        signal,
      });
      const { text, json } = await readBody(res);
      if (res.ok) return;

      const metaCode = metaErrorCode(json);
      // 131026 Message undeliverable · 133010 Not a WhatsApp user
      if (metaCode === 131026 || metaCode === 133010) {
        throw new WhatsAppSendError(
          "This number does not appear to have WhatsApp. Try SMS instead.",
          "NOT_ON_WHATSAPP",
        );
      }
      throw new WhatsAppSendError(
        `Meta WhatsApp rejected the message: ${text.slice(0, 200)}`,
        "WHATSAPP_REJECTED",
      );
    }
    case "twilio_whatsapp": {
      const from = cfg.phoneNumberId.startsWith("whatsapp:")
        ? cfg.phoneNumberId
        : `whatsapp:${cfg.phoneNumberId.startsWith("+") ? cfg.phoneNumberId : `+${cfg.phoneNumberId}`}`;
      const toWa = `whatsapp:+${digits}`;
      // Content SID templates use ContentVariables; ContentSid is stored as template_name.
      const params = new URLSearchParams({
        To: toWa,
        From: from,
        ContentSid: cfg.templateName,
        ContentVariables: JSON.stringify({ "1": code }),
      });
      const auth = Buffer.from(`${cfg.accountSid}:${cfg.accessToken}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid ?? "")}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
          signal,
        },
      );
      const { text, json } = await readBody(res);
      if (res.ok) return;

      const twilioCode = String(
        (json as { code?: unknown } | null)?.code ?? "",
      );
      // 63003 / 63016 / 21614 — destination not reachable on WhatsApp
      if (["63003", "63016", "21614", "63024"].includes(twilioCode)) {
        throw new WhatsAppSendError(
          "This number does not appear to have WhatsApp. Try SMS instead.",
          "NOT_ON_WHATSAPP",
        );
      }
      throw new WhatsAppSendError(
        `Twilio WhatsApp rejected the message: ${text.slice(0, 200)}`,
        "WHATSAPP_REJECTED",
      );
    }
  }
}
