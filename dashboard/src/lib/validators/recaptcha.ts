import { z } from "zod";
import { withSafeInput } from "./safeInput";

export const RECAPTCHA_VERSIONS = ["v2", "v3"] as const;
export type RecaptchaVersion = (typeof RECAPTCHA_VERSIONS)[number];

export type RecaptchaDto = {
  is_enabled: boolean;
  version: RecaptchaVersion;
  site_key: string | null;
  has_site_key: boolean;
  has_secret_key: boolean;
  v3_min_score: number;
  ready: boolean;
  updated_at: string | null;
};

export type RecaptchaApiResponse = { recaptcha: RecaptchaDto };

export type RecaptchaSecretsResponse = {
  secrets: {
    site_key: string | null;
    secret_key: string | null;
    version: RecaptchaVersion;
    v3_min_score: number;
  };
};

export type PublicCaptchaConfig = {
  enabled: boolean;
  version?: RecaptchaVersion;
  site_key?: string;
};

const keyField = withSafeInput(
  z
    .string()
    .trim()
    .max(255)
    .regex(
      /^[A-Za-z0-9_-]*$/,
      "Only letters, numbers, dash and underscore",
    ),
);

export const recaptchaFormSchema = z.object({
  is_enabled: z.boolean(),
  version: z.enum(RECAPTCHA_VERSIONS),
  site_key: keyField,
  clear_site_key: z.boolean(),
  secret_key: z
    .string()
    .max(255)
    .regex(/^[A-Za-z0-9_-]*$/, "Only letters, numbers, dash and underscore"),
  clear_secret_key: z.boolean(),
  v3_min_score: z
    .number()
    .min(0, "Score must be at least 0")
    .max(1, "Score must be at most 1"),
});

export type RecaptchaFormValues = z.infer<typeof recaptchaFormSchema>;

export function toRecaptchaFormValues(dto: RecaptchaDto): RecaptchaFormValues {
  return {
    is_enabled: dto.is_enabled,
    version: dto.version === "v3" ? "v3" : "v2",
    site_key: "",
    clear_site_key: false,
    secret_key: "",
    clear_secret_key: false,
    v3_min_score: dto.v3_min_score ?? 0.5,
  };
}

/** Build PATCH body — omit unchanged secrets; null clears. */
export function toRecaptchaApiBody(
  values: RecaptchaFormValues,
  options: {
    revealedSiteKey?: string;
    revealedSecretKey?: string;
  } = {},
) {
  const body: Record<string, unknown> = {
    is_enabled: values.is_enabled,
    version: values.version,
    v3_min_score: values.v3_min_score,
  };

  if (values.clear_site_key) {
    body.site_key = null;
  } else if (
    values.site_key.trim() &&
    values.site_key !== options.revealedSiteKey
  ) {
    body.site_key = values.site_key.trim();
  }

  if (values.clear_secret_key) {
    body.secret_key = null;
  } else if (
    values.secret_key &&
    values.secret_key !== options.revealedSecretKey
  ) {
    body.secret_key = values.secret_key;
  }

  return body;
}
