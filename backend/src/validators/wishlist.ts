import { z } from "zod";
import { productIdField as productId } from "./productId.js";

export const wishlistAddSchema = z.object({
  product_id: productId,
});

export const wishlistProductParamSchema = z.object({
  productId,
});
