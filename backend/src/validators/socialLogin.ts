import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const clientIdField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .max(255)
        .regex(/^[A-Za-z0-9._-]+$/, "Only letters, numbers, dot, dash and underscore"),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const appleIdField = z
  .union([
    z.string().trim().regex(/^[A-Z0-9]{10}$/, "Must be 10 uppercase letters or digits"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

/**
 * Secrets: `undefined` keeps the stored value, `null` clears it, a string replaces it.
 * Strict allow-lists instead of `withSafeInput` — PEM keys legitimately contain `-----`.
 */
const clientSecretField = z
  .union([
    z
      .string()
      .trim()
      .min(8, "Secret looks too short")
      .max(512)
      .regex(/^[A-Za-z0-9._~+/=-]+$/, "Secret contains unsupported characters"),
    z.null(),
  ])
  .optional();

const privateKeyField = z
  .union([
    z
      .string()
      .trim()
      .max(4096)
      .regex(
        /^-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END PRIVATE KEY-----$/,
        "Paste the full .p8 key including BEGIN/END PRIVATE KEY lines",
      ),
    z.null(),
  ])
  .optional();

const googleUpdate = z
  .object({
    is_enabled: z.boolean().optional(),
    client_id: clientIdField,
    client_secret: clientSecretField,
  })
  .strict();

const facebookUpdate = googleUpdate;

const appleUpdate = z
  .object({
    is_enabled: z.boolean().optional(),
    client_id: clientIdField,
    team_id: appleIdField,
    key_id: appleIdField,
    private_key: privateKeyField,
  })
  .strict();

export const updateSocialLoginSchema = z
  .object({
    google: googleUpdate.optional(),
    facebook: facebookUpdate.optional(),
    apple: appleUpdate.optional(),
  })
  .strict();

export const revealSocialSecretsSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export type UpdateSocialLoginInput = z.infer<typeof updateSocialLoginSchema>;
