import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  CREDENTIAL_FIELDS,
  SOCIAL_PROVIDERS,
  makeSocialLoginFormSchema,
  type CredentialField,
  revealSecretsFormSchema,
  toSocialLoginFormValues,
  type RevealSecretsFormValues,
  type SocialLoginApiResponse,
  type SocialLoginFormValues,
  type SocialProvider,
  type SocialProviderDto,
  type SocialSecretsResponse,
} from "@/lib/validators/socialLogin";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const AUTO_HIDE_MS = 60_000;

type Props = {
  token: string;
};

type Providers = SocialLoginApiResponse["providers"];

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-foreground" aria-hidden>
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 5.1c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5Z" />
    </svg>
  );
}

const PROVIDER_META: Record<
  SocialProvider,
  { label: string; icon: () => ReactNode; clientIdLabel: string; clientIdHint: string; docs: string }
> = {
  google: {
    label: "Google",
    icon: GoogleMark,
    clientIdLabel: "OAuth client ID",
    clientIdHint: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Web client.",
    docs: "Add your storefront URL to Authorized JavaScript origins.",
  },
  facebook: {
    label: "Facebook",
    icon: FacebookMark,
    clientIdLabel: "App ID",
    clientIdHint: "Meta for Developers → your app → App settings → Basic.",
    docs: "Enable Facebook Login for Web and add your storefront domain to App Domains.",
  },
  apple: {
    label: "Apple",
    icon: AppleMark,
    clientIdLabel: "Services ID",
    clientIdHint: "Apple Developer → Identifiers → Services IDs (e.g. com.example.web).",
    docs: "Register your storefront domain and the /login return URL on the Services ID.",
  },
};

function StatusBadge({ dto, enabled }: { dto: SocialProviderDto; enabled: boolean }) {
  if (dto.env_fallback) {
    return <Badge variant="outline">Using .env client ID</Badge>;
  }
  if (!enabled) return <Badge variant="outline">Disabled</Badge>;
  if (!dto.ready) return <Badge variant="destructive">Incomplete</Badge>;
  return <Badge className="bg-brand-primary text-white hover:bg-brand-primary">Live</Badge>;
}

