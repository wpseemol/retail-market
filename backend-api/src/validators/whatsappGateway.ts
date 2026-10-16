import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";
import { normalizePhone, PHONE_FORMAT_MESSAGE } from "../lib/phone.js";
import { WHATSAPP_PROVIDERS } from "../lib/whatsappGateway.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/** `undefined` keeps the stored value, `null` clears it, a string replaces it. */
const accessTokenField = z
  .union([
    z
      .string()
      .trim()
      .min(20, "Access token looks too short")
      .max(2048)
      .regex(/^[A-Za-z0-9._~+/=|:-]+$/, "Access token contains unsupported characters"),
    z.null(),
  ])
  .optional();

const phoneNumberIdField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(64)
        .regex(
          /^(\+?[1-9]\d{7,14}|whatsapp:\+[1-9]\d{7,14}|\d{5,20})$/,
          "Use a Meta Phone number ID (digits) or a Twilio WhatsApp From (+E.164 / whatsapp:+…)",
        ),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const accountSidField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(255)
        .regex(
          /^(AC[0-9a-fA-F]{32}|\d{5,20})$/,
          "Use a Twilio Account SID (AC…) or Meta WABA id (digits)",
        ),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const templateNameField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(100)
        .regex(
          /^([A-Za-z0-9_]+|HX[0-9a-fA-F]{32})$/,
          "Template name (letters/underscores) or Twilio Content SID (HX…)",
        ),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const templateLanguageField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(12)
        .regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Use a language code like en or en_US"),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const apiVersionField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(16)
        .regex(/^v\d+(\.\d+)?$/, "Use a Graph API version like v21.0"),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const providerPatch = z
  .object({
    access_token: accessTokenField,
    phone_number_id: phoneNumberIdField,
    account_sid: accountSidField,
    template_name: templateNameField,
    template_language: templateLanguageField,
    api_version: apiVersionField,
    template_button_param: z.boolean().optional(),
  })
  .strict();

export const updateWhatsAppGatewaySchema = z
  .object({
    /** `null` turns the dashboard gateway off (falls back to WHATSAPP_* env / console). */
    active_provider: z.enum(WHATSAPP_PROVIDERS).nullable().optional(),
    meta_cloud: providerPatch.optional(),
    twilio_whatsapp: providerPatch.optional(),
  })
  .strict();

export const revealWhatsAppSecretsSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export const testWhatsAppSchema = z.object({
  phone: withSafeInput(z.string().trim().min(1, "Mobile number is required").max(20))
    .refine((v) => normalizePhone(v) !== null, PHONE_FORMAT_MESSAGE)
    .transform((v) => normalizePhone(v)!),
});

export type UpdateWhatsAppGatewayInput = z.infer<typeof updateWhatsAppGatewaySchema>;
