import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, MessageCircle, Send } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  WHATSAPP_FIELDS,
  WHATSAPP_PROVIDERS,
  makeWhatsAppGatewayFormSchema,
  testWhatsAppFormSchema,
  toWhatsAppGatewayApiBody,
  toWhatsAppGatewayFormValues,
  type TestWhatsAppFormValues,
  type WhatsAppCredentialField,
  type WhatsAppGatewayApiResponse,
  type WhatsAppGatewayFormValues,
  type WhatsAppProvider,
  type WhatsAppSecretsResponse,
} from "@/lib/validators/whatsappGateway";
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
const ENDPOINT = "/api/dashboard/site-settings/whatsapp-gateway";

type FieldMeta = { label: string; placeholder: string; description?: string; secret?: boolean };

const PROVIDER_META: Record<
  WhatsAppProvider,
  {
    label: string;
    initials: string;
    tint: string;
    bestFor: string;
    docs: string;
    website: string;
    apiDocs?: string;
    fields: Partial<Record<WhatsAppCredentialField, FieldMeta>>;
  }
> = {
  meta_cloud: {
    label: "Meta WhatsApp Cloud API",
    initials: "WA",
    tint: "bg-emerald-600",
    bestFor: "Official OTP via WhatsApp Business Platform",
    docs: "Create an AUTHENTICATION template in Meta Business Manager, then paste the Phone number ID and permanent token here. Free-form messages only work inside a 24h chat window — OTP must use an approved template.",
    website: "https://business.facebook.com",
    apiDocs: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: {
      access_token: {
        label: "Access token",
        placeholder: "Permanent / system-user token",
        secret: true,
      },
      phone_number_id: {
        label: "Phone number ID",
        placeholder: "123456789012345",
        description: "From Meta → WhatsApp → API Setup (not the display phone number).",
      },
      account_sid: {
        label: "WhatsApp Business Account ID",
        placeholder: "Optional WABA id",
        description: "Optional — stored for your records only.",
      },
      template_name: {
        label: "OTP template name",
        placeholder: "otp_verification",
        description: "Must be an approved AUTHENTICATION (or utility) template with {{1}} for the code.",
      },
      template_language: {
        label: "Template language",
        placeholder: "en",
      },
      api_version: {
        label: "Graph API version",
        placeholder: "v21.0",
      },
    },
  },
  twilio_whatsapp: {
    label: "Twilio WhatsApp",
    initials: "TW",
    tint: "bg-red-600",
    bestFor: "WhatsApp OTP through Twilio Content templates",
    docs: "Use a Twilio Content template (Content SID starts with HX) with variable {{1}} for the code. From must be your WhatsApp-enabled sender.",
    website: "https://www.twilio.com",
    apiDocs: "https://www.twilio.com/docs/whatsapp",
    fields: {
      access_token: {
        label: "Auth token",
        placeholder: "Twilio auth token",
        secret: true,
      },
      phone_number_id: {
        label: "From (WhatsApp)",
        placeholder: "whatsapp:+14155238886",
        description: "Include the whatsapp: prefix or an E.164 number.",
      },
      account_sid: {
        label: "Account SID",
        placeholder: "AC…",
      },
      template_name: {
        label: "Content SID",
        placeholder: "HX…",
        description: "Twilio Content template SID used for the OTP.",
      },
      template_language: {
        label: "Language (unused by Twilio)",
        placeholder: "en",
      },
    },
  },
};

const DISPLAY_ORDER: WhatsAppProvider[] = ["meta_cloud", "twilio_whatsapp"];

function StatusBadge({ active, ready }: { active: boolean; ready: boolean }) {
  if (!active) return <Badge variant="outline">Inactive</Badge>;
  if (!ready) return <Badge variant="destructive">Incomplete</Badge>;
  return <Badge className="bg-brand-primary text-white hover:bg-brand-primary">Live</Badge>;
}

