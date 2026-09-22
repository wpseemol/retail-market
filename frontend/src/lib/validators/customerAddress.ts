import { z } from "zod";
import { findUnsafeInputReason } from "./customerAuth";

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .superRefine((value, ctx) => {
      if (!value) return;
      const reason = findUnsafeInputReason(value);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    });

const requiredText = (min: number, max: number, label: string) =>
  withSafeInput(
    z
      .string()
      .trim()
      .min(min, `${label} is required`)
      .max(max, `${label} is too long`),
  );

export const addressFormSchema = z.object({
  label: optionalText(50),
  full_name: requiredText(2, 150, "Full name"),
  phone: withSafeInput(
    z
      .string()
      .trim()
      .min(6, "Enter a valid phone number")
      .max(30, "Phone is too long")
      .regex(/^[+\d][\d\s().-]{5,29}$/, "Enter a valid phone number"),
  ),
  line1: requiredText(3, 255, "Address line 1"),
  line2: optionalText(255),
  city: requiredText(2, 100, "City"),
  state: optionalText(100),
  postal_code: requiredText(2, 20, "Postal code"),
  country: z
    .string()
    .trim()
    .length(2, "Use a 2-letter country code")
    .superRefine((value, ctx) => {
      const reason = findUnsafeInputReason(value);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    })
    .transform((v) => v.toUpperCase()),
  type: z.enum(["shipping", "billing", "both"]),
  is_default_shipping: z.boolean(),
  is_default_billing: z.boolean(),
});

export type AddressFormInput = z.infer<typeof addressFormSchema>;
export type AddressFormField = keyof AddressFormInput;

const fieldSchemas = {
  label: optionalText(50),
  full_name: requiredText(2, 150, "Full name"),
  phone: withSafeInput(
    z
      .string()
      .trim()
      .min(6, "Enter a valid phone number")
      .max(30, "Phone is too long")
      .regex(/^[+\d][\d\s().-]{5,29}$/, "Enter a valid phone number"),
  ),
  line1: requiredText(3, 255, "Address line 1"),
  line2: optionalText(255),
  city: requiredText(2, 100, "City"),
  state: optionalText(100),
  postal_code: requiredText(2, 20, "Postal code"),
  country: z
    .string()
    .trim()
    .length(2, "Use a 2-letter country code")
    .superRefine((value, ctx) => {
      const reason = findUnsafeInputReason(value);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    }),
  type: z.enum(["shipping", "billing", "both"]),
  is_default_shipping: z.boolean(),
  is_default_billing: z.boolean(),
} as const;

export function validateAddressField(
  field: AddressFormField,
  value: string | boolean,
): string | undefined {
  const schema = fieldSchemas[field];
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}

export function validateAddressForm(data: {
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  type: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}):
  | { success: true; data: AddressFormInput }
  | { success: false; errors: Partial<Record<AddressFormField, string>> } {
  const parsed = addressFormSchema.safeParse({
    ...data,
    country: data.country.trim().toUpperCase() || "BD",
    type:
      data.type === "shipping" ||
      data.type === "billing" ||
      data.type === "both"
        ? data.type
        : "both",
  });

  if (!parsed.success) {
    const errors: Partial<Record<AddressFormField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as AddressFormField | undefined;
      if (key && errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, data: parsed.data };
}

export type CustomerAddress = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  type: "shipping" | "billing" | "both";
  is_default_shipping: boolean;
  is_default_billing: boolean;
  created_at: string;
  updated_at: string;
};
