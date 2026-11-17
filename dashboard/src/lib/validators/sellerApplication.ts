import { z } from "zod";
import { withSafeInput } from "./safeInput";

export const SELLER_DOC_TYPES = [
  "nid_front",
  "nid_back",
  "birth_certificate",
  "trade_license",
  "other",
] as const;

export const SELLER_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;

export type SellerDocType = (typeof SELLER_DOC_TYPES)[number];
export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

export type SellerApplicationDto = {
  id: string;
  status: SellerApplicationStatus;
  shop_name: string | null;
  shop_name_bn: string | null;
  description: string | null;
  contact_phone: string | null;
  business_address: string | null;
  rejection_reason: string | null;
  accepted_fee_terms_at: string | null;
  vendor_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  documents: Array<{
    id: string;
    doc_type: SellerDocType;
    label: string | null;
    media: { path: string; file_name: string } | null;
    /** Auth-only download path (Bearer). Prefer this over media.path for img tags. */
    file_url?: string;
    created_at: string;
  }>;
  docs_checklist: {
    nid_front: boolean;
    nid_back: boolean;
    birth_certificate: boolean;
    trade_license: boolean;
    other: boolean;
    identity_complete: boolean;
    required_hint: string;
  };
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    email_verified: boolean;
    phone_verified: boolean;
    role: string;
  };
};

export type StaffChecklistItem = { id: string; label: string };

export const reviewSellerApplicationSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    rejection_reason: withSafeInput(z.string().trim().max(1000)).optional(),
    activate_shop: z.boolean().optional(),
    staff_checklist_confirmed: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "reject" && !data.rejection_reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["rejection_reason"],
        message: "Rejection reason is required",
      });
    }
    if (data.action === "approve" && data.staff_checklist_confirmed !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["staff_checklist_confirmed"],
        message: "Confirm the staff authenticity checklist before approving",
      });
    }
  });

export type ReviewSellerApplicationValues = z.infer<
  typeof reviewSellerApplicationSchema
>;

export const DOC_TYPE_LABELS: Record<SellerDocType, string> = {
  nid_front: "NID front",
  nid_back: "NID back",
  birth_certificate: "Birth certificate",
  trade_license: "Trade license",
  other: "Other",
};
