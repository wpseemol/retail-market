import { z } from "zod";
import { normalizePhone, PHONE_FORMAT_MESSAGE } from "@/lib/phone";
import { findUnsafeInputReason } from "./customerAuth";

export { normalizePhone, PHONE_FORMAT_MESSAGE };

const safe = (schema: z.ZodString) =>
  schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });

export const phoneSchema = safe(z.string().trim().min(1, "Mobile number is required")).refine(
  (value) => normalizePhone(value) !== null,
  PHONE_FORMAT_MESSAGE,
);

export const checkoutContactSchema = z.object({
  email: safe(
    z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(255),
  ),
  phone: phoneSchema,
});

export type CheckoutContactField = keyof z.infer<typeof checkoutContactSchema>;

export function validateCheckoutContact(data: { email: string; phone: string }) {
  const parsed = checkoutContactSchema.safeParse(data);
  if (parsed.success) return { success: true as const, errors: {} };
  const errors: Partial<Record<CheckoutContactField, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as CheckoutContactField | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { success: false as const, errors };
}

export const verificationCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
