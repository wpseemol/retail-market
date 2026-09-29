import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Copy, Loader2, PlugZap } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  sslcommerzFormSchema,
  toSslcommerzApiBody,
  toSslcommerzFormValues,
  type PaymentGatewayStateDto,
  type PaymentSecretsDto,
  type SslcommerzFormValues,
  type SslcommerzSettingsDto,
} from "@/lib/validators/paymentGateway";
import {
  ProviderLinks,
  RevealSecretsDialog,
  SecretField,
} from "@/components/settings/SecretCredentialFields";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const ENDPOINT = "/api/dashboard/site-settings/payment-gateway";
const REVEAL_MS = 60_000;

function StatusBadge({ s }: { s: SslcommerzSettingsDto }) {
  if (s.active_source === "none") {
    return <Badge variant="outline" className="text-muted-foreground">Online payment off</Badge>;
  }
  return (
    <Badge variant="outline" className="border-brand-primary/30 bg-brand-tint/60 text-brand-deep">
      Active · {s.active_mode} · {s.active_source === "env" ? ".env" : "dashboard"}
    </Badge>
  );
}

function CallbackUrlRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Copy ${label} URL`}
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <CheckCircle2 className="size-3.5 text-brand-primary" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

export function PaymentGatewaySettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [state, setState] = useState<SslcommerzSettingsDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Values filled in by a reveal — unchanged ones are not re-sent on save. */
  const revealedValues = useRef<{ store_id?: string; store_password?: string }>({});

  const form = useForm<SslcommerzFormValues>({
    resolver: zodResolver(sslcommerzFormSchema),
    defaultValues: {
      is_enabled: false,
      is_live: false,
      store_id: "",
      clear_store_id: false,
      store_password: "",
      clear_password: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    apiFetch<PaymentGatewayStateDto>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        setState(data.sslcommerz);
        form.reset(toSslcommerzFormValues(data.sslcommerz));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load payment settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, form]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  function hideRevealed() {
    setRevealed(false);
    for (const key of ["store_id", "store_password"] as const) {
      const shown = revealedValues.current[key];
      if (shown && form.getValues(key) === shown) form.resetField(key, { defaultValue: "" });
    }
    revealedValues.current = {};
  }

  function onRevealed(data: PaymentSecretsDto) {
    const { store_id, store_password } = data.secrets.sslcommerz;
    if (!store_id && !store_password) return;
    // Only fill fields the user hasn't started replacing.
    if (store_id && !form.getValues("store_id")) {
      form.resetField("store_id", { defaultValue: store_id });
      revealedValues.current.store_id = store_id;
    }
    if (store_password && !form.getValues("store_password")) {
      form.resetField("store_password", { defaultValue: store_password });
      revealedValues.current.store_password = store_password;
    }
    setRevealed(true);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(hideRevealed, REVEAL_MS);
  }

  async function onSubmit(values: SslcommerzFormValues) {
    setError(null);
    setSuccess(null);
    if (values.is_enabled) {
      let blocked = false;
      const willHaveStoreId =
        !values.clear_store_id && (values.store_id.trim() !== "" || state?.has_store_id);
      if (!willHaveStoreId) {
        form.setError("store_id", { message: "Required before turning on online payment" });
        blocked = true;
      }
      const willHavePassword =
        !values.clear_password && (values.store_password !== "" || state?.has_store_password);
      if (!willHavePassword) {
        form.setError("store_password", { message: "Required before turning on online payment" });
        blocked = true;
      }
      if (blocked) return;
    }

    const shown = revealedValues.current;
    const changed: SslcommerzFormValues = {
      ...values,
      store_id: values.store_id === shown.store_id ? "" : values.store_id,
      store_password: values.store_password === shown.store_password ? "" : values.store_password,
    };

    try {
      const data = await apiFetch<PaymentGatewayStateDto & { message: string }>(
        `${ENDPOINT}/sslcommerz`,
        { method: "PATCH", token, body: toSslcommerzApiBody(changed) },
      );
      setState(data.sslcommerz);
      setRevealed(false);
      revealedValues.current = {};
      if (revealTimer.current) clearTimeout(revealTimer.current);
      form.reset(toSslcommerzFormValues(data.sslcommerz));
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function onTest() {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ message: string }>(`${ENDPOINT}/sslcommerz/test`, {
        method: "POST",
        token,
      });
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive" role="alert">{loadError}</p>;
  }
  if (!state) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  const { isSubmitting, isDirty } = form.formState;
  const clearPassword = form.watch("clear_password");
  const clearStoreId = form.watch("clear_store_id");
  const isLive = form.watch("is_live");

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-4"
          noValidate
        >
          <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">SSLCOMMERZ</p>
                <p className="text-xs text-muted-foreground">
                  bKash, Nagad, Rocket, Visa/Mastercard, and net banking through one hosted checkout.
                </p>
                <ProviderLinks
                  website="https://sslcommerz.com"
                  apiDocs="https://developer.sslcommerz.com/doc/v4/"
                />
              </div>
              <StatusBadge s={state} />
            </div>

            {state.env_fallback ? (
              <p className="mb-4 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Checkout is currently using the <code>SSLCZ_*</code> values from the backend <code>.env</code>. Once you
                save here, these dashboard settings take over.
              </p>
            ) : null}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 space-y-0">
                    <div>
                      <FormLabel>Accept online payment</FormLabel>
                      <FormDescription>
                        When off, customers can only choose Cash on Delivery.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_live"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 space-y-0">
                    <div>
                      <FormLabel>Live mode</FormLabel>
                      <FormDescription>
                        Off = sandbox (test cards, no real money). Turn on only with live store credentials from
                        SSLCOMMERZ.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {isLive ? (
                <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Live mode charges real money. Sandbox store IDs will not work here.
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store ID</FormLabel>
                      <FormControl>
                        <SecretField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          hasStored={state.has_store_id}
                          cleared={clearStoreId}
                          revealed={revealed}
                          onRequestReveal={() => setRevealOpen(true)}
                          onClear={() => {
                            form.setValue("clear_store_id", true, { shouldDirty: true });
                            form.setValue("store_id", "");
                          }}
                          onUndoClear={() => form.setValue("clear_store_id", false, { shouldDirty: true })}
                          placeholder="yourstore6abb022b347dd"
                          maxLength={100}
                        />
                      </FormControl>
                      <FormDescription>
                        From the SSLCOMMERZ merchant panel. Hidden — confirm your password to view. Leave blank to keep
                        the saved ID.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="store_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store password</FormLabel>
                      <FormControl>
                        <SecretField
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          hasStored={state.has_store_password}
                          cleared={clearPassword}
                          revealed={revealed}
                          onRequestReveal={() => setRevealOpen(true)}
                          onClear={() => {
                            form.setValue("clear_password", true, { shouldDirty: true });
                            form.setValue("store_password", "");
                          }}
                          onUndoClear={() => form.setValue("clear_password", false, { shouldDirty: true })}
                          placeholder="API / store password"
                          maxLength={255}
                        />
                      </FormControl>
                      <FormDescription>Stored encrypted. Leave blank to keep the saved password.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>
        </form>
      </Form>

      <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-sm font-semibold">Callback URLs</p>
          <p className="text-xs text-muted-foreground">
            Sent automatically with every payment. Add the IPN URL in the SSLCOMMERZ merchant panel too.
          </p>
        </div>
        <div className="space-y-1.5">
          <CallbackUrlRow label="Success" url={state.callback_urls.success} />
          <CallbackUrlRow label="Fail" url={state.callback_urls.fail} />
          <CallbackUrlRow label="Cancel" url={state.callback_urls.cancel} />
          <CallbackUrlRow label="IPN" url={state.callback_urls.ipn} />
        </div>
        {!state.callbacks_public ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            These point at localhost. Payments still work while testing on this computer, but SSLCOMMERZ cannot send
            IPN confirmations here. Set <code>PUBLIC_API_URL</code> in the backend <code>.env</code> to your public
            API address before going live.
          </p>
        ) : null}
      </section>

      <RevealSecretsDialog<PaymentSecretsDto>
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        endpoint={`${ENDPOINT}/reveal`}
        onRevealed={onRevealed}
      />

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={
              isDirty
                ? "Unsaved payment changes."
                : "Test connection opens a ৳10 session with the saved credentials — nothing is charged."
            }
          />
        }
      >
        <Button
          type="button"
          variant="outline"
          disabled={testing || isDirty || (!state.ready && !state.env_fallback)}
          title={isDirty ? "Save first, then test" : undefined}
          onClick={() => void onTest()}
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          Test connection
        </Button>
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save payment settings"}
        </Button>
      </StickyFormActions>
    </div>
  );
}
