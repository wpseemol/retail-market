import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";
import { EMAIL_PROVIDERS } from "../lib/emailProvider.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const optionalText = (schema: z.ZodString) =>
  z.union([withSafeInput(schema), z.literal(""), z.null()]).optional().transform(emptyToNull);

const hostField = optionalText(
  z
    .string()
    .trim()
    .max(255)
    .regex(/^[A-Za-z0-9.-]+$/, "Enter a hostname like smtp.example.com"),
);

const emailField = optionalText(z.string().trim().max(255).email("Enter a valid email address"));

/**
 * `undefined` keeps the stored value, `null` clears it, a string replaces it.
 * Passwords are encrypted and never rendered, so any printable characters are allowed
 * (Gmail app passwords contain spaces).
 */
const passwordField = z
  .union([
    z
      .string()
      .min(4, "Password looks too short")
      .max(512)
      .regex(/^[^\r\n\t\0]+$/, "Password contains unsupported characters"),
    z.null(),
  ])
  .optional();

const providerInput = z
  .object({
    host: hostField,
    port: z.number().int().min(1).max(65535).nullable().optional(),
    secure: z.boolean().nullable().optional(),
    username: optionalText(z.string().trim().max(255)),
    password: passwordField,
    from_email: emailField,
    from_name: optionalText(z.string().trim().max(100)),
  })
  .strict();

export const updateEmailProviderSchema = z
  .object({
    /** `null` turns the dashboard provider off (falls back to SMTP_* env / console). */
    active_provider: z.enum(EMAIL_PROVIDERS).nullable().optional(),
    gmail: providerInput.optional(),
    zoho: providerInput.optional(),
    sendgrid: providerInput.optional(),
    brevo: providerInput.optional(),
    mailgun: providerInput.optional(),
    smtp: providerInput.optional(),
  })
  .strict();

export const revealEmailSecretsSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export const testEmailSchema = z.object({
  to: withSafeInput(z.string().trim().min(1, "Email is required").max(255).email("Enter a valid email address")),
});
