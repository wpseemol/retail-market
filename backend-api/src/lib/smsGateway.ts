import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { decryptSecret } from "./secretBox.js";

export const SMS_PROVIDERS = ["bulksmsbd", "alpha_sms", "ssl_wireless", "mim_sms", "twilio"] as const;
export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export function isSmsProvider(value: unknown): value is SmsProvider {
  return (SMS_PROVIDERS as readonly unknown[]).includes(value);
}

/** Which fields each gateway needs before it can be activated. */
export const SMS_REQUIRED_FIELDS: Record<SmsProvider, ReadonlyArray<"api_key" | "sender_id" | "account_sid">> = {
  bulksmsbd: ["api_key", "sender_id"],
  alpha_sms: ["api_key"],
  ssl_wireless: ["api_key", "sender_id"],
  mim_sms: ["account_sid", "api_key", "sender_id"],
  twilio: ["account_sid", "api_key", "sender_id"],
};

export type SmsGatewayConfig = {
  provider: SmsProvider;
  apiKey: string;
  senderId: string | null;
  accountSid: string | null;
};

type Row = Awaited<ReturnType<typeof prisma.smsGatewayProvider.findMany>>[number];

const CACHE_MS = 30_000;
let cache: { at: number; rows: Row[] } | null = null;

export function invalidateSmsGatewayCache() {
  cache = null;
}

async function loadRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await prisma.smsGatewayProvider.findMany();
  cache = { at: Date.now(), rows };
  return rows;
}

export function isRowReady(provider: SmsProvider, row: Pick<Row, "api_key_enc" | "sender_id" | "account_sid"> | undefined) {
  if (!row) return false;
  const has = {
    api_key: Boolean(row.api_key_enc),
    sender_id: Boolean(row.sender_id),
    account_sid: Boolean(row.account_sid),
  };
  return SMS_REQUIRED_FIELDS[provider].every((f) => has[f]);
}

/** Dashboard-configured gateway, or the SMS_* env fallback, or null (console/dev). */
export async function getActiveSmsConfig(): Promise<SmsGatewayConfig | null> {
  const rows = await loadRows();
  const active = rows.find((r) => r.is_active && isSmsProvider(r.provider));
  if (active) {
    const apiKey = decryptSecret(active.api_key_enc);
    if (!apiKey) {
      throw new Error("Saved SMS API key cannot be decrypted (SETTINGS_ENCRYPTION_KEY changed?)");
    }
    return {
      provider: active.provider as SmsProvider,
      apiKey,
      senderId: active.sender_id,
      accountSid: active.account_sid,
    };
  }
  if (env.sms.provider === "bulksmsbd") {
    return { provider: "bulksmsbd", apiKey: env.sms.apiKey, senderId: env.sms.senderId, accountSid: null };
  }
  return null;
}

async function readBody(res: Response) {
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON gateway response */
  }
  return { text, json: json as Record<string, unknown> | null };
}

function fail(provider: SmsProvider, body: string): never {
  throw new Error(`${provider} rejected the message: ${body.slice(0, 200)}`);
}

/** `to` must be E.164 (e.g. +8801712345678). */
export async function sendViaGateway(cfg: SmsGatewayConfig, to: string, message: string) {
  const digits = to.replace(/^\+/, "");
  const signal = AbortSignal.timeout(10_000);

  switch (cfg.provider) {
    case "bulksmsbd": {
      const params = new URLSearchParams({
        api_key: cfg.apiKey,
        type: "text",
        number: digits,
        senderid: cfg.senderId ?? "",
        message,
      });
      const url = env.sms.provider === "bulksmsbd" ? env.sms.apiUrl : "https://bulksmsbd.net/api/smsapi";
      const res = await fetch(`${url}?${params.toString()}`, { method: "GET", signal });
      const { text } = await readBody(res);
      // BulkSMSBD returns HTTP 200 with response_code 202 on success.
      if (!res.ok || !/"response_code"\s*:\s*202/.test(text)) fail(cfg.provider, text);
      return;
    }
    case "alpha_sms": {
      const params = new URLSearchParams({ api_key: cfg.apiKey, msg: message, to: digits });
      if (cfg.senderId) params.set("sender_id", cfg.senderId);
      const res = await fetch("https://api.sms.net.bd/sendsms", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        signal,
      });
      const { text, json } = await readBody(res);
      if (!res.ok || Number(json?.error) !== 0) fail(cfg.provider, text);
      return;
    }
    case "ssl_wireless": {
      const res = await fetch("https://smsplus.sslwireless.com/api/v3/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          api_token: cfg.apiKey,
          sid: cfg.senderId,
          msisdn: digits,
          sms: message,
          // Must be unique per message, max 20 chars.
          csms_id: `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`.slice(0, 20),
        }),
        signal,
      });
      const { text, json } = await readBody(res);
      if (!res.ok || Number(json?.status_code) !== 200) fail(cfg.provider, text);
      return;
    }
    case "mim_sms": {
      const res = await fetch("https://api.mimsms.com/api/SmsSending/SMS", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          UserName: cfg.accountSid,
          Apikey: cfg.apiKey,
          MobileNumber: digits,
          CampaignId: "null",
          SenderName: cfg.senderId,
          TransactionType: "T",
          Message: message,
        }),
        signal,
      });
      const { text, json } = await readBody(res);
      if (!res.ok || Number(json?.statusCode) !== 200) fail(cfg.provider, text);
      return;
    }
    case "twilio": {
      const sender = cfg.senderId ?? "";
      const params = new URLSearchParams({ To: to, Body: message });
      params.set(sender.startsWith("MG") ? "MessagingServiceSid" : "From", sender);
      const auth = Buffer.from(`${cfg.accountSid}:${cfg.apiKey}`).toString("base64");
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
      const { text } = await readBody(res);
      if (!res.ok) fail(cfg.provider, text);
      return;
    }
  }
}
