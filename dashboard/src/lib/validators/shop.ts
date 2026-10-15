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
      .min(2, "Store name must be at least 2 characters")
      .max(200, "Store name must be at most 200 characters"),
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
  /** UI-only switch; when off the Bangla fields are sent as null. */
  bn_enabled: z.boolean(),
  shop_name_bn: withSafeInput(
    z.string().trim().max(200, "Bangla store name must be at most 200 characters"),
  ),
  description_bn: withSafeInput(z.string().trim().max(5000)),
  status: z.enum(["draft", "publish"] as const),
  /** Super admin only — owner user id (digits). Empty string when unused. */
  user_id: z.string().regex(/^(\d+)?$/, "Invalid owner"),
});

export type ShopCreateFormValues = z.infer<typeof shopCreateFormSchema>;

/** Copy for the shared Bangla version fields; limits match the API. */
export const STORE_BANGLA_COPY = {
  help: "Optional. Shoppers using Bangla see this store name and description on the store page and directory; if empty they see the English text. The slug stays the same.",
  nameLabel: "Bangla store name",
  nameMax: 200,
  descriptionMax: 5000,
  namePlaceholder: "নিয়েনিন গ্যাজেটস",
  descriptionPlaceholder: "দোকান সম্পর্কে ছোট বিবরণ",
};

/** Bangla fields on the store edit page (which keeps its other fields in plain state). */
export const shopBanglaSchema = shopCreateFormSchema.pick({
  shop_name_bn: true,
  description_bn: true,
});

/** Single Bangla string for the API: trimmed, or null when the switch is off / blank. */
export function bnOrNull(enabled: boolean, value: string): string | null {
  const v = enabled ? value.trim() : "";
  return v || null;
}

export function toShopCreateApiBody(
  values: ShopCreateFormValues,
  options?: { includeOwner?: boolean },
) {
  return {
    shop_name: values.shop_name,
    slug: values.slug,
    description: values.description.trim() ? values.description.trim() : null,
    shop_name_bn: bnOrNull(values.bn_enabled, values.shop_name_bn),
    description_bn: bnOrNull(values.bn_enabled, values.description_bn),
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
