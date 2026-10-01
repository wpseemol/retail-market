import { z } from "zod";
import { productIdField as productId } from "./productId.js";

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

const quantity = z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY);

export const cartLineInputSchema = z.object({
  product_id: productId,
  quantity,
  selected: z.boolean().optional(),
});

export const cartAddSchema = z.object({
  product_id: productId,
  quantity: quantity.default(1),
});

export const cartProductParamSchema = z.object({
  productId,
});

export const cartLineUpdateSchema = z
  .object({
    quantity: quantity.optional(),
    selected: z.boolean().optional(),
  })
  .refine((v) => v.quantity !== undefined || v.selected !== undefined, {
    message: "Send quantity or selected",
  });

export const cartSelectionSchema = z.object({
  selected: z.boolean(),
  /** Only these products; omitted = every line in the cart. */
  product_ids: z.array(productId).max(MAX_CART_LINES).optional(),
});

export const cartLinesSchema = z.object({
  items: z.array(cartLineInputSchema).max(MAX_CART_LINES),
});

export type CartLineInput = z.infer<typeof cartLineInputSchema>;