function TestWhatsAppCard({ token, disabled }: { token: string; disabled: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<TestWhatsAppFormValues>({
    resolver: zodResolver(testWhatsAppFormSchema),
    defaultValues: { phone: "" },
  });

  async function onSubmit(values: TestWhatsAppFormValues) {
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
        message: err instanceof ApiError ? err.message : "Test WhatsApp send failed",
      });
    }
  }

  return (
    <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Send className="size-4 text-brand-primary" />
        Send a test WhatsApp OTP
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Uses the saved active gateway and template (code 000000). The destination must have WhatsApp.
        Save changes first. One test every 30 seconds.
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

export function WhatsAppGatewaySettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [state, setState] = useState<WhatsAppGatewayApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useToastMessages(success, error);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const schema = useMemo(() => makeWhatsAppGatewayFormSchema(state), [state]);

  const form = useForm<WhatsAppGatewayFormValues>({
    resolver: zodResolver(schema),
    defaultValues: state ? toWhatsAppGatewayFormValues(state) : undefined,
  });

  const hideSecrets = useCallback(
    (current: WhatsAppGatewayApiResponse | null) => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
      setRevealed(false);
      if (current) form.reset(toWhatsAppGatewayFormValues(current));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<WhatsAppGatewayApiResponse>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        setState(data);
        form.reset(toWhatsAppGatewayFormValues(data));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load WhatsApp gateway settings",
          );
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

  function onRevealed(secrets: WhatsAppSecretsResponse["secrets"]) {
    if (!state) return;
    const current = form.getValues();
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    const next = toWhatsAppGatewayFormValues(state, secrets);
    next.active_provider = current.active_provider;
    for (const p of WHATSAPP_PROVIDERS) {
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

  async function onSubmit(values: WhatsAppGatewayFormValues) {
    try {
      const data = await apiFetch<WhatsAppGatewayApiResponse>(ENDPOINT, {
        method: "PATCH",
        token,
        body: toWhatsAppGatewayApiBody(values),
      });
      setState(data);
      hideSecrets(data);
      setSuccess(data.message ?? "WhatsApp gateway settings saved");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setSuccess(null);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const { isSubmitting, isDirty } = form.formState;
  const activeProvider = form.watch("active_provider");

  const renderCredential = (p: WhatsAppProvider, key: WhatsAppCredentialField) => {
    const meta = PROVIDER_META[p].fields[key];
    if (!meta) return null;
    const name = `${p}.${key}` as FieldPath<WhatsAppGatewayFormValues>;
    const clearName = `${p}.clear_${key}` as FieldPath<WhatsAppGatewayFormValues>;
    const hasKey =
      key === "access_token"
        ? "has_access_token"
        : key === "phone_number_id"
          ? "has_phone_number_id"
          : key === "account_sid"
            ? "has_account_sid"
            : key === "template_name"
              ? "has_template_name"
              : null;
    const hasStored = hasKey ? state.providers[p][hasKey] : false;
    const optional = !WHATSAPP_FIELDS[p].required.includes(key);
    const isSecret = meta.secret || key === "access_token";

    if (key === "template_language" || key === "api_version") {
      return (
        <FormField
          key={key}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{meta.label}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value ?? "")}
                  placeholder={meta.placeholder}
                  maxLength={key === "api_version" ? 16 : 12}
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
            <FormLabel>
              {meta.label}
              {optional ? (
                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              ) : null}
            </FormLabel>
            <FormControl>
              {isSecret ? (
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
                  maxLength={2048}
                />
              ) : (
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
                  maxLength={key === "phone_number_id" ? 64 : 255}
                />
              )}
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
          Tokens are encrypted (AES-256-GCM). Viewing them needs your password.
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
          <MessageCircle className="size-4 shrink-0" />
          {state.env_fallback
            ? "No WhatsApp gateway is active here — OTP currently uses WHATSAPP_* from the server .env."
            : "No WhatsApp gateway is active — WhatsApp OTP codes are only printed to the server console (development)."}
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
                            aria-label={`Use ${meta.label} for WhatsApp OTP`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {WHATSAPP_FIELDS[p].fields.map((key) => renderCredential(p, key))}
                </div>

                {p === "meta_cloud" ? (
                  <FormField
                    control={form.control}
                    name={`${p}.template_button_param`}
                    render={({ field }) => (
                      <FormItem className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                        <div>
                          <FormLabel>Include URL button parameter</FormLabel>
                          <FormDescription>
                            Turn on for Meta AUTHENTICATION templates with a copy-code / URL button.
                            Turn off if your template only has a body {"{{1}}"}.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ) : null}
              </section>
            );
          })}
        </form>
      </Form>

      <TestWhatsAppCard token={token} disabled={!state.active_provider && !state.env_fallback} />

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={
              isDirty
                ? "Unsaved WhatsApp gateway changes."
                : "Only one WhatsApp gateway can be active. It sends phone verification codes when shoppers choose WhatsApp."
            }
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save WhatsApp gateway"}
        </Button>
      </StickyFormActions>

      <RevealSecretsDialog<WhatsAppSecretsResponse>
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        endpoint={`${ENDPOINT}/reveal`}
        onRevealed={(data) => onRevealed(data.secrets)}
      />
    </div>
  );
}
