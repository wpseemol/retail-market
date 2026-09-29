import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { decryptSecret } from "./secretBox.js";

export const EMAIL_PROVIDERS = ["gmail", "zoho", "sendgrid", "brevo", "mailgun", "smtp"] as const;
export type EmailProviderId = (typeof EMAIL_PROVIDERS)[number];

export type EmailField = "host" | "port" | "username" | "password" | "from_email";

type Preset = {
  host: string | null;
  port: number | null;
  secure: boolean | null;
  /** SendGrid always authenticates as the literal user "apikey". */
  fixedUsername?: string;
  /** Gmail / Zoho must send from the signed-in mailbox. */
  fromIsUsername?: boolean;
  required: ReadonlyArray<EmailField>;
};

export const EMAIL_PRESETS: Record<EmailProviderId, Preset> = {
  gmail: { host: "smtp.gmail.com", port: 465, secure: true, fromIsUsername: true, required: ["username", "password"] },
  zoho: { host: "smtp.zoho.com", port: 465, secure: true, fromIsUsername: true, required: ["username", "password"] },
  sendgrid: { host: "smtp.sendgrid.net", port: 587, secure: false, fixedUsername: "apikey", required: ["password", "from_email"] },
  brevo: { host: "smtp-relay.brevo.com", port: 587, secure: false, required: ["username", "password", "from_email"] },
  mailgun: { host: "smtp.mailgun.org", port: 587, secure: false, required: ["username", "password", "from_email"] },
  smtp: { host: null, port: null, secure: null, required: ["host", "port", "from_email"] },
};

export function isEmailProvider(value: unknown): value is EmailProviderId {
  return (EMAIL_PROVIDERS as readonly unknown[]).includes(value);
}

type Row = Awaited<ReturnType<typeof prisma.emailProvider.findMany>>[number];

export function isEmailRowReady(provider: EmailProviderId, row: Row | undefined) {
  if (!row) return false;
  const has: Record<EmailField, boolean> = {
    host: Boolean(row.host),
    port: Boolean(row.port),
    username: Boolean(row.username),
    password: Boolean(row.password_enc),
    from_email: Boolean(row.from_email),
  };
  return EMAIL_PRESETS[provider].required.every((f) => has[f]);
}

export type EmailTransportConfig = {
  provider: EmailProviderId | "env";
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
};

const CACHE_MS = 30_000;
let cache: { at: number; rows: Row[] } | null = null;

export function invalidateEmailProviderCache() {
  cache = null;
}

async function loadRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await prisma.emailProvider.findMany();
  cache = { at: Date.now(), rows };
  return rows;
}

function formatFrom(email: string, name: string | null | undefined) {
  const clean = (name ?? env.appName).replace(/["\r\n]/g, "").trim();
  return clean ? `"${clean}" <${email}>` : email;
}

export function toTransportConfig(provider: EmailProviderId, row: Row): EmailTransportConfig {
  const preset = EMAIL_PRESETS[provider];
  const pass = decryptSecret(row.password_enc);
  if (row.password_enc && !pass) {
    throw new Error("Saved email password cannot be decrypted (SETTINGS_ENCRYPTION_KEY changed?)");
  }
  const user = preset.fixedUsername ?? row.username ?? null;
  const fromEmail = preset.fromIsUsername ? (row.username ?? "") : (row.from_email ?? "");
  const port = preset.port ?? row.port ?? 587;
  return {
    provider,
    host: preset.host ?? row.host ?? "",
    port,
    secure: preset.secure ?? row.secure ?? port === 465,
    user,
    pass,
    from: formatFrom(fromEmail, row.from_name),
  };
}

/** Dashboard-configured provider, or the SMTP_* env fallback, or null (console/dev). */
export async function getActiveEmailConfig(): Promise<EmailTransportConfig | null> {
  const rows = await loadRows();
  const active = rows.find((r) => r.is_active && isEmailProvider(r.provider));
  if (active) return toTransportConfig(active.provider as EmailProviderId, active);
  if (env.smtp.host) {
    return {
      provider: "env",
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      user: env.smtp.user || null,
      pass: env.smtp.pass || null,
      from: env.smtp.from,
    };
  }
  return null;
}
