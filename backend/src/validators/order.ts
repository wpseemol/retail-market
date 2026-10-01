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

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "all",
    ])
    .optional()
    .default("all"),
});
