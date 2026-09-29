import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export const SOCIAL_PROVIDERS = ["google", "facebook", "apple"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type SocialProviderDto = {
  provider: SocialProvider;
  is_enabled: boolean;
  client_id: string | null;
  has_client_secret: boolean;
  team_id: string | null;
  key_id: string | null;
  has_private_key: boolean;
  ready: boolean;
  env_fallback: boolean;
  updated_at: string | null;
};

export type SocialLoginApiResponse = {
  message?: string;
  providers: Record<SocialProvider, SocialProviderDto>;
};

export type SocialSecretsResponse = {
  secrets: Record<
    SocialProvider,
    { client_secret: string | null; private_key: string | null }
  >;
};

const clientId = withSafeInput(
  z
    .string()
    .trim()
    .max(255)
    .regex(/^[A-Za-z0-9._-]*$/, "Only letters, numbers, dot, dash and underscore"),
);

/** Empty = keep the stored secret. */
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
  client_secret: secret,
  clear_client_secret: z.boolean(),
});

const appleProvider = z.object({
  is_enabled: z.boolean(),
  client_id: clientId,
  team_id: appleId,
  key_id: appleId,
  private_key: privateKey,
  clear_private_key: z.boolean(),
});

const baseSchema = z.object({
  google: oauthProvider,
  facebook: oauthProvider,
  apple: appleProvider,
});

export type SocialLoginFormValues = z.infer<typeof baseSchema>;

/** Enabling needs credentials; "stored" state comes from the API. */
export function makeSocialLoginFormSchema(
  stored: Partial<Record<SocialProvider, SocialProviderDto>>,
) {
  return baseSchema.superRefine((v, ctx) => {
    for (const p of SOCIAL_PROVIDERS) {
      if (v[p].is_enabled && !v[p].client_id) {
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
  return {
    google: {
      is_enabled: providers.google.is_enabled,
      client_id: providers.google.client_id ?? "",
      client_secret: secrets?.google.client_secret ?? "",
      clear_client_secret: false,
    },
    facebook: {
      is_enabled: providers.facebook.is_enabled,
      client_id: providers.facebook.client_id ?? "",
      client_secret: secrets?.facebook.client_secret ?? "",
      clear_client_secret: false,
    },
    apple: {
      is_enabled: providers.apple.is_enabled,
      client_id: providers.apple.client_id ?? "",
      team_id: providers.apple.team_id ?? "",
      key_id: providers.apple.key_id ?? "",
      private_key: secrets?.apple.private_key ?? "",
      clear_private_key: false,
    },
  };
}
