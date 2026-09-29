import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.js";
import { getActiveEmailConfig, type EmailTransportConfig } from "./emailProvider.js";
import { getActiveSmsConfig, sendViaGateway } from "./smsGateway.js";

type EmailInput = { to: string; subject: string; text: string; html?: string };

let transporter: { key: string; tx: Transporter } | null = null;

function getTransporter(cfg: EmailTransportConfig): Transporter {
  const key = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass]);
  if (transporter?.key === key) return transporter.tx;
  transporter?.tx.close();
  const tx = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  transporter = { key, tx };
  return tx;
}

/** Sends through an explicit config (dashboard test button). */
export async function sendEmailWith(cfg: EmailTransportConfig, input: EmailInput) {
  await getTransporter(cfg).sendMail({ from: cfg.from, ...input });
}

/**
 * Uses the provider active in Dashboard → Settings → Email provider,
 * else the SMTP_* env vars.
 */
export async function sendEmail(input: EmailInput) {
  const cfg = await getActiveEmailConfig();
  if (!cfg) {
    if (env.nodeEnv === "production") {
      throw new Error("Email is not configured (Dashboard → Settings → Email provider)");
    }
    console.info(`[mail:dev] to=${input.to} subject="${input.subject}"\n${input.text}`);
    return;
  }
  await sendEmailWith(cfg, input);
}

/**
 * `to` must be E.164 (e.g. +8801712345678). Uses the gateway active in
 * Dashboard → Settings → SMS gateway, else the SMS_* env vars.
 */
export async function sendSms(to: string, message: string) {
  const cfg = await getActiveSmsConfig();
  if (!cfg) {
    if (env.nodeEnv === "production") {
      throw new Error("SMS gateway is not configured (Dashboard → Settings → SMS gateway)");
    }
    console.info(`[sms:dev] to=${to}\n${message}`);
    return;
  }
  await sendViaGateway(cfg, to, message);
}
