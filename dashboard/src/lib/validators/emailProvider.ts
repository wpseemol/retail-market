import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export const EMAIL_PROVIDERS = ["gmail", "zoho", "sendgrid", "brevo", "mailgun", "smtp"] as const;
export type EmailProviderId = (typeof EMAIL_PROVIDERS)[number];

export type EmailFormField =
  | "host"
  | "port"
  | "secure"
  | "username"
  | "password"
  | "from_email"
  | "from_name";

/** Fields shown per provider, and which are required to activate it. */
export const EMAIL_FIELDS: Record<
  EmailProviderId,
  { fields: ReadonlyArray<EmailFormField>; required: ReadonlyArray<EmailFormField> }
> = {
  gmail: { fields: ["username", "password", "from_name"], required: ["username", "password"] },
  zoho: { fields: ["username", "password", "from_name"], required: ["username", "password"] },
  sendgrid: { fields: ["password", "from_email", "from_name"], required: ["password", "from_email"] },
  brevo: {
    fields: ["username", "password", "from_email", "from_name"],
    required: ["username", "password", "from_email"],
  },
  mailgun: {
    fields: ["username", "password", "from_email", "from_name"],
    required: ["username", "password", "from_email"],
  },
  smtp: {
    fields: ["host", "port", "secure", "username", "password", "from_email", "from_name"],
    required: ["host", "port", "from_email"],
  },
};

export type EmailProviderDto = {
  provider: EmailProviderId;
  is_active: boolean;
  host: string | null;
  port: number | null;
  secure: boolean | null;
  username: string | null;
  from_email: string | null;
  from_name: string | null;
  has_password: boolean;
  ready: boolean;
  updated_at: string | null;
};

export type EmailProviderApiResponse = {
  message?: string;
  active_provider: EmailProviderId | null;
  env_fallback: boolean;
  providers: Record<EmailProviderId, EmailProviderDto>;
};

export type EmailSecretsResponse = {
  secrets: Record<EmailProviderId, { password: string | null }>;
};

const optionalEmail = withSafeInput(
  z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address"),
);

const provider = z.object({
  host: withSafeInput(
    z
      .string()
      .trim()
      .max(255)
      .refine((v) => v === "" || /^[A-Za-z0-9.-]+$/.test(v), "Enter a hostname like smtp.example.com"),
  ),
  port: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,5}$/.test(v) && Number(v) >= 1 && Number(v) <= 65535), "Port 1–65535"),
  secure: z.boolean(),
  username: withSafeInput(z.string().trim().max(255)),
  password: z
    .string()
    .max(512)
    .refine((v) => v === "" || v.length >= 4, "Password looks too short")
    .refine((v) => !/[\r\n\t\0]/.test(v), "Password contains unsupported characters"),
  clear_password: z.boolean(),
  from_email: optionalEmail,
  from_name: withSafeInput(z.string().trim().max(100)),
});

const baseSchema = z.object({
  active_provider: z.enum(["none", ...EMAIL_PROVIDERS]),
  gmail: provider,
  zoho: provider,
  sendgrid: provider,
  brevo: provider,
  mailgun: provider,
  smtp: provider,
});

export type EmailProviderFormValues = z.infer<typeof baseSchema>;

export function makeEmailProviderFormSchema(
  stored: Partial<Record<EmailProviderId, EmailProviderDto>>,
) {
  return baseSchema.superRefine((v, ctx) => {
    for (const p of ["gmail", "zoho"] as const) {
      const user = v[p].username;
      if (user && !z.string().email().safeParse(user).success) {
        ctx.addIssue({ code: "custom", path: [p, "username"], message: "Use the full email address" });
      }
    }

    const active = v.active_provider;
    if (active === "none") return;
    for (const field of EMAIL_FIELDS[active].required) {
      const filled =
        field === "password"
          ? v[active].password !== "" ||
            (Boolean(stored[active]?.has_password) && !v[active].clear_password)
          : String(v[active][field]).trim() !== "";
      if (!filled) {
        ctx.addIssue({
          code: "custom",
          path: [active, field],
          message: "Required before activating this provider",
        });
      }
    }
  });
}

export function toEmailProviderFormValues(
  state: EmailProviderApiResponse,
  secrets?: EmailSecretsResponse["secrets"] | null,
): EmailProviderFormValues {
  const row = (p: EmailProviderId) => {
    const dto = state.providers[p];
    return {
      host: dto.host ?? "",
      port: dto.port ? String(dto.port) : p === "smtp" ? "587" : "",
      secure: dto.secure ?? false,
      username: dto.username ?? "",
      password: secrets?.[p].password ?? "",
      clear_password: false,
      from_email: dto.from_email ?? "",
      from_name: dto.from_name ?? "",
    };
  };
  return {
    active_provider: state.active_provider ?? "none",
    gmail: row("gmail"),
    zoho: row("zoho"),
    sendgrid: row("sendgrid"),
    brevo: row("brevo"),
    mailgun: row("mailgun"),
    smtp: row("smtp"),
  };
}

export const testEmailFormSchema = z.object({
  to: withSafeInput(z.string().trim().min(1, "Email is required").max(255).email("Enter a valid email address")),
});
export type TestEmailFormValues = z.infer<typeof testEmailFormSchema>;
