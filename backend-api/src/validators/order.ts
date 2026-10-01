import { z } from "zod";
import { phoneField, withSafeInput } from "./customerAuth.js";
import { productIdField as orderProductId } from "./productId.js";

const safeStr = (min: number, max: number) =>
  withSafeInput(z.string().trim().min(min).max(max));

/** Price and name come from the database; `name` / `unit_price` are accepted but ignored. */
export const placeOrderItemSchema = z.object({
  product_id: orderProductId,
  name: safeStr(1, 255).optional(),
  unit_price: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const placeOrderAddressSchema = z.object({
  full_name: safeStr(1, 150),
  phone: phoneField,
  line1: safeStr(1, 255),
  line2: withSafeInput(z.string().trim().max(255)).optional().or(z.literal("")),
  city: safeStr(1, 100),
  state: withSafeInput(z.string().trim().max(100)).optional().or(z.literal("")),
  postal_code: safeStr(1, 20),
  country: safeStr(2, 56),
});

export const placeOrderSchema = z.object({
  /** Contact email — required for guest checkout; defaults to the account email when logged in. */
  email: withSafeInput(z.string().trim().toLowerCase().email().max(255)).optional(),
  items: z.array(placeOrderItemSchema).min(1).max(50),
  billing: placeOrderAddressSchema,
  shipping: placeOrderAddressSchema.optional(),
  /** Storefront accepts only COD and SSLCOMMERZ (bKash / Nagad / Rocket / cards). */
  payment_method: z.enum(["cash_on_delivery", "sslcommerz"]),
  notes: withSafeInput(z.string().trim().max(2000)).optional().or(z.literal("")),
  discount_amount: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  /** Ignored — shipping is computed server-side. Kept so older clients still validate. */
  shipping_fee: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const shippingQuoteSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.union([z.string(), z.number()]).optional(),
        unit_price: z.coerce.number().finite().nonnegative().max(1_000_000),
        quantity: z.coerce.number().int().min(1).max(99),
      }),
    )
    .max(50),
});

export const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

/** `cod` = cash on delivery; the rest is the wallet/card used on SSLCOMMERZ (`online` = not paid yet). */
export const ORDER_PAYMENT_FILTERS = ["cod", "bkash", "nagad", "rocket", "card", "other", "online"] as const;

/** Comma-separated list, e.g. `status=confirmed,processing`; `all` or empty = no filter. */
const statusListField = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v, ctx) => {
    if (!v || v === "all") return [] as OrderStatusValue[];
    const parts = [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))];
    const bad = parts.filter((s) => !(ORDER_STATUSES as readonly string[]).includes(s));
    if (bad.length > 0) {
      ctx.addIssue({ code: "custom", message: `Unknown status: ${bad.join(", ")}` });
      return z.NEVER;
    }
    return parts as OrderStatusValue[];
  });

const orderFiltersShape = {
  status: statusListField,
  q: withSafeInput(z.string().trim().max(100)).optional(),
  payment_status: z.enum(["pending", "paid", "failed", "refunded", "partially_refunded", "all"]).optional(),
  payment_method: z.enum([...ORDER_PAYMENT_FILTERS, "all"]).optional(),
};

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ...orderFiltersShape,
});

export const exportOrdersQuerySchema = z.object(orderFiltersShape);

export type OrderFilters = z.infer<typeof exportOrdersQuerySchema>;

const optionalShipText = (max: number) =>
  withSafeInput(z.string().trim().max(max)).optional().or(z.literal("")).or(z.null());

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  courier_name: optionalShipText(80),
  tracking_number: optionalShipText(80),
});

export const updateOrderTrackingSchema = z.object({
  courier_name: optionalShipText(80),
  tracking_number: optionalShipText(80),
});

const orderIdList = z
  .array(z.string().trim().regex(/^\d{1,19}$/, "Invalid order id"))
  .min(1, "Select at least one order")
  .max(100, "Update at most 100 orders at a time");

export const bulkOrderStatusSchema = z.object({
  ids: orderIdList,
  status: z.enum(ORDER_STATUSES),
});

export const bulkOrderDeleteSchema = z.object({ ids: orderIdList });
