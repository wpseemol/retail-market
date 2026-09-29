import { z } from "zod";

export type ShippingSettingsDto = {
  default_fee: number;
  free_threshold: number | null;
  vendor_override: boolean;
};

const money = z
  .number({ message: "Enter an amount" })
  .finite()
  .min(0, "Cannot be negative")
  .max(1_000_000, "Too large");

export const shippingSettingsFormSchema = z
  .object({
    default_fee: money,
    free_enabled: z.boolean(),
    free_threshold: money,
    vendor_override: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.free_enabled && v.free_threshold <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["free_threshold"],
        message: "Enter the order amount that unlocks free shipping",
      });
    }
  });

export type ShippingSettingsFormValues = z.infer<typeof shippingSettingsFormSchema>;

export function toShippingFormValues(s: ShippingSettingsDto): ShippingSettingsFormValues {
  return {
    default_fee: s.default_fee,
    free_enabled: s.free_threshold !== null,
    free_threshold: s.free_threshold ?? 1000,
    vendor_override: s.vendor_override,
  };
}

export function toShippingApiBody(v: ShippingSettingsFormValues) {
  return {
    default_fee: v.default_fee,
    free_threshold: v.free_enabled ? v.free_threshold : null,
    vendor_override: v.vendor_override,
  };
}
