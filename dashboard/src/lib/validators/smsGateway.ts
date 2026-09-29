import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export const SMS_PROVIDERS = ["bulksmsbd", "alpha_sms", "ssl_wireless", "mim_sms", "twilio"] as const;
export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export type SmsCredentialField = "api_key" | "sender_id" | "account_sid";

/** Fields shown per gateway, and which of them are required to activate it. */
export const SMS_FIELDS: Record<
  SmsProvider,
  { fields: ReadonlyArray<SmsCredentialField>; required: ReadonlyArray<SmsCredentialField> }
> = {
  bulksmsbd: { fields: ["api_key", "sender_id"], required: ["api_key", "sender_id"] },
  alpha_sms: { fields: ["api_key", "sender_id"], required: ["api_key"] },
  ssl_wireless: { fields: ["api_key", "sender_id"], required: ["api_key", "sender_id"] },
  mim_sms: {
    fields: ["account_sid", "api_key", "sender_id"],
    required: ["account_sid", "api_key", "sender_id"],
  },
  twilio: {
    fields: ["account_sid", "api_key", "sender_id"],
    required: ["account_sid", "api_key", "sender_id"],
  },
};

/** Credential values are never in this DTO — only `has_*` flags. */
export type SmsProviderDto = {
  provider: SmsProvider;
  is_active: boolean;
  has_api_key: boolean;
  has_sender_id: boolean;
  has_account_sid: boolean;
  ready: boolean;
  updated_at: string | null;
};

export type SmsGatewayApiResponse = {
  message?: string;
  active_provider: SmsProvider | null;
  env_fallback: boolean;
  providers: Record<SmsProvider, SmsProviderDto>;
};

export type SmsCredentialValues = {
  api_key: string | null;
  sender_id: string | null;
  account_sid: string | null;
};

export type SmsSecretsResponse = {
  secrets: Record<SmsProvider, SmsCredentialValues>;
};

const apiKey = z
  .string()
  .trim()
  .max(512)
  .refine((v) => v === "" || v.length >= 8, "API key looks too short")
  .refine(
    (v) => v === "" || /^[A-Za-z0-9._~+/=|:-]+$/.test(v),
    "API key contains unsupported characters",
  );

const senderId = withSafeInput(
  z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) => v === "" || /^\+?[A-Za-z0-9._ -]+$/.test(v),
      "Only letters, numbers, space, dot, dash, underscore and leading +",
    ),
);

/** Twilio Account SID or MiM SMS login email — format checked per provider below. */
const accountSid = withSafeInput(z.string().trim().max(255));

const gateway = z.object({
  api_key: apiKey,
  clear_api_key: z.boolean(),
  sender_id: senderId,
  clear_sender_id: z.boolean(),
  account_sid: accountSid,
  clear_account_sid: z.boolean(),
});

const baseSchema = z.object({
  active_provider: z.enum(["none", ...SMS_PROVIDERS]),
  bulksmsbd: gateway,
  alpha_sms: gateway,
  ssl_wireless: gateway,
  mim_sms: gateway,
  twilio: gateway,
});

export type SmsGatewayFormValues = z.infer<typeof baseSchema>;

/** Activating needs credentials — typed now, or already stored and not being removed. */
export function makeSmsGatewayFormSchema(
  stored: Partial<Record<SmsProvider, SmsProviderDto>>,
) {
  return baseSchema.superRefine((v, ctx) => {
    const twSid = v.twilio.account_sid;
    if (twSid && !/^AC[0-9a-fA-F]{32}$/.test(twSid)) {
      ctx.addIssue({
        code: "custom",
        path: ["twilio", "account_sid"],
        message: "Starts with AC followed by 32 hex characters",
      });
    }
    const mimUser = v.mim_sms.account_sid;
    if (mimUser && !z.string().email().safeParse(mimUser).success) {
      ctx.addIssue({
        code: "custom",
        path: ["mim_sms", "account_sid"],
        message: "Use your MiM SMS panel login email",
      });
    }
    const tw = v.twilio.sender_id;
    if (tw && !/^(\+[1-9]\d{7,14}|MG[0-9a-fA-F]{32})$/.test(tw)) {
      ctx.addIssue({
        code: "custom",
        path: ["twilio", "sender_id"],
        message: "Use an E.164 number (+15551234567) or a Messaging Service SID (MG…)",
      });
    }

    const active = v.active_provider;
    if (active === "none") return;
    for (const field of SMS_FIELDS[active].required) {
      const typed = v[active][field] !== "";
      const kept =
        Boolean(stored[active]?.[`has_${field}`]) && !v[active][`clear_${field}`];
      if (!typed && !kept) {
        ctx.addIssue({
          code: "custom",
          path: [active, field],
          message: "Required before activating this gateway",
        });
      }
    }
  });
}

export function toSmsGatewayFormValues(
  state: SmsGatewayApiResponse,
  secrets?: SmsSecretsResponse["secrets"] | null,
): SmsGatewayFormValues {
  const row = (p: SmsProvider) => ({
    api_key: secrets?.[p].api_key ?? "",
    clear_api_key: false,
    sender_id: secrets?.[p].sender_id ?? "",
    clear_sender_id: false,
    account_sid: secrets?.[p].account_sid ?? "",
    clear_account_sid: false,
  });
  return {
    active_provider: state.active_provider ?? "none",
    bulksmsbd: row("bulksmsbd"),
    alpha_sms: row("alpha_sms"),
    ssl_wireless: row("ssl_wireless"),
    mim_sms: row("mim_sms"),
    twilio: row("twilio"),
  };
}

export const testSmsFormSchema = z.object({
  phone: withSafeInput(
    z
      .string()
      .trim()
      .regex(/^01[3-9]\d{8}$/, "Enter an 11-digit mobile number starting with 01"),
  ),
});
export type TestSmsFormValues = z.infer<typeof testSmsFormSchema>;
