import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/** Google site / secret keys — alphanumeric + dashes / underscores. */
const siteKeyField = z
  .union([
    withSafeInput(
      z
        .string()
        .trim()
        .min(10, "Site key looks too short")
        .max(255)
        .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, dash and underscore"),
    ),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform(emptyToNull);

const secretKeyField = z
  .union([
    z
      .string()
      .trim()
      .min(10, "Secret key looks too short")
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, dash and underscore"),
    z.null(),
  ])
  .optional();

export const updateRecaptchaSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    version: z.enum(["v2", "v3"]).optional(),
    site_key: siteKeyField,
    secret_key: secretKeyField,
    v3_min_score: z.number().min(0).max(1).optional(),
  })
  .strict();

export const revealRecaptchaSchema = z
  .object({
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();
