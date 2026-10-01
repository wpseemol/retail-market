import { z } from "zod";
import { findUnsafeInputReason } from "./customerAuth.js";

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) {
      ctx.addIssue({ code: "custom", message: reason });
    }
  });
}

const optionalSafe = (max: number) =>
  z
    .union([z.string(), z.null(), z.literal("")])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const reason = findUnsafeInputReason(trimmed);
      if (reason) {
        ctx.addIssue({ code: "custom", message: reason });
        return z.NEVER;
      }
      if (trimmed.length > max) {
        ctx.addIssue({
          code: "custom",
          message: `Must be at most ${max} characters`,
        });
        return z.NEVER;
      }
      return trimmed;
    });

const requiredSafe = (min: number, max: number, label: string) =>
  withSafeInput(
    z
      .string()
      .trim()
      .min(min, `${label} is required`)
      .max(max, `${label} is too long`),
  );

export const addressBodySchema = z.object({
  label: optionalSafe(50),
  full_name: requiredSafe(2, 150, "Full name"),
  phone: withSafeInput(
    z
      .string()
      .trim()
      .min(6, "Enter a valid phone number")
      .max(30, "Phone is too long")
      .regex(/^[+\d][\d\s().-]{5,29}$/, "Enter a valid phone number"),
  ),
  line1: requiredSafe(3, 255, "Address line 1"),
  line2: optionalSafe(255),
  city: requiredSafe(2, 100, "City"),
  state: optionalSafe(100),
  postal_code: requiredSafe(2, 20, "Postal code"),
  country: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((value, ctx) => {
      const raw = (value ?? "BD").toString().trim().toUpperCase() || "BD";
      const reason = findUnsafeInputReason(raw);
      if (reason) {
        ctx.addIssue({ code: "custom", message: reason });
        return z.NEVER;
      }
      if (raw.length !== 2) {
        ctx.addIssue({
          code: "custom",
          message: "Country must be a 2-letter code",
        });
        return z.NEVER;
      }
      return raw;
    }),
  type: z.enum(["shipping", "billing", "both"]).optional().default("both"),
  is_default_shipping: z.boolean().optional().default(false),
  is_default_billing: z.boolean().optional().default(false),
});

export const createAddressSchema = addressBodySchema;
export const updateAddressSchema = addressBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
