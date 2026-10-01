import { z } from "zod";

const money = z.coerce.number().finite().min(0).max(1_000_000);

export const updateShippingSettingsSchema = z
  .object({
    default_fee: money.optional(),
    /** `null` disables free shipping. */
    free_threshold: money.nullable().optional(),
    vendor_override: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");
