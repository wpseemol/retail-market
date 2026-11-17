import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Fingerprint } from "lucide-react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { ApiError, apiFetch } from "@/lib/api";
import {
  KYC_PROVIDERS,
  kycFormSchema,
  toKycApiBody,
  toKycFormValues,
  type KycApiResponse,
  type KycDto,
  type KycFormValues,
  type KycSecretsResponse,
} from "@/lib/validators/kyc";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import {
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

const ENDPOINT = "/api/dashboard/site-settings/kyc";
const AUTO_HIDE_MS = 60_000;

function StatusBadge({ dto }: { dto: KycDto }) {
  if (dto.mode === "staff") {
    return (
      <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
        Staff review
      </Badge>
    );
  }
  if (!dto.is_enabled) return <Badge variant="outline">Paid API off</Badge>;
  if (!dto.ready) return <Badge variant="destructive">Incomplete</Badge>;
  return (
    <Badge className="bg-brand-primary text-white hover:bg-brand-primary">
      Paid API · {dto.provider}
    </Badge>
  );
}

export function KycSettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [dto, setDto] = useState<KycDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useToastMessages(success, error);
  const [revealed, setRevealed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      mode: "staff",
      is_enabled: false,
      provider: "",
      clear_provider: false,
      api_key: "",
      clear_api_key: false,
      api_base_url: "",
    },
  });

  const mode = form.watch("mode");
  const { isDirty, isSubmitting } = form.formState;

  const hideSecrets = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setRevealed(false);
    if (dto) form.reset(toKycFormValues(dto));
  }, [dto, form]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await apiFetch<KycApiResponse>(ENDPOINT, { token });
      setDto(data.kyc);
      form.reset(toKycFormValues(data.kyc));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load KYC settings");
    }
  }, [form, token]);

  useEffect(() => {
    void load();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [load]);

  async function onSubmit(values: KycFormValues) {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<KycApiResponse>(ENDPOINT, {
        method: "PATCH",
        token,
        body: toKycApiBody(values),
      });
      setDto(data.kyc);
      form.reset(toKycFormValues(data.kyc));
      setRevealed(false);
      setSuccess("KYC settings saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}{" "}
        <Button type="button" variant="link" className="h-auto p-0" onClick={() => void load()}>
          Retry
        </Button>
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
            title="Seller identity checks"
            description="Default is staff review of NID / birth certificate uploads. Optionally enable a paid KYC API later."
            icon={Fingerprint}
            badge={<StatusBadge dto={dto} />}
          >
            <div className="mt-4 space-y-5">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Staff review (default)</SelectItem>
                        <SelectItem value="paid_api">Paid KYC API</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Paid mode still requires an admin to approve the seller application.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === "paid_api" ? (
                <>
                  <FormField
                    control={form.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-border/80 px-3 py-2.5">
                        <div>
                          <FormLabel className="text-sm">Enable paid provider</FormLabel>
                          <FormDescription>
                            Provider adapter is stubbed until keys and HTTP wiring are ready.
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
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select
                          value={field.value || undefined}
                          onValueChange={(v) => {
                            field.onChange(v);
                            form.setValue("clear_provider", false);
                          }}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full max-w-xs">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {KYC_PROVIDERS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {revealed
                        ? "API key visible for 60 seconds."
                        : "Saved API key stays hidden until you confirm your password."}
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
                        disabled={!dto.has_api_key}
                      >
                        View saved credentials
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API key</FormLabel>
                        <FormControl>
                          <SecretField
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            hasStored={dto.has_api_key}
                            cleared={form.watch("clear_api_key")}
                            revealed={revealed}
                            onRequestReveal={() => setRevealOpen(true)}
                            onClear={() => {
                              form.setValue("clear_api_key", true, { shouldDirty: true });
                              form.setValue("api_key", "", { shouldDirty: true });
                            }}
                            onUndoClear={() =>
                              form.setValue("clear_api_key", false, { shouldDirty: true })
                            }
                            placeholder="••••••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="api_base_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API base URL (optional)</FormLabel>
                        <FormControl>
                          <Input
                            className="max-w-md"
                            placeholder="https://…"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BadgeCheck className="size-4 text-brand-primary" />
                  Staff document checklist
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {dto.staff_checklist.map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </div>
            </div>
          </SettingsCard>

          <FormStatusMessage success={success} error={error} />
          <StickyFormActions
            message={
              isDirty ? (
                <span className="text-muted-foreground">Unsaved changes</span>
              ) : null
            }
          >
            <Button type="submit" form={formId} disabled={!isDirty || isSubmitting}>
              {isSubmitting ? "Saving…" : "Save KYC settings"}
            </Button>
          </StickyFormActions>
        </form>
      </Form>

      <RevealSecretsDialog<KycSecretsResponse>
        open={revealOpen}
        onOpenChange={setRevealOpen}
        token={token}
        endpoint={`${ENDPOINT}/reveal`}
        onRevealed={(data) => {
          setRevealed(true);
          form.setValue("api_key", data.secrets.api_key ?? "", { shouldDirty: false });
          if (hideTimer.current) window.clearTimeout(hideTimer.current);
          hideTimer.current = window.setTimeout(hideSecrets, AUTO_HIDE_MS);
        }}
      />
    </div>
  );
}
