import { z } from "zod";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/cartTypes";

const productId = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^\d{1,19}$/, "Invalid product id"));

const quantity = z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY);

/** Body for `POST /api/guest-cart` (guest cart mutations stored in the encrypted cookie). */
export const guestCartActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), product_id: productId, quantity: quantity.default(1) }),
  z.object({
    action: z.literal("update"),
    product_id: productId,
    quantity: quantity.optional(),
    selected: z.boolean().optional(),
  }),
  z.object({ action: z.literal("remove"), product_ids: z.array(productId).min(1).max(MAX_CART_LINES) }),
  z.object({
    action: z.literal("select"),
    selected: z.boolean(),
    /** Omitted = every line. */
    product_ids: z.array(productId).max(MAX_CART_LINES).optional(),
  }),
]);

export type GuestCartAction = z.input<typeof guestCartActionSchema>;
