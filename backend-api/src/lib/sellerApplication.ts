import type {
  Media,
  SellerApplication,
  SellerApplicationDocument,
  SellerDocType,
  User,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import { toPublicMedia } from "./user.js";
import { ensureKycSettings, parsePartnerTerms, type PartnerTerms } from "./kyc.js";

export type ApplicationWithDocs = SellerApplication & {
  documents: Array<SellerApplicationDocument & { media: Media }>;
  user?: Pick<
    User,
    "id" | "first_name" | "last_name" | "email" | "phone" | "email_verified_at" | "phone_verified_at" | "role"
  >;
};

const IDENTITY_DOC_SETS: SellerDocType[][] = [
  ["nid_front", "nid_back"],
  ["birth_certificate"],
];

export function hasRequiredIdentityDocs(docTypes: SellerDocType[]): boolean {
  const set = new Set(docTypes);
  return IDENTITY_DOC_SETS.some((need) => need.every((t) => set.has(t)));
}

export function docsChecklist(docTypes: SellerDocType[]) {
  const set = new Set(docTypes);
  return {
    nid_front: set.has("nid_front"),
    nid_back: set.has("nid_back"),
    birth_certificate: set.has("birth_certificate"),
    trade_license: set.has("trade_license"),
    other: set.has("other"),
    identity_complete: hasRequiredIdentityDocs(docTypes),
    required_hint:
      "Upload NID front and back, or a birth certificate. Trade license is optional.",
  };
}

/** Staff document authenticity checklist (manual review — not a government proof). */
export const STAFF_DOC_CHECKLIST = [
  {
    id: "readable",
    label: "Document image is sharp and fully readable (no heavy blur or crop)",
  },
  {
    id: "name_match",
    label: "Name on the document matches the account / shop applicant name",
  },
  {
    id: "nid_format",
    label: "If NID: number looks like a Bangladesh NID (10 or 17 digits) and both sides match",
  },
  {
    id: "birth_cert",
    label: "If birth certificate: official seal/header visible; details consistent",
  },
  {
    id: "not_tampered",
    label: "No obvious photoshop, mismatched fonts, or copy-paste artifacts",
  },
  {
    id: "not_expired",
    label: "Document does not appear expired or replaced (when dates are visible)",
  },
] as const;

export async function getPublicSellerTerms(): Promise<{
  terms: PartnerTerms;
  kyc_mode: string;
  paid_kyc_enabled: boolean;
  staff_checklist: typeof STAFF_DOC_CHECKLIST;
}> {
  const row = await ensureKycSettings();
  return {
    terms: parsePartnerTerms(row.partner_terms),
    kyc_mode: row.mode,
    paid_kyc_enabled: row.is_enabled && row.mode === "paid_api",
    staff_checklist: STAFF_DOC_CHECKLIST,
  };
}

export function toPublicApplication(row: ApplicationWithDocs) {
  const docTypes = row.documents.map((d) => d.doc_type);
  return {
    id: row.id.toString(),
    status: row.status,
    shop_name: row.shop_name,
    shop_name_bn: row.shop_name_bn,
    description: row.description,
    contact_phone: row.contact_phone,
    business_address: row.business_address,
    rejection_reason: row.rejection_reason,
    accepted_fee_terms_at: row.accepted_fee_terms_at?.toISOString() ?? null,
    fee_snapshot: row.fee_snapshot,
    kyc_provider_result: row.kyc_provider_result,
    vendor_id: row.vendor_id?.toString() ?? null,
    reviewed_at: row.reviewed_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    documents: row.documents.map((d) => ({
      id: d.id.toString(),
      doc_type: d.doc_type,
      label: d.label,
      media: toPublicMedia(d.media),
      created_at: d.created_at.toISOString(),
    })),
    docs_checklist: docsChecklist(docTypes),
    user: row.user
      ? {
          id: row.user.id.toString(),
          first_name: row.user.first_name,
          last_name: row.user.last_name,
          email: row.user.email,
          phone: row.user.phone,
          email_verified: Boolean(row.user.email_verified_at),
          phone_verified: Boolean(row.user.phone_verified_at),
          role: row.user.role,
        }
      : undefined,
  };
}

export async function findOpenApplicationForUser(userId: bigint) {
  return prisma.sellerApplication.findFirst({
    where: {
      user_id: userId,
      status: { in: ["draft", "submitted", "under_review", "rejected"] },
    },
    include: {
      documents: { include: { media: true }, orderBy: { created_at: "asc" } },
    },
    orderBy: { updated_at: "desc" },
  });
}

export const applicationInclude = {
  documents: { include: { media: true }, orderBy: { created_at: "asc" as const } },
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      email_verified_at: true,
      phone_verified_at: true,
      role: true,
    },
  },
} as const;
