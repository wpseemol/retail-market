import type { KycMode, KycSettings, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { decryptSecret } from "./secretBox.js";

export const KYC_PROVIDERS = ["porichoy"] as const;
export type KycProviderId = (typeof KYC_PROVIDERS)[number];

export type PartnerTerms = {
  title: string;
  summary: string;
  default_commission_percent: number;
  fee_plans: Array<{
    id: "commission" | "rent" | "both";
    label: string;
    description: string;
  }>;
  rent_note: string;
  checklist: string[];
};

export const DEFAULT_PARTNER_TERMS: PartnerTerms = {
  title: "Partner seller terms",
  summary:
    "After approval you sell through your own store on Niyenin. Platform fees are set by Niyenin for each partner store. Rent is not deducted automatically at checkout yet (Phase 2).",
  default_commission_percent: 3,
  fee_plans: [
    {
      id: "commission",
      label: "Commission",
      description:
        "Niyenin takes a percent of product subtotal on each order (default partner rate is typically around 3%; your exact rate is set after approval).",
    },
    {
      id: "rent",
      label: "Rent",
      description:
        "A fixed monthly or yearly rent in BDT instead of (or instead of only) commission. Exact amount and period are set by Niyenin after approval.",
    },
    {
      id: "both",
      label: "Commission + rent",
      description:
        "Both a commission percent and a fixed rent. Exact numbers are confirmed by Niyenin before your store goes live.",
    },
  ],
  rent_note:
    "You will see your assigned fee plan on the store settings page after staff approve your application. Ask support if anything is unclear before listing products.",
  checklist: [
    "Create a customer account and verify email and phone.",
    "Submit shop details and identity documents (NID front+back, or a birth certificate).",
    "Accept these fee and rent terms.",
    "Wait for an admin or super admin to review documents and approve.",
    "After approval, sign in to the seller dashboard to manage your store.",
  ],
};

const CACHE_MS = 30_000;
let cache: { at: number; row: KycSettings } | null = null;

export function invalidateKycCache() {
  cache = null;
}

export async function ensureKycSettings(): Promise<KycSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.row;
  let row = await prisma.kycSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.kycSettings.create({
      data: {
        id: 1,
        mode: "staff",
        is_enabled: false,
        partner_terms: DEFAULT_PARTNER_TERMS as unknown as Prisma.InputJsonValue,
      },
    });
  }
  cache = { at: Date.now(), row };
  return row;
}

export function parsePartnerTerms(value: unknown): PartnerTerms {
  if (!value || typeof value !== "object") return DEFAULT_PARTNER_TERMS;
  const raw = value as Partial<PartnerTerms>;
  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : DEFAULT_PARTNER_TERMS.title,
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary
        : DEFAULT_PARTNER_TERMS.summary,
    default_commission_percent:
      typeof raw.default_commission_percent === "number" &&
      Number.isFinite(raw.default_commission_percent)
        ? raw.default_commission_percent
        : DEFAULT_PARTNER_TERMS.default_commission_percent,
    fee_plans:
      Array.isArray(raw.fee_plans) && raw.fee_plans.length > 0
        ? (raw.fee_plans as PartnerTerms["fee_plans"])
        : DEFAULT_PARTNER_TERMS.fee_plans,
    rent_note:
      typeof raw.rent_note === "string" && raw.rent_note.trim()
        ? raw.rent_note
        : DEFAULT_PARTNER_TERMS.rent_note,
    checklist:
      Array.isArray(raw.checklist) && raw.checklist.every((x) => typeof x === "string")
        ? (raw.checklist as string[])
        : DEFAULT_PARTNER_TERMS.checklist,
  };
}

export function isKycMode(value: unknown): value is KycMode {
  return value === "staff" || value === "paid_api";
}

export function isKycProvider(value: unknown): value is KycProviderId {
  return (KYC_PROVIDERS as readonly unknown[]).includes(value);
}

/** Paid API path is ready when enabled, mode is paid_api, provider + key set. */
export function kycPaidApiReady(row: KycSettings): boolean {
  return (
    row.is_enabled &&
    row.mode === "paid_api" &&
    Boolean(row.provider?.trim()) &&
    Boolean(row.api_key_enc)
  );
}

/**
 * Stub for a future paid KYC HTTP call (e.g. Porichoy).
 * Staff mode always returns skipped. Paid mode without a live integration returns not_configured.
 */
export async function verifyIdentityWithProvider(input: {
  docType: string;
  applicantName: string;
}): Promise<{
  status: "skipped" | "not_configured" | "accepted" | "rejected";
  provider: string | null;
  message: string;
  raw?: unknown;
}> {
  const row = await ensureKycSettings();
  if (row.mode !== "paid_api" || !row.is_enabled) {
    return {
      status: "skipped",
      provider: null,
      message: "Staff review mode — no paid KYC provider called",
    };
  }
  if (!kycPaidApiReady(row)) {
    return {
      status: "not_configured",
      provider: row.provider,
      message: "Paid KYC is enabled but provider credentials are incomplete",
    };
  }
  const key = decryptSecret(row.api_key_enc);
  if (!key) {
    return {
      status: "not_configured",
      provider: row.provider,
      message: "KYC API key cannot be decrypted",
    };
  }
  // Live HTTP integration ships when keys + provider contract are ready.
  void input;
  return {
    status: "not_configured",
    provider: row.provider,
    message:
      "Paid KYC provider adapter is not connected yet. Staff must still complete the document checklist before approve.",
    raw: { stub: true },
  };
}
