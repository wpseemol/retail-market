import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export const WHATSAPP_PROVIDERS = ["meta_cloud", "twilio_whatsapp"] as const;
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

export type WhatsAppCredentialField =
  | "access_token"
  | "phone_number_id"
  | "account_sid"
  | "template_name"
  | "template_language"
  | "api_version";

export const WHATSAPP_FIELDS: Record<
  WhatsAppProvider,
  {
    fields: ReadonlyArray<WhatsAppCredentialField>;
    required: ReadonlyArray<WhatsAppCredentialField>;
  }
> = {
  meta_cloud: {
    fields: [
      "access_token",
      "phone_number_id",
      "account_sid",
      "template_name",
      "template_language",
      "api_version",
    ],
    required: ["access_token", "phone_number_id", "template_name"],
  },
  twilio_whatsapp: {
    fields: [
      "access_token",
      "phone_number_id",
      "account_sid",
      "template_name",
      "template_language",
    ],
    required: ["access_token", "phone_number_id", "account_sid", "template_name"],
  },
};

export type WhatsAppProviderDto = {
  provider: WhatsAppProvider;
  is_active: boolean;
  has_access_token: boolean;
  has_phone_number_id: boolean;
  has_account_sid: boolean;
  has_template_name: boolean;
  template_language: string;
  api_version: string;
  template_button_param: boolean;
  ready: boolean;
  updated_at: string | null;
};

export type WhatsAppGatewayApiResponse = {
  message?: string;
  active_provider: WhatsAppProvider | null;
  env_fallback: boolean;
  providers: Record<WhatsAppProvider, WhatsAppProviderDto>;
};

export type WhatsAppCredentialValues = {
  access_token: string | null;
  phone_number_id: string | null;
  account_sid: string | null;
  template_name: string | null;
  template_language: string;
  api_version: string;
  template_button_param: boolean;
};

export type WhatsAppSecretsResponse = {
  secrets: Record<WhatsAppProvider, WhatsAppCredentialValues>;
};

const accessToken = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || v.length >= 20, "Access token looks too short")
  .refine(
    (v) => v === "" || /^[A-Za-z0-9._~+/=|:-]+$/.test(v),
    "Access token contains unsupported characters",
  );

const phoneNumberId = withSafeInput(
  z
    .string()
    .trim()
    .max(64)
    .refine(
      (v) =>
        v === "" ||
        /^(\+?[1-9]\d{7,14}|whatsapp:\+[1-9]\d{7,14}|\d{5,20})$/.test(v),
      "Meta Phone number ID (digits) or Twilio From (+E.164 / whatsapp:+…)",
    ),
);

const accountSid = withSafeInput(
  z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => v === "" || /^(AC[0-9a-fA-F]{32}|\d{5,20})$/.test(v),
      "Twilio Account SID (AC…) or Meta WABA id",
    ),
);

const templateName = withSafeInput(
  z
    .string()
    .trim()
    .max(100)
    .refine(
      (v) => v === "" || /^([A-Za-z0-9_]+|HX[0-9a-fA-F]{32})$/.test(v),
      "Template name (letters/underscores) or Twilio Content SID (HX…)",
    ),
);

const templateLanguage = withSafeInput(
  z
    .string()
    .trim()
    .max(12)
    .refine((v) => v === "" || /^[a-z]{2}(_[A-Z]{2})?$/.test(v), "e.g. en or en_US"),
);

const apiVersion = withSafeInput(
  z
    .string()
    .trim()
    .max(16)
    .refine((v) => v === "" || /^v\d+(\.\d+)?$/.test(v), "e.g. v21.0"),
);

const gateway = z.object({
  access_token: accessToken,
  clear_access_token: z.boolean(),
  phone_number_id: phoneNumberId,
  clear_phone_number_id: z.boolean(),
  account_sid: accountSid,
  clear_account_sid: z.boolean(),
  template_name: templateName,
  clear_template_name: z.boolean(),
  template_language: templateLanguage,
  api_version: apiVersion,
  template_button_param: z.boolean(),
});

const baseSchema = z.object({
  active_provider: z.enum(["none", ...WHATSAPP_PROVIDERS]),
  meta_cloud: gateway,
  twilio_whatsapp: gateway,
});