/** Password-type secret input. Viewing requires a password-confirmed reveal. */
function SecretField({
  value,
  onChange,
  onBlur,
  name,
  hasStored,
  cleared,
  revealed,
  onRequestReveal,
  onClear,
  onUndoClear,
  multiline,
  placeholder,
  maxLength,
  uppercase,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  hasStored: boolean;
  cleared: boolean;
  revealed: boolean;
  onRequestReveal: () => void;
  onClear: () => void;
  onUndoClear: () => void;
  multiline?: boolean;
  placeholder: string;
  maxLength?: number;
  uppercase?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const handleChange = (v: string) => onChange(uppercase ? v.toUpperCase() : v);

  useEffect(() => {
    if (!revealed) setVisible(false);
  }, [revealed]);

  if (cleared) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-sm">
        <span className="text-destructive">Will be removed on save.</span>
        <Button type="button" variant="ghost" size="sm" onClick={onUndoClear}>
          Undo
        </Button>
      </div>
    );
  }

  const storedPlaceholder = hasStored
    ? "•••••••••••• saved — type to replace"
    : placeholder;
  const canToggle = revealed || value.length > 0;

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <Textarea
          name={name}
          rows={visible ? 6 : 3}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={storedPlaceholder}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "font-mono text-xs",
            !visible && "[-webkit-text-security:disc]",
          )}
        />
      ) : (
        <Input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={storedPlaceholder}
          maxLength={maxLength}
          spellCheck={false}
          autoComplete="new-password"
          className="font-mono"
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={visible ? "Hide value" : "Show value"}
        title={
          canToggle
            ? visible
              ? "Hide"
              : "Show"
            : "Confirm your password to view"
        }
        disabled={!hasStored && !canToggle}
        onClick={() => {
          if (canToggle) setVisible((v) => !v);
          else onRequestReveal();
        }}
      >
        {visible ? <EyeOff className="size-4" /> : canToggle ? <Eye className="size-4" /> : <Lock className="size-4" />}
      </Button>
      {hasStored ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Remove saved secret"
          title="Remove saved secret"
          onClick={onClear}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function RevealDialog({
  open,
  onOpenChange,
  token,
  onRevealed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onRevealed: (secrets: SocialSecretsResponse["secrets"]) => void;
}) {
  const form = useForm<RevealSecretsFormValues>({
    resolver: zodResolver(revealSecretsFormSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (!open) form.reset({ password: "" });
  }, [open, form]);

  async function onSubmit(values: RevealSecretsFormValues) {
    try {
      const data = await apiFetch<SocialSecretsResponse>(
        "/api/dashboard/site-settings/social-login/reveal",
        { method: "POST", token, body: values },
      );
      onRevealed(data.secrets);
      onOpenChange(false);
    } catch (err) {
      form.setError("password", {
        message: err instanceof ApiError ? err.message : "Could not verify password",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-primary" />
            Confirm it&apos;s you
          </DialogTitle>
          <DialogDescription>
            Enter your dashboard password to view saved credentials. They hide
            again automatically after 60 seconds, and each view is logged in
            History.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                View credentials
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SocialLoginSettingsPanel({ token }: Props) {
  const formId = useId();
  const [providers, setProviders] = useState<Providers | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const schema = useMemo(
    () => makeSocialLoginFormSchema(providers ?? {}),
    [providers],
  );

  const form = useForm<SocialLoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: providers ? toSocialLoginFormValues(providers) : undefined,
  });

  const hideSecrets = useCallback(
    (current: Providers | null) => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
      setRevealed(false);
      if (current) form.reset(toSocialLoginFormValues(current));
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<SocialLoginApiResponse>("/api/dashboard/site-settings/social-login", { token })
      .then((data) => {
        if (cancelled) return;
        setProviders(data.providers);
        form.reset(toSocialLoginFormValues(data.providers));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load social login settings");
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

  function onRevealed(secrets: SocialSecretsResponse["secrets"]) {
    if (!providers) return;
    const current = form.getValues();
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    const next = toSocialLoginFormValues(providers, secrets);
    // Revealed values become the new defaults; keep anything the admin already typed.
    for (const p of SOCIAL_PROVIDERS) {
      const target = next[p] as Record<string, unknown>;
      const typed = current[p] as Record<string, unknown>;
      for (const key of Object.keys(target)) {
        if (dirty[p]?.[key]) target[key] = typed[key];
      }
    }
    form.reset(next, { keepDirty: true });
    setRevealed(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => hideSecrets(providers), AUTO_HIDE_MS);
  }

  async function onSubmit(values: SocialLoginFormValues) {
    const dirty = form.formState.dirtyFields as Record<string, Record<string, boolean> | undefined>;
    // Credentials: removed → null · typed → value · untouched → omitted (server keeps it).
    const body = Object.fromEntries(
      SOCIAL_PROVIDERS.map((p) => {
        const v = values[p] as Record<string, string | boolean>;
        const patch: Record<string, string | boolean | null> = {
          is_enabled: values[p].is_enabled,
        };
        for (const field of CREDENTIAL_FIELDS[p]) {
          if (v[`clear_${field}`]) patch[field] = null;
          else if (dirty[p]?.[field] && v[field]) patch[field] = v[field];
        }
        return [p, patch];
      }),
    );

    try {
      const data = await apiFetch<SocialLoginApiResponse>(
        "/api/dashboard/site-settings/social-login",
        { method: "PATCH", token, body },
      );
      setProviders(data.providers);
      hideSecrets(data.providers);
      setSuccess(data.message ?? "Social login settings saved");
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Save failed");
      }
      setSuccess(null);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive" role="alert">{loadError}</p>;
  }

  if (!providers) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const { isSubmitting, isDirty } = form.formState;

  /** Every saved credential renders masked; viewing needs the password dialog. */
  const renderCredential = (
    p: SocialProvider,
    key: CredentialField,
    opts: {
      label: string;
      optional?: boolean;
      description?: string;
      placeholder: string;
      multiline?: boolean;
      maxLength?: number;
      uppercase?: boolean;
      className?: string;
    },
  ) => {
    const name = `${p}.${key}` as FieldPath<SocialLoginFormValues>;
    const clearName = `${p}.clear_${key}` as FieldPath<SocialLoginFormValues>;
    const hasStored = providers[p][`has_${key}` as keyof SocialProviderDto] === true;
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className={opts.className}>
            <FormLabel>
              {opts.label}
              {opts.optional ? (
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
                placeholder={opts.placeholder}
                multiline={opts.multiline}
                maxLength={opts.maxLength}
                uppercase={opts.uppercase}
              />
            </FormControl>
            {opts.description ? <FormDescription>{opts.description}</FormDescription> : null}
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
          All saved credentials are hidden. Viewing them needs your password.
        </p>
        {revealed ? (
          <Button type="button" variant="outline" size="sm" onClick={() => hideSecrets(providers)}>
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

      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-4"
          autoComplete="off"
        >
          {(["google", "facebook", "apple"] as const).map((p) => {
            const Meta = PROVIDER_META[p];
            const enabled = form.watch(`${p}.is_enabled`);
            return (
              <section
                key={p}
                className={cn(
                  "rounded-xl border border-border/80 bg-background p-4 sm:p-5",
                  enabled && "border-brand-primary/40 shadow-sm",
                )}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-border/80 bg-card">
                      <Meta.icon />
                    </span>
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        {Meta.label} login
                        <StatusBadge dto={providers[p]} enabled={enabled} />
                      </h3>
                      <p className="text-xs text-muted-foreground">{Meta.docs}</p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name={`${p}.is_enabled`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormLabel className="text-xs text-muted-foreground">
                          {field.value ? "Enabled" : "Disabled"}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label={`Enable ${Meta.label} login`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderCredential(p, "client_id", {
                    label: Meta.clientIdLabel,
                    description: Meta.clientIdHint,
                    placeholder:
                      p === "google"
                        ? "1234-abc.apps.googleusercontent.com"
                        : p === "facebook"
                          ? "123456789012345"
                          : "com.example.web",
                  })}
                  {p === "apple" ? (
                    <div className="grid grid-cols-2 gap-4">
                      {renderCredential(p, "team_id", {
                        label: "Team ID",
                        placeholder: "ABCDE12345",
                        maxLength: 10,
                        uppercase: true,
                      })}
                      {renderCredential(p, "key_id", {
                        label: "Key ID",
                        placeholder: "ABCDE12345",
                        maxLength: 10,
                        uppercase: true,
                      })}
                    </div>
                  ) : (
                    renderCredential(p, "client_secret", {
                      label: p === "facebook" ? "App secret" : "Client secret",
                      optional: p === "google",
                      placeholder: p === "facebook" ? "32-character app secret" : "GOCSPX-…",
                      description:
                        p === "facebook"
                          ? "Used by the API to verify Facebook tokens. Never sent to the storefront."
                          : "Not needed for the popup sign-in flow; stored encrypted for server-side OAuth.",
                    })
                  )}
                </div>

                {p === "apple"
                  ? renderCredential(p, "private_key", {
                      label: "Private key (.p8)",
                      optional: true,
                      multiline: true,
                      className: "mt-4",
                      placeholder: "-----BEGIN PRIVATE KEY-----",
                      description:
                        "Sign in with Apple key (Keys → + → Sign in with Apple). Login itself only needs the Services ID; the key is stored encrypted for token revocation / server flows.",
                    })
                  : null}
              </section>
            );
          })}
        </form>
      </Form>

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={
              isDirty
                ? "Unsaved social login changes."
                : "Enabled providers appear on the storefront login and sign-up pages."
            }
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save social login"}
        </Button>
      </StickyFormActions>

      <RevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        onRevealed={onRevealed}
      />
    </div>
  );
}
