import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";
import { normalizePhone, PHONE_FORMAT_MESSAGE } from "../lib/phone.js";
import { SMS_PROVIDERS } from "../lib/smsGateway.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/** `undefined` keeps the stored value, `null` clears it, a string replaces it. */
const apiKeyField = z
  .union([
    z
      .string()
      .trim()
      .min(8, "API key looks too short")
      .max(512)
      .regex(/^[A-Za-z0-9._~+/=|:-]+$/, "API key contains unsupported characters"),
    z.null(),
  ])
  .optional();

/** Sender ID / SID / masking name / Twilio From (+E.164) or Messaging Service SID. */
const senderIdField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(40)
        .regex(/^\+?[A-Za-z0-9._ -]+$/, "Only letters, numbers, space, dot, dash, underscore and leading +"),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const accountSidField = z
  .union([
    z.string().trim().regex(/^AC[0-9a-fA-F]{32}$/, "Twilio Account SID starts with AC followed by 32 hex characters"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

/** MiM SMS API username = panel login email. */
const mimUsernameField = z
  .union([
    withSafeInput(z.string().trim().max(255).email("Use your MiM SMS panel login email")),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const basicGateway = z
  .object({ api_key: apiKeyField, sender_id: senderIdField })
  .strict();

const mimGateway = z
  .object({ api_key: apiKeyField, sender_id: senderIdField, account_sid: mimUsernameField })
  .strict();

const twilioGateway = z
  .object({ api_key: apiKeyField, sender_id: senderIdField, account_sid: accountSidField })
  .strict()
  .superRefine((v, ctx) => {
    if (v.sender_id && !/^(\+[1-9]\d{7,14}|MG[0-9a-fA-F]{32})$/.test(v.sender_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["sender_id"],
        message: "Use an E.164 number (+15551234567) or a Messaging Service SID (MG…)",
      });
    }
  });

export const updateSmsGatewaySchema = z
  .object({
    /** `null` turns the dashboard gateway off (falls back to SMS_* env / console). */
    active_provider: z.enum(SMS_PROVIDERS).nullable().optional(),
    bulksmsbd: basicGateway.optional(),
    alpha_sms: basicGateway.optional(),
    ssl_wireless: basicGateway.optional(),
    mim_sms: mimGateway.optional(),
    twilio: twilioGateway.optional(),
  })
  .strict();

export const revealSmsSecretsSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export const testSmsSchema = z.object({
  phone: withSafeInput(z.string().trim().min(1, "Mobile number is required").max(20))
    .refine((v) => normalizePhone(v) !== null, PHONE_FORMAT_MESSAGE)
    .transform((v) => normalizePhone(v)!),
});

export type UpdateSmsGatewayInput = z.infer<typeof updateSmsGatewaySchema>;
