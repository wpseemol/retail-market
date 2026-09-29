import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, MessageSquareText, Send } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  SMS_FIELDS,
  SMS_PROVIDERS,
  makeSmsGatewayFormSchema,
  testSmsFormSchema,
  toSmsGatewayFormValues,
  type SmsCredentialField,
  type SmsGatewayApiResponse,
  type SmsGatewayFormValues,
  type SmsProvider,
  type SmsSecretsResponse,
  type TestSmsFormValues,
} from "@/lib/validators/smsGateway";
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
const ENDPOINT = "/api/dashboard/site-settings/sms-gateway";

type FieldMeta = { label: string; placeholder: string; description?: string };

const PROVIDER_META: Record<
  SmsProvider,
  {
    label: string;
    initials: string;
    tint: string;
    bestFor: string;
    docs: string;
    website: string;
    apiDocs?: string;
    fields: Partial<Record<SmsCredentialField, FieldMeta>>;
  }
> = {
  ssl_wireless: {
    label: "SSL Wireless SMS Plus",
    initials: "SSL",
    tint: "bg-sky-600",
    bestFor: "Best for high-volume, reliable OTP in Bangladesh",
    docs: "Enterprise gateway from the SSLCOMMERZ group. Whitelist your server IP in the SMS Plus panel.",
    website: "https://sslwireless.com",
    apiDocs: "https://smsplus.sslwireless.com",
    fields: {
      api_key: { label: "API token", placeholder: "Your SMS Plus API token" },
      sender_id: {
        label: "SID",
        placeholder: "BRANDNAMEAPI",
        description: "Provided by SSL Wireless for your approved sender.",
      },
    },
  },
  alpha_sms: {
    label: "Alpha SMS (sms.net.bd)",
    initials: "α",
    tint: "bg-violet-600",
    bestFor: "Best for quick setup with fast OTP delivery",
    docs: "Get the API key from portal.sms.net.bd → API. Sender ID is optional.",
    website: "https://sms.net.bd",
    apiDocs: "https://sms.net.bd/api",
    fields: {
      api_key: { label: "API key", placeholder: "Your sms.net.bd API key" },
      sender_id: {
        label: "Sender ID",
        placeholder: "Approved masking name (optional)",
        description: "Leave empty to use the default non-masking number.",
      },
    },
  },
  bulksmsbd: {
    label: "BulkSMSBD",
    initials: "BS",
    tint: "bg-emerald-600",
    bestFor: "Best for lowest cost per SMS",
    docs: "Get the API key and Sender ID from your BulkSMSBD panel → API.",
    website: "https://bulksmsbd.net",
    fields: {
      api_key: { label: "API key", placeholder: "Your BulkSMSBD API key" },
      sender_id: {
        label: "Sender ID",
        placeholder: "8809617xxxxxx",
        description: "Non-masking number or approved masking name.",
      },
    },
  },
  mim_sms: {
    label: "MiM SMS",
    initials: "MiM",
    tint: "bg-orange-600",
    bestFor: "Best for branded (masking) transactional SMS",
    docs: "API key: sms.mimsms.com → Utility → Developer. Sender name: Utility → Sender ID.",
    website: "https://www.mimsms.com",
    apiDocs: "https://apidoc.mimsms.com",
    fields: {
      account_sid: {
        label: "Username (panel email)",
        placeholder: "you@example.com",
        description: "The email you use to log in to sms.mimsms.com.",
      },
      api_key: { label: "API key", placeholder: "Your MiM SMS API key" },
      sender_id: {
        label: "Sender name",
        placeholder: "YourBrand",
        description: "Must exactly match a registered Sender ID.",
      },
    },
  },
  twilio: {
    label: "Twilio",
    initials: "TW",
    tint: "bg-red-600",
    bestFor: "Best for international numbers",
    docs: "Global coverage; more expensive for Bangladeshi numbers. Console → Account info.",
    website: "https://www.twilio.com",
    apiDocs: "https://www.twilio.com/docs/messaging",
    fields: {
      account_sid: { label: "Account SID", placeholder: "AC…" },
      api_key: { label: "Auth token", placeholder: "32-character auth token" },
      sender_id: {
        label: "From number / Messaging Service SID",
        placeholder: "+15551234567 or MG…",
      },
    },
  },
};

const DISPLAY_ORDER: SmsProvider[] = ["ssl_wireless", "alpha_sms", "bulksmsbd", "mim_sms", "twilio"];

function StatusBadge({ active, ready }: { active: boolean; ready: boolean }) {
  if (!active) return <Badge variant="outline">Inactive</Badge>;
  if (!ready) return <Badge variant="destructive">Incomplete</Badge>;
  return <Badge className="bg-brand-primary text-white hover:bg-brand-primary">Live</Badge>;
}