export type WhatsAppGatewayFormValues = z.infer<typeof baseSchema>;

export function makeWhatsAppGatewayFormSchema(
  state: WhatsAppGatewayApiResponse | null,
) {
  return baseSchema.superRefine((values, ctx) => {
    const active = values.active_provider;
    if (active === "none") return;
    const dto = state?.providers[active];
    const form = values[active];
    for (const field of WHATSAPP_FIELDS[active].required) {
      const clearKey = `clear_${field}` as keyof typeof form;
      const clearing = Boolean(form[clearKey]);
      const typed = String(form[field] ?? "").trim();
      const hasStored =
        field === "access_token"
          ? Boolean(dto?.has_access_token)
          : field === "phone_number_id"
            ? Boolean(dto?.has_phone_number_id)
            : field === "account_sid"
              ? Boolean(dto?.has_account_sid)
              : Boolean(dto?.has_template_name);
      if (!typed && (clearing || !hasStored)) {
        ctx.addIssue({
          code: "custom",
          path: [active, field],
          message: "Required to activate this gateway",
        });
      }
    }
  });
}

export function toWhatsAppGatewayFormValues(
  state: WhatsAppGatewayApiResponse,
  secrets?: Record<WhatsAppProvider, WhatsAppCredentialValues> | null,
): WhatsAppGatewayFormValues {
  const empty = (): WhatsAppGatewayFormValues["meta_cloud"] => ({
    access_token: "",
    clear_access_token: false,
    phone_number_id: "",
    clear_phone_number_id: false,
    account_sid: "",
    clear_account_sid: false,
    template_name: "",
    clear_template_name: false,
    template_language: "en",
    api_version: "v21.0",
    template_button_param: true,
  });

  const providers = Object.fromEntries(
    WHATSAPP_PROVIDERS.map((p) => {
      const dto = state.providers[p];
      const secret = secrets?.[p];
      return [
        p,
        {
          access_token: secret?.access_token ?? "",
          clear_access_token: false,
          phone_number_id: secret?.phone_number_id ?? "",
          clear_phone_number_id: false,
          account_sid: secret?.account_sid ?? "",
          clear_account_sid: false,
          template_name: secret?.template_name ?? "",
          clear_template_name: false,
          template_language:
            secret?.template_language ?? dto.template_language ?? "en",
          api_version: secret?.api_version ?? dto.api_version ?? "v21.0",
          template_button_param:
            secret?.template_button_param ?? dto.template_button_param ?? true,
        },
      ];
    }),
  ) as Pick<WhatsAppGatewayFormValues, WhatsAppProvider>;

  return {
    active_provider: state.active_provider ?? "none",
    meta_cloud: providers.meta_cloud ?? empty(),
    twilio_whatsapp: providers.twilio_whatsapp ?? empty(),
  };
}

export function toWhatsAppGatewayApiBody(values: WhatsAppGatewayFormValues) {
  const patch = (p: WhatsAppProvider) => {
    const v = values[p];
    const body: Record<string, unknown> = {
      template_button_param: v.template_button_param,
    };
    if (v.clear_access_token) body.access_token = null;
    else if (v.access_token.trim()) body.access_token = v.access_token.trim();

    if (v.clear_phone_number_id) body.phone_number_id = null;
    else if (v.phone_number_id.trim()) body.phone_number_id = v.phone_number_id.trim();

    if (v.clear_account_sid) body.account_sid = null;
    else if (v.account_sid.trim()) body.account_sid = v.account_sid.trim();

    if (v.clear_template_name) body.template_name = null;
    else if (v.template_name.trim()) body.template_name = v.template_name.trim();

    if (v.template_language.trim()) body.template_language = v.template_language.trim();
    if (v.api_version.trim()) body.api_version = v.api_version.trim();

    return body;
  };

  return {
    active_provider: values.active_provider === "none" ? null : values.active_provider,
    meta_cloud: patch("meta_cloud"),
    twilio_whatsapp: patch("twilio_whatsapp"),
  };
}

export const testWhatsAppFormSchema = z.object({
  phone: withSafeInput(
    z
      .string()
      .trim()
      .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit BD mobile (01xxxxxxxxx)"),
  ),
});

export type TestWhatsAppFormValues = z.infer<typeof testWhatsAppFormSchema>;
