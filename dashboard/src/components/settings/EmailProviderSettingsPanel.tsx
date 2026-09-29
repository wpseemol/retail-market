import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, Send } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  EMAIL_FIELDS,
  EMAIL_PROVIDERS,
  makeEmailProviderFormSchema,
  testEmailFormSchema,
  toEmailProviderFormValues,
  type EmailFormField,
  type EmailProviderApiResponse,
  type EmailProviderFormValues,
  type EmailProviderId,
  type EmailSecretsResponse,
  type TestEmailFormValues,
} from "@/lib/validators/emailProvider";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import {
  ProviderLinks,
  RevealSecretsDialog,
  SecretField,
} from "@/components/settings/SecretCredentialFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const AUTO_HIDE_MS = 60_000;
const ENDPOINT = "/api/dashboard/site-settings/email-provider";

type FieldMeta = { label: string; placeholder?: string; description?: string };

const COMMON: Partial<Record<EmailFormField, FieldMeta>> = {
  from_email: { label: "From email", placeholder: "no-reply@yourdomain.com" },
  from_name: { label: "From name", placeholder: "Niyenin", description: "Shown as the sender name." },
};

const PROVIDER_META: Record<
  EmailProviderId,
  {
    label: string;
    initials: string;
    tint: string;
    bestFor: string;
    docs: string;
    server?: string;
    website?: string;
    apiDocs?: string;
    fields: Partial<Record<EmailFormField, FieldMeta>>;
  }
> = {
  gmail: {
    label: "Gmail / Google Workspace",
    initials: "G",
    tint: "bg-red-500",
    bestFor: "Best for getting started (≈500 emails/day)",
    docs: "Turn on 2-Step Verification, then create an App password. Your normal Gmail password will not work.",
    server: "smtp.gmail.com · 465 · SSL",
    website: "https://mail.google.com",
    apiDocs: "https://support.google.com/accounts/answer/185833",
    fields: {
      username: { label: "Gmail address", placeholder: "you@gmail.com" },
      password: {
        label: "App password",
        placeholder: "16-character app password",
        description: "myaccount.google.com → Security → App passwords.",
      },
    },
  },
  zoho: {
    label: "Zoho Mail",
    initials: "Z",
    tint: "bg-yellow-600",
    bestFor: "Best for a free custom-domain mailbox",
    docs: "Use your Zoho mailbox. With 2FA enabled, generate an application-specific password.",
    server: "smtp.zoho.com · 465 · SSL",
    website: "https://www.zoho.com/mail/",
    apiDocs: "https://www.zoho.com/mail/help/zoho-smtp.html",
    fields: {
      username: { label: "Zoho Mail address", placeholder: "you@yourdomain.com" },
      password: { label: "Password / app password", placeholder: "Zoho password" },
    },
  },
  sendgrid: {
    label: "SendGrid",
    initials: "SG",
    tint: "bg-blue-600",
    bestFor: "Best for high-volume transactional email",
    docs: "Create an API key with Mail Send permission and verify your sender/domain.",
    server: "smtp.sendgrid.net · 587 · STARTTLS · user “apikey”",
    website: "https://sendgrid.com",
    apiDocs: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api",
    fields: {
      password: { label: "API key", placeholder: "SG.xxxxxxxx" },
      from_email: { label: "Verified sender email", placeholder: "no-reply@yourdomain.com" },
    },
  },
  brevo: {
    label: "Brevo (Sendinblue)",
    initials: "B",
    tint: "bg-teal-600",
    bestFor: "Best free tier (300 emails/day)",
    docs: "Brevo → SMTP & API → SMTP tab: copy the login and generate an SMTP key.",
    server: "smtp-relay.brevo.com · 587 · STARTTLS",
    website: "https://www.brevo.com",
    apiDocs: "https://developers.brevo.com/docs/smtp-integration",
    fields: {
      username: { label: "SMTP login", placeholder: "xxxxxx@smtp-brevo.com" },
      password: { label: "SMTP key", placeholder: "xsmtpsib-…" },
    },
  },
  mailgun: {
    label: "Mailgun",
    initials: "MG",
    tint: "bg-rose-600",
    bestFor: "Best for developers with a custom domain",
    docs: "Sending → Domain settings → SMTP credentials.",
    server: "smtp.mailgun.org · 587 · STARTTLS",
    website: "https://www.mailgun.com",
    apiDocs: "https://documentation.mailgun.com",
    fields: {
      username: { label: "SMTP username", placeholder: "postmaster@mg.yourdomain.com" },
      password: { label: "SMTP password", placeholder: "Mailgun SMTP password" },
    },
  },
  smtp: {
    label: "Custom SMTP",
    initials: "SMTP",
    tint: "bg-slate-600",
    bestFor: "Any other provider (cPanel, Amazon SES, Outlook, Hostinger…)",
    docs: "Use the SMTP details from your host. Port 465 usually needs SSL on; 587 uses STARTTLS (SSL off).",
    fields: {
      host: { label: "SMTP host", placeholder: "mail.yourdomain.com" },
      port: { label: "Port", placeholder: "587" },
      secure: { label: "SSL/TLS (port 465)" },
      username: { label: "Username", placeholder: "no-reply@yourdomain.com" },
      password: { label: "Password", placeholder: "SMTP password" },
    },
  },
};

