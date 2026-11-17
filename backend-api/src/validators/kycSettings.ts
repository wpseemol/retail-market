import { z } from "zod";
import { findUnsafeInputReason } from "./customerAuth.js";
import { KYC_PROVIDERS } from "../lib/kyc.js";

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const optionalSafe = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.null()])
    .transform((v) => (v ? v : null))
    .optional();

export const updateKycSettingsSchema = z
  .object({
    mode: z.enum(["staff", "paid_api"]).optional(),
    is_enabled: z.boolean().optional(),
    provider: z.enum(KYC_PROVIDERS).nullable().optional(),
    api_key: z
      .union([
        z
          .string()
          .trim()
          .min(8)
          .max(255)
          .regex(/^[A-Za-z0-9._:-]+$/, "Only letters, numbers, and . _ : -"),
        z.null(),
      ])
      .optional(),
    api_base_url: optionalSafe(255),
    partner_terms: z
      .object({
        title: withSafeInput(z.string().trim().min(2).max(120)),
        summary: withSafeInput(z.string().trim().min(10).max(2000)),
        default_commission_percent: z.number().min(0).max(100),
        fee_plans: z
          .array(
            z.object({
              id: z.enum(["commission", "rent", "both"]),
              label: withSafeInput(z.string().trim().min(1).max(80)),
              description: withSafeInput(z.string().trim().min(1).max(500)),
            }),
          )
          .min(1)
          .max(5),
        rent_note: withSafeInput(z.string().trim().min(1).max(1000)),
        checklist: z.array(withSafeInput(z.string().trim().min(1).max(200))).min(1).max(12),
      })
      .optional(),
  })
  .strict();

export const revealKycSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();
