import { z } from "zod";
import { findUnsafeInputReason } from "./customerAuth";

const safe = (schema: z.ZodString) =>
  schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });

export const sellerDocTypes = [
  "nid_front",
  "nid_back",
  "birth_certificate",
  "trade_license",
  "other",
] as const;

export const becomeSellerDraftSchema = z.object({
  shop_name: safe(z.string().trim().min(2, "Shop name is required").max(200)),
  shop_name_bn: safe(z.string().trim().max(200)).optional().or(z.literal("")),
  description: safe(z.string().trim().max(5000)).optional().or(z.literal("")),
  contact_phone: safe(z.string().trim().max(30)).optional().or(z.literal("")),
  business_address: safe(z.string().trim().max(500)).optional().or(z.literal("")),
});

export type BecomeSellerDraftInput = z.infer<typeof becomeSellerDraftSchema>;

export const becomeSellerSubmitSchema = z.object({
  accept_fee_terms: z.literal(true, {
    message: "Accept the partner fee and rent terms to continue",
  }),
});

export const SELLER_KYC_MAX_BYTES = 2 * 1024 * 1024;
export const SELLER_KYC_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function validateSellerKycFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    return "Only JPEG, PNG, WebP, or GIF images are allowed";
  }
  if (file.size > SELLER_KYC_MAX_BYTES) {
    return "Each document image must be 2 MB or smaller";
  }
  if (/\.svg$/i.test(file.name) || /[<>]|<\?|javascript:/i.test(file.name)) {
    return "Invalid file name";
  }
  return null;
}
