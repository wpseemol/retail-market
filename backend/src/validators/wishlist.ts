import { z } from "zod";

const productId = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^\d{1,19}$/, "Invalid product id"));

export const wishlistAddSchema = z.object({
  product_id: productId,
});

export const wishlistProductParamSchema = z.object({
  productId,
});
