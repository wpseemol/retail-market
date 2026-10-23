import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { findUnsafeInputReason } from "./customerAuth";

const safe = (schema: z.ZodString) =>
  schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });

export const BULK_MAX_LINES = 100;
export const BULK_MAX_QTY = 5000;

const lineSchema = z.object({
  product_id: z.string().regex(/^\d+$/),
  name: z.string().min(1).max(255),
  unit_price: z.number().finite().nonnegative(),
  stock_qty: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(BULK_MAX_QTY),
  image: z.string().nullable(),
});

export function bulkOrderFormSchema(messages: {
  emptyLines: string;
  maxLines: string;
  emailRequired: string;
  emailInvalid: string;
  nameRequired: string;
  phoneRequired: string;
  phoneInvalid: string;
  addressRequired: string;
  cityRequired: string;
  postalRequired: string;
  countryRequired: string;
}) {
  return z.object({
    lines: z.array(lineSchema).min(1, messages.emptyLines).max(BULK_MAX_LINES, messages.maxLines),
    email: safe(z.string().trim().min(1, messages.emailRequired).email(messages.emailInvalid).max(255)),
    full_name: safe(z.string().trim().min(1, messages.nameRequired).max(150)),
    phone: safe(z.string().trim().min(1, messages.phoneRequired)).refine(
      (value) => normalizePhone(value) !== null,
      messages.phoneInvalid,
    ),
    line1: safe(z.string().trim().min(1, messages.addressRequired).max(255)),
    line2: safe(z.string().trim().max(255)),
    city: safe(z.string().trim().min(1, messages.cityRequired).max(100)),
    postal_code: safe(z.string().trim().min(1, messages.postalRequired).max(20)),
    country: safe(z.string().trim().min(2, messages.countryRequired).max(56)),
    payment_method: z.enum(["cash_on_delivery", "sslcommerz"]),
    notes: safe(z.string().trim().max(2000)),
    coupon_code: safe(z.string().trim().max(32)),
  });
}

export type BulkOrderFormValues = z.infer<ReturnType<typeof bulkOrderFormSchema>>;
