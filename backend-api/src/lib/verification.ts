import crypto from "node:crypto";
import type { VerificationChannel } from "@prisma/client";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { sendEmail, sendSms, sendWhatsAppOtp, WhatsAppSendError, OutboundLimitError } from "./messaging.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_EMAIL_PER_HOUR = 5;
const MAX_PHONE_PER_HOUR = 3;

/** How a phone OTP is delivered. Confirm still uses the `sms` verification channel. */
export type PhoneDelivery = "sms" | "whatsapp";

export class VerificationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function hashCode(userId: bigint, channel: VerificationChannel, target: string, code: string) {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(`${userId}:${channel}:${target}:${code}`)
    .digest("hex");
}

function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function sendVerificationCode(
  userId: bigint,
  channel: VerificationChannel,
  target: string,
  options: { phoneDelivery?: PhoneDelivery } = {},
) {
  const now = Date.now();
  // Ignore anything outside the known union (defensive — callers must pass sms|whatsapp).
  const phoneDelivery: PhoneDelivery =
    options.phoneDelivery === "whatsapp" ? "whatsapp" : "sms";

  const latest = await prisma.verificationCode.findFirst({
    where: { user_id: userId, channel },
    orderBy: { created_at: "desc" },
    select: { created_at: true },
  });
  if (latest && now - latest.created_at.getTime() < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil(
      (RESEND_COOLDOWN_MS - (now - latest.created_at.getTime())) / 1000,
    );
    throw new VerificationError(
      429,
      "RESEND_TOO_SOON",
      `Please wait ${retryAfter}s before requesting a new code.`,
      { retry_after: retryAfter },
    );
  }

  const cap = channel === "email" ? MAX_EMAIL_PER_HOUR : MAX_PHONE_PER_HOUR;
  const sentLastHour = await prisma.verificationCode.count({
    where: {
      channel,
      created_at: { gte: new Date(now - 60 * 60 * 1000) },
      OR: [{ user_id: userId }, { target }],
    },
  });
  if (sentLastHour >= cap) {
    throw new VerificationError(
      429,
      "TOO_MANY_CODES",
      "Too many codes requested. Try again in an hour.",
    );
  }

  await prisma.verificationCode.updateMany({
    where: { user_id: userId, channel, consumed_at: null },
    data: { consumed_at: new Date() },
  });

  const code = generateCode();
  const row = await prisma.verificationCode.create({
    data: {
      user_id: userId,
      channel,
      target,
      code_hash: hashCode(userId, channel, target, code),
      expires_at: new Date(now + CODE_TTL_MS),
    },
  });

  try {
    if (channel === "email") {
      await sendEmail({
        to: target,
        subject: `${code} is your ${env.appName} verification code`,
        text: `Your ${env.appName} verification code is ${code}.\nIt expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `<p>Your ${env.appName} verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
      });
    } else if (phoneDelivery === "whatsapp") {
      await sendWhatsAppOtp(target, code);
    } else {
      await sendSms(
        target,
        `${env.appName}: your verification code is ${code}. Valid for 10 minutes. Do not share it.`,
      );
    }
  } catch (err) {
    await prisma.verificationCode.delete({ where: { id: row.id } }).catch(() => undefined);
    console.error(`[verification] ${channel}/${phoneDelivery} send failed`, err);
    if (err instanceof OutboundLimitError) {
      throw new VerificationError(
        429,
        "TOO_MANY_CODES",
        "Too many messages sent. Try again in an hour.",
      );
    }
    if (err instanceof WhatsAppSendError) {
      throw new VerificationError(
        502,
        err.code,
        err.message,
      );
    }
    throw new VerificationError(
      502,
      "SEND_FAILED",
      channel === "email"
        ? "Could not send the email. Try again shortly."
        : phoneDelivery === "whatsapp"
          ? "Could not send the WhatsApp code. Try SMS or try again shortly."
          : "Could not send the SMS. Try again shortly.",
    );
  }

  return {
    expiresInSeconds: CODE_TTL_MS / 1000,
    resendInSeconds: RESEND_COOLDOWN_MS / 1000,
    phoneDelivery,
  };
}

/** Returns the verified target (email / E.164 phone) when the code matches. */
export async function confirmVerificationCode(
  userId: bigint,
  channel: VerificationChannel,
  code: string,
): Promise<string> {
  const row = await prisma.verificationCode.findFirst({
    where: {
      user_id: userId,
      channel,
      consumed_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });

  if (!row) {
    throw new VerificationError(
      400,
      "CODE_EXPIRED",
      "The code has expired. Request a new one.",
    );
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new VerificationError(
      429,
      "TOO_MANY_ATTEMPTS",
      "Too many wrong attempts. Request a new code.",
    );
  }

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(hashCode(userId, channel, row.target, code), "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    const attempts = row.attempts + 1;
    await prisma.verificationCode.update({
      where: { id: row.id },
      data: { attempts },
    });
    throw new VerificationError(400, "INVALID_CODE", "Incorrect code.", {
      attempts_left: Math.max(0, MAX_ATTEMPTS - attempts),
    });
  }

  await prisma.verificationCode.update({
    where: { id: row.id },
    data: { consumed_at: new Date() },
  });
  return row.target;
}
