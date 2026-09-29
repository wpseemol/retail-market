import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export const SOCIAL_PROVIDERS = ["google", "facebook", "apple"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** Credential values are never in this DTO — only `has_*` flags. */
export type SocialProviderDto = {
  provider: SocialProvider;
  is_enabled: boolean;
  has_client_id: boolean;
  has_client_secret: boolean;
  has_team_id: boolean;
  has_key_id: boolean;
  has_private_key: boolean;
  ready: boolean;
  env_fallback: boolean;
  updated_at: string | null;
};

export type SocialLoginApiResponse = {
  message?: string;
  providers: Record<SocialProvider, SocialProviderDto>;
};

export type SocialCredentialValues = {
  client_id: string | null;
  team_id: string | null;
  key_id: string | null;
  client_secret: string | null;
  private_key: string | null;
};

export type SocialSecretsResponse = {
  secrets: Record<SocialProvider, SocialCredentialValues>;
};

/** Every credential field: empty keeps the stored value, `clear_*` removes it. */
export const CREDENTIAL_FIELDS = {
  google: ["client_id", "client_secret"],
  facebook: ["client_id", "client_secret"],
  apple: ["client_id", "team_id", "key_id", "private_key"],
} as const satisfies Record<SocialProvider, ReadonlyArray<keyof SocialCredentialValues>>;

export type CredentialField = keyof SocialCredentialValues;

const clientId = withSafeInput(
  z
    .string()
    .trim()
    .max(255)
    .regex(/^[A-Za-z0-9._-]*$/, "Only letters, numbers, dot, dash and underscore"),
);

const secret = z
  .string()
  .trim()
  .max(512)
  .refine((v) => v === "" || v.length >= 8, "Secret looks too short")
  .refine(
    (v) => v === "" || /^[A-Za-z0-9._~+/=-]+$/.test(v),
    "Secret contains unsupported characters",
  );

const appleId = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[A-Z0-9]{10}$/.test(v), "Must be 10 uppercase letters or digits");

const privateKey = z
  .string()
  .trim()
  .max(4096)
  .refine(
    (v) =>
      v === "" ||
      /^-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END PRIVATE KEY-----$/.test(v),
    "Paste the full .p8 key including BEGIN/END PRIVATE KEY lines",
  );

const oauthProvider = z.object({
  is_enabled: z.boolean(),
  client_id: clientId,
  clear_client_id: z.boolean(),
  client_secret: secret,
  clear_client_secret: z.boolean(),
});

const appleProvider = z.object({
  is_enabled: z.boolean(),
  client_id: clientId,
  clear_client_id: z.boolean(),
  team_id: appleId,
  clear_team_id: z.boolean(),
  key_id: appleId,
  clear_key_id: z.boolean(),
  private_key: privateKey,
  clear_private_key: z.boolean(),
});

const baseSchema = z.object({
  google: oauthProvider,
  facebook: oauthProvider,
  apple: appleProvider,
});

export type SocialLoginFormValues = z.infer<typeof baseSchema>;

/** Enabling needs credentials — typed now, or already stored and not being removed. */
export function makeSocialLoginFormSchema(
  stored: Partial<Record<SocialProvider, SocialProviderDto>>,
) {
  return baseSchema.superRefine((v, ctx) => {
    for (const p of SOCIAL_PROVIDERS) {
      const hasId =
        v[p].client_id !== "" ||
        (Boolean(stored[p]?.has_client_id) && !v[p].clear_client_id);
      if (v[p].is_enabled && !hasId) {
        ctx.addIssue({
          code: "custom",
          path: [p, "client_id"],
          message: "Required before enabling",
        });
      }
    }
    const fbHasSecret =
      v.facebook.client_secret !== "" ||
      (Boolean(stored.facebook?.has_client_secret) && !v.facebook.clear_client_secret);
    if (v.facebook.is_enabled && !fbHasSecret) {
      ctx.addIssue({
        code: "custom",
        path: ["facebook", "client_secret"],
        message: "App secret is required before enabling Facebook",
      });
    }
  });
}

export const revealSecretsFormSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
});
export type RevealSecretsFormValues = z.infer<typeof revealSecretsFormSchema>;

export function toSocialLoginFormValues(
  providers: Record<SocialProvider, SocialProviderDto>,
  secrets?: SocialSecretsResponse["secrets"] | null,
): SocialLoginFormValues {
  const oauth = (p: "google" | "facebook") => ({
    is_enabled: providers[p].is_enabled,
    client_id: secrets?.[p].client_id ?? "",
    clear_client_id: false,
    client_secret: secrets?.[p].client_secret ?? "",
    clear_client_secret: false,
  });
  return {
    google: oauth("google"),
    facebook: oauth("facebook"),
    apple: {
      is_enabled: providers.apple.is_enabled,
      client_id: secrets?.apple.client_id ?? "",
      clear_client_id: false,
      team_id: secrets?.apple.team_id ?? "",
      clear_team_id: false,
      key_id: secrets?.apple.key_id ?? "",
      clear_key_id: false,
      private_key: secrets?.apple.private_key ?? "",
      clear_private_key: false,
    },
  };
}
