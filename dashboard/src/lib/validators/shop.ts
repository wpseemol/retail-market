import { z } from "zod";
import {
  firstZodError,
  validateSafeImageFile,
  withSafeInput,
} from "./safeInput";
import type { ShopCreateStatus } from "@/lib/shops";
import { shopCreateStatusToApi } from "@/lib/shops";

/** Matches backend shop logo limit (`AVATAR_MAX_BYTES`). */
export const SHOP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const shopCreateFormSchema = z.object({
  shop_name: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Shop name must be at least 2 characters")
      .max(200, "Shop name must be at most 200 characters"),
  ),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ),
  description: withSafeInput(z.string().trim().max(5000)),
  status: z.enum(["draft", "publish"] as const),
  /** Super admin only — owner user id (digits). Empty string when unused. */
  user_id: z.string().regex(/^(\d+)?$/, "Invalid owner"),
});

export type ShopCreateFormValues = z.infer<typeof shopCreateFormSchema>;

export function toShopCreateApiBody(
  values: ShopCreateFormValues,
  options?: { includeOwner?: boolean },
) {
  return {
    shop_name: values.shop_name,
    slug: values.slug,
    description: values.description.trim() ? values.description.trim() : null,
    status: shopCreateStatusToApi(values.status as ShopCreateStatus),
    ...(options?.includeOwner && values.user_id
      ? { user_id: values.user_id }
      : {}),
  };
}

export function validateShopImageFile(
  file: File | null | undefined,
): { ok: true } | { ok: false; message: string } {
  return validateSafeImageFile(file, SHOP_IMAGE_MAX_BYTES, "Store image");
}

export { firstZodError };
