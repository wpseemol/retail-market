import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const safeStr = (min: number, max: number) =>
  withSafeInput(z.string().trim().min(min).max(max));

export const placeOrderItemSchema = z.object({
  product_id: z.union([z.string(), z.number()]).optional(),
  name: safeStr(1, 255),
  unit_price: z.coerce.number().finite().nonnegative().max(1_000_000),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const placeOrderAddressSchema = z.object({
  full_name: safeStr(1, 150),
  phone: safeStr(1, 30),
  line1: safeStr(1, 255),
  line2: withSafeInput(z.string().trim().max(255)).optional().or(z.literal("")),
  city: safeStr(1, 100),
  state: withSafeInput(z.string().trim().max(100)).optional().or(z.literal("")),
  postal_code: safeStr(1, 20),
  country: safeStr(2, 56),
});

export const placeOrderSchema = z.object({
  items: z.array(placeOrderItemSchema).min(1).max(50),
  billing: placeOrderAddressSchema,
  shipping: placeOrderAddressSchema.optional(),
  payment_method: z.enum([
    "cash_on_delivery",
    "card",
    "mobile_banking",
    "bank_transfer",
    "wallet",
  ]),
  notes: withSafeInput(z.string().trim().max(2000)).optional().or(z.literal("")),
  discount_amount: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
  shipping_fee: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

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