function StatusBadge({ active, ready }: { active: boolean; ready: boolean }) {
  if (!active) return <Badge variant="outline">Inactive</Badge>;
  if (!ready) return <Badge variant="destructive">Incomplete</Badge>;
  return <Badge className="bg-brand-primary text-white hover:bg-brand-primary">Live</Badge>;
}

function TestEmailCard({ token, disabled }: { token: string; disabled: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<TestEmailFormValues>({
    resolver: zodResolver(testEmailFormSchema),
    defaultValues: { to: "" },
  });

  async function onSubmit(values: TestEmailFormValues) {
    setResult(null);
    try {
      const data = await apiFetch<{ message: string }>(`${ENDPOINT}/test`, {
        method: "POST",
        token,
        body: values,
      });
      setResult({ ok: true, message: data.message });
    } catch (err) {
      setResult({ ok: false, message: err instanceof ApiError ? err.message : "Test email failed" });
    }
  }

  return (
    <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Send className="size-4 text-brand-primary" />
        Send a test email
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Uses the saved active provider. Save your changes first. One test every 30 seconds.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Recipient email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="you@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || form.formState.isSubmitting}
            title={disabled ? "Activate and save a provider first" : undefined}
          >
            {form.formState.isSubmitting ? "Sending…" : "Send test"}
          </Button>
        </form>
      </Form>
      {result ? (
        <p
          className={cn("mt-3 break-words text-sm", result.ok ? "text-brand-primary" : "text-destructive")}
          role={result.ok ? "status" : "alert"}
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}

export function EmailProviderSettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [state, setState] = useState<EmailProviderApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const schema = useMemo(
    () => makeEmailProviderFormSchema(state?.providers ?? {}),
    [state],
  );

  const form = useForm<EmailProviderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: state ? toEmailProviderFormValues(state) : undefined,
  });

  const hideSecrets = useCallback(
    (current: EmailProviderApiResponse | null) => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
      setRevealed(false);
      if (current) form.reset(toEmailProviderFormValues(current));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<EmailProviderApiResponse>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        setState(data);
        form.reset(toEmailProviderFormValues(data));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load email provider settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, form]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    [],
  );

  function onRevealed(secrets: EmailSecretsResponse["secrets"]) {
    if (!state) return;
    const current = form.getValues();
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    const next = toEmailProviderFormValues(state, secrets);
    next.active_provider = current.active_provider;
    for (const p of EMAIL_PROVIDERS) {
      const target = next[p] as Record<string, unknown>;
      const typed = current[p] as Record<string, unknown>;
      for (const key of Object.keys(target)) {
        if (dirty[p]?.[key]) target[key] = typed[key];
      }
    }
    form.reset(next, { keepDirty: true });
    setRevealed(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => hideSecrets(state), AUTO_HIDE_MS);
  }

  async function onSubmit(values: EmailProviderFormValues) {
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    const body: Record<string, unknown> = {
      active_provider: values.active_provider === "none" ? null : values.active_provider,
    };
    for (const p of EMAIL_PROVIDERS) {
      const v = values[p];
      const touched = Boolean(dirty[p] && Object.values(dirty[p]!).some(Boolean));
      if (!touched && values.active_provider !== p) continue;

      // Password: removed → null · typed → value · untouched → omitted (server keeps it).
      const patch: Record<string, unknown> = {};
      for (const field of EMAIL_FIELDS[p].fields) {
        if (field === "password") {
          if (v.clear_password) patch.password = null;
          else if (dirty[p]?.password && v.password) patch.password = v.password;
        } else if (field === "port") {
          patch.port = v.port ? Number(v.port) : null;
        } else {
          patch[field] = v[field];
        }
      }
      body[p] = patch;
    }

    try {
      const data = await apiFetch<EmailProviderApiResponse>(ENDPOINT, {
        method: "PATCH",
        token,
        body,
      });
      setState(data);
      hideSecrets(data);
      setSuccess(data.message ?? "Email provider settings saved");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setSuccess(null);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive" role="alert">{loadError}</p>;
  }

  if (!state) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const { isSubmitting, isDirty } = form.formState;
  const activeProvider = form.watch("active_provider");

  const renderField = (p: EmailProviderId, key: EmailFormField) => {
    const meta = PROVIDER_META[p].fields[key] ?? COMMON[key];
    if (!meta) return null;
    const optional = !EMAIL_FIELDS[p].required.includes(key);
    const name = `${p}.${key}` as FieldPath<EmailProviderFormValues>;
    const label = (
      <FormLabel>
        {meta.label}
        {optional && key !== "secure" ? (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </FormLabel>
    );

    if (key === "secure") {
      return (
        <FormField
          key={key}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0 self-end pb-2">
              <FormControl>
                <Switch checked={field.value === true} onCheckedChange={field.onChange} />
              </FormControl>
              {label}
            </FormItem>
          )}
        />
      );
    }

    if (key === "password") {
      const clearName = `${p}.clear_password` as FieldPath<EmailProviderFormValues>;
      return (
        <FormField
          key={key}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              {label}
              <FormControl>
                <SecretField
                  name={field.name}
                  value={String(field.value ?? "")}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasStored={state.providers[p].has_password}
                  cleared={form.watch(clearName) === true}
                  revealed={revealed}
                  onRequestReveal={() => setRevealOpen(true)}
                  onClear={() => {
                    form.setValue(clearName, true, { shouldDirty: true });
                    form.setValue(name, "", { shouldDirty: true });
                  }}
                  onUndoClear={() => form.setValue(clearName, false, { shouldDirty: true })}
                  placeholder={meta.placeholder ?? ""}
                  maxLength={512}
                />
              </FormControl>
              {meta.description ? <FormDescription>{meta.description}</FormDescription> : null}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    return (
      <FormField
        key={key}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            {label}
            <FormControl>
              <Input
                name={field.name}
                value={String(field.value ?? "")}
                onChange={(e) =>
                  field.onChange(key === "port" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value)
                }
                onBlur={field.onBlur}
                placeholder={meta.placeholder}
                inputMode={key === "port" ? "numeric" : undefined}
                type={key === "from_email" ? "email" : "text"}
                autoComplete="off"
                maxLength={key === "from_name" ? 100 : 255}
              />
            </FormControl>
            {meta.description ? <FormDescription>{meta.description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Lock className="size-4 shrink-0 text-brand-primary" />
          Passwords and API keys are encrypted (AES-256-GCM). Viewing them needs your password.
        </p>
        {revealed ? (
          <Button type="button" variant="outline" size="sm" onClick={() => hideSecrets(state)}>
            <EyeOff className="size-4" />
            Hide passwords
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setRevealOpen(true)}>
            <Eye className="size-4" />
            View saved passwords
          </Button>
        )}
      </div>

      {!state.active_provider ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" />
          {state.env_fallback
            ? "No provider is active here — email currently uses SMTP_HOST from the server .env."
            : "No provider is active — verification emails are only printed to the server console (development)."}
        </p>
      ) : null}

      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-4"
          autoComplete="off"
        >
          {EMAIL_PROVIDERS.map((p) => {
            const meta = PROVIDER_META[p];
            const active = activeProvider === p;
            return (
              <section
                key={p}
                className={cn(
                  "rounded-xl border border-border/80 bg-background p-4 sm:p-5",
                  active && "border-brand-primary/40 shadow-sm",
                )}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white",
                        meta.tint,
                      )}
                      aria-hidden
                    >
                      {meta.initials}
                    </span>
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {meta.label}
                        <StatusBadge active={active} ready={state.providers[p].ready} />
                      </h3>
                      <p className="text-xs font-medium text-brand-primary">{meta.bestFor}</p>
                      <p className="text-xs text-muted-foreground">{meta.docs}</p>
                      {meta.server ? (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{meta.server}</p>
                      ) : null}
                      {meta.website ? (
                        <ProviderLinks website={meta.website} apiDocs={meta.apiDocs} />
                      ) : null}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="active_provider"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormLabel className="text-xs text-muted-foreground">
                          {active ? "Active" : "Use this"}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value === p}
                            onCheckedChange={(on) => field.onChange(on ? p : "none")}
                            aria-label={`Use ${meta.label} for email`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {EMAIL_FIELDS[p].fields.map((key) => renderField(p, key))}
                </div>
              </section>
            );
          })}
        </form>
      </Form>

      <TestEmailCard token={token} disabled={!state.active_provider && !state.env_fallback} />

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={
              isDirty
                ? "Unsaved email provider changes."
                : "Only one provider can be active. It sends verification and account emails."
            }
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save email provider"}
        </Button>
      </StickyFormActions>

      <RevealSecretsDialog<EmailSecretsResponse>
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        endpoint={`${ENDPOINT}/reveal`}
        onRevealed={(data) => onRevealed(data.secrets)}
      />
    </div>
  );
}