function TestSmsCard({ token, disabled }: { token: string; disabled: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<TestSmsFormValues>({
    resolver: zodResolver(testSmsFormSchema),
    defaultValues: { phone: "" },
  });

  async function onSubmit(values: TestSmsFormValues) {
    setResult(null);
    try {
      const data = await apiFetch<{ message: string }>(`${ENDPOINT}/test`, {
        method: "POST",
        token,
        body: { phone: `+88${values.phone}` },
      });
      setResult({ ok: true, message: data.message });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof ApiError ? err.message : "Test SMS failed",
      });
    }
  }

  return (
    <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Send className="size-4 text-brand-primary" />
        Send a test SMS
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Uses the saved active gateway. Save your changes first. One test every 30 seconds.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Mobile number</FormLabel>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +88
                  </span>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="01712345678"
                      className="rounded-l-none"
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/\D/g, "").slice(0, 11))
                      }
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={disabled || form.formState.isSubmitting}
            title={disabled ? "Activate and save a gateway first" : undefined}
          >
            {form.formState.isSubmitting ? "Sending…" : "Send test"}
          </Button>
        </form>
      </Form>
      {result ? (
        <p
          className={cn("mt-3 text-sm", result.ok ? "text-brand-primary" : "text-destructive")}
          role={result.ok ? "status" : "alert"}
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}

export function SmsGatewaySettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [state, setState] = useState<SmsGatewayApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const schema = useMemo(
    () => makeSmsGatewayFormSchema(state?.providers ?? {}),
    [state],
  );

  const form = useForm<SmsGatewayFormValues>({
    resolver: zodResolver(schema),
    defaultValues: state ? toSmsGatewayFormValues(state) : undefined,
  });

  const hideSecrets = useCallback(
    (current: SmsGatewayApiResponse | null) => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
      setRevealed(false);
      if (current) form.reset(toSmsGatewayFormValues(current));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<SmsGatewayApiResponse>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        setState(data);
        form.reset(toSmsGatewayFormValues(data));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load SMS gateway settings");
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

  function onRevealed(secrets: SmsSecretsResponse["secrets"]) {
    if (!state) return;
    const current = form.getValues();
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    const next = toSmsGatewayFormValues(state, secrets);
    next.active_provider = current.active_provider;
    // Revealed values become the new defaults; keep anything the admin already typed.
    for (const p of SMS_PROVIDERS) {
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

  async function onSubmit(values: SmsGatewayFormValues) {
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    // Credentials: removed → null · typed → value · untouched → omitted (server keeps it).
    const body: Record<string, unknown> = {
      active_provider: values.active_provider === "none" ? null : values.active_provider,
    };
    for (const p of SMS_PROVIDERS) {
      const v = values[p];
      const patch: Record<string, string | null> = {};
      for (const field of SMS_FIELDS[p].fields) {
        if (v[`clear_${field}`]) patch[field] = null;
        else if (dirty[p]?.[field] && v[field]) patch[field] = v[field];
      }
      if (Object.keys(patch).length > 0) body[p] = patch;
    }

    try {
      const data = await apiFetch<SmsGatewayApiResponse>(ENDPOINT, {
        method: "PATCH",
        token,
        body,
      });
      setState(data);
      hideSecrets(data);
      setSuccess(data.message ?? "SMS gateway settings saved");
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

  const renderCredential = (p: SmsProvider, key: SmsCredentialField) => {
    const meta = PROVIDER_META[p].fields[key];
    if (!meta) return null;
    const name = `${p}.${key}` as FieldPath<SmsGatewayFormValues>;
    const clearName = `${p}.clear_${key}` as FieldPath<SmsGatewayFormValues>;
    const hasStored = state.providers[p][`has_${key}`];
    const optional = !SMS_FIELDS[p].required.includes(key);
    return (
      <FormField
        key={key}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {meta.label}
              {optional ? (
                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              ) : null}
            </FormLabel>
            <FormControl>
              <SecretField
                name={field.name}
                value={String(field.value ?? "")}
                onChange={field.onChange}
                onBlur={field.onBlur}
                hasStored={hasStored}
                cleared={form.watch(clearName) === true}
                revealed={revealed}
                onRequestReveal={() => setRevealOpen(true)}
                onClear={() => {
                  form.setValue(clearName, true, { shouldDirty: true });
                  form.setValue(name, "", { shouldDirty: true });
                }}
                onUndoClear={() => form.setValue(clearName, false, { shouldDirty: true })}
                placeholder={meta.placeholder}
                maxLength={key === "api_key" ? 512 : key === "account_sid" ? 255 : 40}
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
          Credentials are encrypted (AES-256-GCM). Viewing them needs your password.
        </p>
        {revealed ? (
          <Button type="button" variant="outline" size="sm" onClick={() => hideSecrets(state)}>
            <EyeOff className="size-4" />
            Hide credentials
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setRevealOpen(true)}>
            <Eye className="size-4" />
            View saved credentials
          </Button>
        )}
      </div>

      {!state.active_provider ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <MessageSquareText className="size-4 shrink-0" />
          {state.env_fallback
            ? "No gateway is active here — SMS currently uses SMS_PROVIDER from the server .env."
            : "No gateway is active — OTP codes are only printed to the server console (development)."}
        </p>
      ) : null}

      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-4"
          autoComplete="off"
        >
          {DISPLAY_ORDER.map((p) => {
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
                        "flex size-10 items-center justify-center rounded-lg text-xs font-bold text-white",
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
                      <ProviderLinks website={meta.website} apiDocs={meta.apiDocs} />
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
                            aria-label={`Use ${meta.label} for SMS`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div
                  className={cn(
                    "grid gap-4",
                    SMS_FIELDS[p].fields.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2",
                  )}
                >
                  {SMS_FIELDS[p].fields.map((key) => renderCredential(p, key))}
                </div>
              </section>
            );
          })}
        </form>
      </Form>

      <TestSmsCard token={token} disabled={!state.active_provider && !state.env_fallback} />

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={
              isDirty
                ? "Unsaved SMS gateway changes."
                : "Only one gateway can be active. It sends phone verification codes."
            }
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save SMS gateway"}
        </Button>
      </StickyFormActions>

      <RevealSecretsDialog<SmsSecretsResponse>
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        endpoint={`${ENDPOINT}/reveal`}
        onRevealed={(data) => onRevealed(data.secrets)}
      />
    </div>
  );
}
