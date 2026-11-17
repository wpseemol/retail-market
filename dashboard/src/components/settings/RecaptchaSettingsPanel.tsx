import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  recaptchaFormSchema,
  toRecaptchaApiBody,
  toRecaptchaFormValues,
  type RecaptchaApiResponse,
  type RecaptchaDto,
  type RecaptchaFormValues,
  type RecaptchaSecretsResponse,
} from "@/lib/validators/recaptcha";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import {
  ProviderLinks,
  RevealSecretsDialog,
  SecretField,
} from "@/components/settings/SecretCredentialFields";
import { SettingsCard } from "@/components/settings/SettingsSection";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const ENDPOINT = "/api/dashboard/site-settings/recaptcha";
const AUTO_HIDE_MS = 60_000;

function StatusBadge({ dto }: { dto: RecaptchaDto }) {
  if (!dto.is_enabled) return <Badge variant="outline">Disabled</Badge>;
  if (!dto.ready) return <Badge variant="destructive">Incomplete</Badge>;
  return (
    <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
      Live · {dto.version}
    </Badge>
  );
}

export function RecaptchaSettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [dto, setDto] = useState<RecaptchaDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useToastMessages(success, error);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const revealedValues = useRef<{ site_key?: string; secret_key?: string }>({});

  const form = useForm<RecaptchaFormValues>({
    resolver: zodResolver(recaptchaFormSchema),
    defaultValues: {
      is_enabled: false,
      version: "v2",
      site_key: "",
      clear_site_key: false,
      secret_key: "",
      clear_secret_key: false,
      v3_min_score: 0.5,
    },
  });

  const version = form.watch("version");
  const enabled = form.watch("is_enabled");
  const { isDirty, isSubmitting } = form.formState;

  const hideSecrets = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setRevealed(false);
    if (dto) {
      const next = toRecaptchaFormValues(dto);
      next.version = form.getValues("version");
      next.is_enabled = form.getValues("is_enabled");
      next.v3_min_score = form.getValues("v3_min_score");
      form.reset(next);
    }
    revealedValues.current = {};
  }, [dto, form]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<RecaptchaApiResponse>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        setDto(data.recaptcha);
        form.reset(toRecaptchaFormValues(data.recaptcha));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "Could not load reCAPTCHA settings",
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

  function onRevealed(data: RecaptchaSecretsResponse) {
    const { site_key, secret_key } = data.secrets;
    if (site_key && !form.getValues("site_key")) {
      form.setValue("site_key", site_key, { shouldDirty: false });
      revealedValues.current.site_key = site_key;
    }
    if (secret_key && !form.getValues("secret_key")) {
      form.setValue("secret_key", secret_key, { shouldDirty: false });
      revealedValues.current.secret_key = secret_key;
    }
    setRevealed(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(hideSecrets, AUTO_HIDE_MS);
  }

  async function onSubmit(values: RecaptchaFormValues) {
    setError(null);
    setSuccess(null);

    if (values.is_enabled) {
      let blocked = false;
      const willHaveSite =
        !values.clear_site_key &&
        (values.site_key.trim() !== "" || dto?.has_site_key);
      if (!willHaveSite) {
        form.setError("site_key", {
          message: "Required before enabling reCAPTCHA",
        });
        blocked = true;
      }
      const willHaveSecret =
        !values.clear_secret_key &&
        (values.secret_key !== "" || dto?.has_secret_key);
      if (!willHaveSecret) {
        form.setError("secret_key", {
          message: "Required before enabling reCAPTCHA",
        });
        blocked = true;
      }
      if (blocked) return;
    }

    try {
      const data = await apiFetch<RecaptchaApiResponse & { message: string }>(
        ENDPOINT,
        {
          method: "PATCH",
          token,
          body: toRecaptchaApiBody(values, {
            revealedSiteKey: revealedValues.current.site_key,
            revealedSecretKey: revealedValues.current.secret_key,
          }),
        },
      );
      setDto(data.recaptcha);
      setRevealed(false);
      revealedValues.current = {};
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      form.reset(toRecaptchaFormValues(data.recaptcha));
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!dto) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <SettingsCard
            title="Google reCAPTCHA"
            description="Protect storefront and dashboard login/register. Default is v2 (checkbox); switch to v3 for an invisible score check."
            icon={Shield}
            badge={<StatusBadge dto={dto} />}
          >
            <ProviderLinks
              website="https://www.google.com/recaptcha/admin"
              apiDocs="https://developers.google.com/recaptcha/docs/display"
            />

            <div className="mt-4 space-y-5">
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/80 px-3 py-2.5">
                    <div>
                      <FormLabel className="text-sm">Enable on auth forms</FormLabel>
                      <FormDescription>
                        Applies to storefront login/register and dashboard login when keys are set.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="v2">
                          v2 — checkbox (default)
                        </SelectItem>
                        <SelectItem value="v3">v3 — invisible score</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Create matching keys in the Google reCAPTCHA admin console for the chosen version.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {version === "v3" ? (
                <FormField
                  control={form.control}
                  name="v3_min_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>v3 minimum score</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.05"
                          min={0}
                          max={1}
                          className="max-w-xs"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value}
                          disabled={isSubmitting}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            field.onChange(Number.isFinite(n) ? n : 0.5);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        0.0 (bot) to 1.0 (human). Default 0.5.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {revealed
                    ? "Credentials visible for 60 seconds."
                    : "Saved credentials stay hidden until you confirm your password."}
                </p>
                {revealed ? (
                  <Button type="button" variant="outline" size="sm" onClick={hideSecrets}>
                    Hide credentials
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealOpen(true)}
                    disabled={!dto.has_site_key && !dto.has_secret_key}
                  >
                    View saved credentials
                  </Button>
                )}
              </div>

              <FormField
                control={form.control}
                name="site_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site key</FormLabel>
                    <FormControl>
                      <SecretField
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        hasStored={dto.has_site_key}
                        cleared={form.watch("clear_site_key")}
                        revealed={revealed}
                        onRequestReveal={() => setRevealOpen(true)}
                        onClear={() => {
                          form.setValue("clear_site_key", true, {
                            shouldDirty: true,
                          });
                          form.setValue("site_key", "", { shouldDirty: true });
                        }}
                        onUndoClear={() =>
                          form.setValue("clear_site_key", false, {
                            shouldDirty: true,
                          })
                        }
                        placeholder="6Lc…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secret_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret key</FormLabel>
                    <FormControl>
                      <SecretField
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        hasStored={dto.has_secret_key}
                        cleared={form.watch("clear_secret_key")}
                        revealed={revealed}
                        onRequestReveal={() => setRevealOpen(true)}
                        onClear={() => {
                          form.setValue("clear_secret_key", true, {
                            shouldDirty: true,
                          });
                          form.setValue("secret_key", "", { shouldDirty: true });
                        }}
                        onUndoClear={() =>
                          form.setValue("clear_secret_key", false, {
                            shouldDirty: true,
                          })
                        }
                        placeholder="6Lc…"
                      />
                    </FormControl>
                    <FormDescription>
                      Stored encrypted. Required{enabled ? " while enabled" : ""}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SettingsCard>
        </form>
      </Form>

      <RevealSecretsDialog<RecaptchaSecretsResponse>
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
                ? "Unsaved reCAPTCHA changes."
                : "Keys come from Google reCAPTCHA admin — never commit them to git."
            }
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save reCAPTCHA"}
        </Button>
      </StickyFormActions>
    </div>
  );
}
