import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtp.host) return null;
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const tx = getTransporter();
  if (!tx) {
    if (env.nodeEnv === "production") {
      throw new Error("SMTP is not configured (set SMTP_HOST)");
    }
    console.info(`[mail:dev] to=${input.to} subject="${input.subject}"\n${input.text}`);
    return;
  }
  await tx.sendMail({ from: env.smtp.from, ...input });
}

/** `to` must be E.164 (e.g. +8801712345678). */
export async function sendSms(to: string, message: string) {
  if (env.sms.provider === "console") {
    if (env.nodeEnv === "production") {
      throw new Error("SMS gateway is not configured (set SMS_PROVIDER)");
    }
    console.info(`[sms:dev] to=${to}\n${message}`);
    return;
  }

  // BulkSMSBD expects the number without "+", e.g. 8801712345678.
  const params = new URLSearchParams({
    api_key: env.sms.apiKey,
    type: "text",
    number: to.replace(/^\+/, ""),
    senderid: env.sms.senderId,
    message,
  });
  const res = await fetch(`${env.sms.apiUrl}?${params.toString()}`, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text();
  // BulkSMSBD returns HTTP 200 with response_code 202 on success.
  if (!res.ok || !/"response_code"\s*:\s*202/.test(body)) {
    throw new Error(`SMS gateway rejected the message: ${body.slice(0, 200)}`);
  }
}
