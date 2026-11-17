import { z } from "zod";
import { withSafeInput } from "./safeInput";

export const KYC_MODES = ["staff", "paid_api"] as const;
export type KycMode = (typeof KYC_MODES)[number];
export const KYC_PROVIDERS = ["porichoy"] as const;

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

export type StaffChecklistItem = { id: string; label: string };

export type KycDto = {
  mode: KycMode;
  is_enabled: boolean;
  provider: string | null;
  has_api_key: boolean;
  api_base_url: string | null;
  ready: boolean;
  partner_terms: PartnerTerms;
  staff_checklist: StaffChecklistItem[];
  updated_at: string | null;
};

export type KycApiResponse = { kyc: KycDto };

export type KycSecretsResponse = {
  secrets: {
    api_key: string | null;
    provider: string | null;
    api_base_url: string | null;
    mode: KycMode;
  };
};

export const kycFormSchema = z.object({
  mode: z.enum(KYC_MODES),
  is_enabled: z.boolean(),
  provider: z.enum(KYC_PROVIDERS).or(z.literal("")).optional(),
  clear_provider: z.boolean(),
  api_key: z
    .string()
    .max(255)
    .regex(/^[A-Za-z0-9._:-]*$/, "Only letters, numbers, and . _ : -"),
  clear_api_key: z.boolean(),
  api_base_url: withSafeInput(z.string().trim().max(255)),
});

export type KycFormValues = z.infer<typeof kycFormSchema>;

export function toKycFormValues(dto: KycDto): KycFormValues {
  return {
    mode: dto.mode,
    is_enabled: dto.is_enabled,
    provider: (dto.provider as (typeof KYC_PROVIDERS)[number]) || "",
    clear_provider: false,
    api_key: "",
    clear_api_key: false,
    api_base_url: dto.api_base_url ?? "",
  };
}

export function toKycApiBody(values: KycFormValues) {
  return {
    mode: values.mode,
    is_enabled: values.is_enabled,
    provider: values.clear_provider
      ? null
      : values.provider
        ? values.provider
        : undefined,
    api_key: values.clear_api_key
      ? null
      : values.api_key.trim()
        ? values.api_key.trim()
        : undefined,
    api_base_url: values.api_base_url.trim() ? values.api_base_url.trim() : null,
  };
}
