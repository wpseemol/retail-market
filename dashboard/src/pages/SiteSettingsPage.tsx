import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  Globe,
  ImagePlus,
  Megaphone,
  Share2,
  Upload,
} from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  siteSettingsFormSchema,
  validateOgImageFile,
  type SiteSettingsApiResponse,
  type SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
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
import { Textarea } from "@/components/ui/textarea";

// ─── SettingsSection ──────────────────────────────────────────────────────────

function SettingsSection({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  description: string;
  icon?: typeof Globe;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/50 via-background to-background px-5 py-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-[11px] font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon ? (
              <Icon className="size-3.5 shrink-0 text-brand-deep" />
            ) : null}
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

// ─── TrackerRow ───────────────────────────────────────────────────────────────

type TrackerRowProps = {
  form: ReturnType<typeof useForm<SiteSettingsFormValues>>;
  label: string;
  enabledField: keyof SiteSettingsFormValues;
  idField: keyof SiteSettingsFormValues;
  idLabel: string;
  idPlaceholder: string;
};

function TrackerRow({
  form,
  label,
  enabledField,
  idField,
  idLabel,
  idPlaceholder,
}: TrackerRowProps) {
  const enabled = form.watch(enabledField) as boolean;
  const idValue = form.watch(idField) as string;
  const isConnected = enabled && !!idValue.trim();

  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Badge
          variant="outline"
          className={
            isConnected
              ? "border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
              : "text-muted-foreground"
          }
        >
          {isConnected ? "Connected" : "Not connected"}
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <FormField
          control={form.control}
          name={enabledField}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Status</FormLabel>
              <Select
                value={field.value ? "active" : "inactive"}
                onValueChange={(v) => field.onChange(v === "active")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={idField}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">{idLabel}</FormLabel>
              <FormControl>
                <Input
                  placeholder={idPlaceholder}
                  {...field}
                  value={field.value as string}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// ─── OG Image Dropzone ────────────────────────────────────────────────────────

function OgImageDropzone({
  previewUrl,
  uploading,
  disabled,
  onPick,
  inputRef,
  onFile,
}: {
  previewUrl?: string | null;
  uploading?: boolean;
  disabled?: boolean;
  onPick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-muted/40 via-background to-brand-tint/20">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          {previewUrl ? (
            <img src={previewUrl} alt="OG preview" className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlus className="size-6" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                OG Image
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Open Graph image</p>
            <p className="text-xs text-muted-foreground">
              Optional. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on
              the server.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={onPick}
          >
            <Upload className="size-3.5" />
            {uploading ? "Uploading…" : previewUrl ? "Replace image" : "Upload image"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sticky save bar ──────────────────────────────────────────────────────────

function SettingsStickyActions({
  children,
  message,
}: {
  children: ReactNode;
  message?: ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">{message}</div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

// ─── Default form values ──────────────────────────────────────────────────────

const DEFAULT_VALUES: SiteSettingsFormValues = {
  site_name: "",
  site_title: "",
  site_description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  twitter_title: "",
  twitter_description: "",
  twitter_handle: "",
  google_analytics_id: "",
  google_analytics_enabled: false,
  google_tag_manager_id: "",
  google_tag_manager_enabled: false,
  hotjar_site_id: "",
  hotjar_enabled: false,
  plerdy_site_id: "",
  plerdy_enabled: false,
  google_ads_id: "",
  google_ads_enabled: false,
  tiktok_pixel_id: "",
  tiktok_enabled: false,
  linkedin_partner_id: "",
  linkedin_enabled: false,
  twitter_pixel_id: "",
  twitter_pixel_enabled: false,
  meta_pixel_id: "",
  meta_pixel_enabled: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SiteSettingsPage() {
  const { token } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [ogUploading, setOgUploading] = useState(false);

  const ogFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await apiFetch<SiteSettingsApiResponse>(
          "/api/dashboard/site-settings",
          { token },
        );
        if (cancelled) return;
        const s = data.settings;
        setOgImageUrl(s.og_image?.path ?? null);
        form.reset({
          site_name: s.site_name,
          site_title: s.site_title,
          site_description: s.site_description,
          keywords: s.keywords ?? "",
          og_title: s.og_title ?? "",
          og_description: s.og_description ?? "",
          twitter_title: s.twitter_title ?? "",
          twitter_description: s.twitter_description ?? "",
          twitter_handle: s.twitter_handle ?? "",
          google_analytics_id: s.google_analytics_id ?? "",
          google_analytics_enabled: s.google_analytics_enabled,
          google_tag_manager_id: s.google_tag_manager_id ?? "",
          google_tag_manager_enabled: s.google_tag_manager_enabled,
          hotjar_site_id: s.hotjar_site_id ?? "",
          hotjar_enabled: s.hotjar_enabled,
          plerdy_site_id: s.plerdy_site_id ?? "",
          plerdy_enabled: s.plerdy_enabled,
          google_ads_id: s.google_ads_id ?? "",
          google_ads_enabled: s.google_ads_enabled,
          tiktok_pixel_id: s.tiktok_pixel_id ?? "",
          tiktok_enabled: s.tiktok_enabled,
          linkedin_partner_id: s.linkedin_partner_id ?? "",
          linkedin_enabled: s.linkedin_enabled,
          twitter_pixel_id: s.twitter_pixel_id ?? "",
          twitter_pixel_enabled: s.twitter_pixel_enabled,
          meta_pixel_id: s.meta_pixel_id ?? "",
          meta_pixel_enabled: s.meta_pixel_enabled,
        });
      } catch (err) {
        if (!cancelled)
          setLoadError(
            err instanceof ApiError ? err.message : "Failed to load site settings",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, form]);

  async function onSubmit(values: SiteSettingsFormValues) {
    if (!token) return;
    setSubmitError(null);
    setSaveSuccess(null);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings",
        { method: "PATCH", token, body: values },
      );
      const s = data.settings;
      setOgImageUrl(s.og_image?.path ?? null);
      setSaveSuccess("Site settings saved");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to save site settings",
      );
    }
  }

  async function onOgImageFile(file: File | null) {
    if (!token || !file) return;
    const checked = validateOgImageFile(file);
    if (!checked.ok) {
      setSubmitError(checked.message);
      setSaveSuccess(null);
      if (ogFileRef.current) ogFileRef.current.value = "";
      return;
    }
    setOgUploading(true);
    setSubmitError(null);
    setSaveSuccess(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiUpload<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings/og-image",
        fd,
        { token },
      );
      setOgImageUrl(data.settings.og_image?.path ?? null);
      setSaveSuccess("OG image updated");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "OG image upload failed",
      );
    } finally {
      setOgUploading(false);
      if (ogFileRef.current) ogFileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
        <div className="space-y-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          SEO metadata, social share previews, and analytics / advertising
          integrations for the main storefront.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          {/* ── Section 01: Website identity ─────────────────────────────── */}
          <SettingsSection
            step="01"
            title="Website identity"
            description="Site name, page title, meta description, and keywords."
            icon={Globe}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="site_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site name</FormLabel>
                    <FormControl>
                      <Input placeholder="Niyenin" {...field} />
                    </FormControl>
                    <FormDescription>Short brand name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="site_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page title</FormLabel>
                    <FormControl>
                      <Input placeholder="Niyenin | Retail Market" {...field} />
                    </FormControl>
                    <FormDescription>
                      Shown in the browser tab and search results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="site_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>
                    10–500 characters. Shown in search engine snippets.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="retail, electronics, gadgets, …"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional comma-separated keywords.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* ── Section 02: Social share ──────────────────────────────────── */}
          <SettingsSection
            step="02"
            title="Social share"
            description="Open Graph and Twitter/X card metadata for link previews."
            icon={Share2}
          >
            <OgImageDropzone
              previewUrl={ogImageUrl}
              uploading={ogUploading}
              disabled={isSubmitting}
              inputRef={ogFileRef}
              onPick={() => ogFileRef.current?.click()}
              onFile={(file) => void onOgImageFile(file)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="og_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG title</FormLabel>
                    <FormControl>
                      <Input placeholder="Same as page title if blank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="twitter_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter/X title</FormLabel>
                    <FormControl>
                      <Input placeholder="Same as OG title if blank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="og_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OG description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="twitter_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter/X description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="twitter_handle"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Twitter/X handle</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormDescription>
                    Include the @ sign, e.g. @niyenin.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* ── Section 03: Analytics ─────────────────────────────────────── */}
          <SettingsSection
            step="03"
            title="Analytics"
            description="Enable and configure analytics tracking for the storefront."
            icon={BarChart3}
          >
            <TrackerRow
              form={form}
              label="Google Analytics (GA4)"
              enabledField="google_analytics_enabled"
              idField="google_analytics_id"
              idLabel="Measurement ID"
              idPlaceholder="G-XXXXXXXXXX"
            />
            <TrackerRow
              form={form}
              label="Google Tag Manager"
              enabledField="google_tag_manager_enabled"
              idField="google_tag_manager_id"
              idLabel="Container ID"
              idPlaceholder="GTM-XXXXXXX"
            />
            <TrackerRow
              form={form}
              label="Hotjar"
              enabledField="hotjar_enabled"
              idField="hotjar_site_id"
              idLabel="Site ID"
              idPlaceholder="1234567"
            />
            <TrackerRow
              form={form}
              label="Plerdy"
              enabledField="plerdy_enabled"
              idField="plerdy_site_id"
              idLabel="Site ID"
              idPlaceholder="abcd1234"
            />
          </SettingsSection>

          {/* ── Section 04: Advertising pixels ───────────────────────────── */}
          <SettingsSection
            step="04"
            title="Advertising pixels"
            description="Enable and configure advertising conversion pixels."
            icon={Megaphone}
          >
            <TrackerRow
              form={form}
              label="Google Ads"
              enabledField="google_ads_enabled"
              idField="google_ads_id"
              idLabel="Conversion ID"
              idPlaceholder="AW-123456789"
            />
            <TrackerRow
              form={form}
              label="TikTok Pixel"
              enabledField="tiktok_enabled"
              idField="tiktok_pixel_id"
              idLabel="Pixel ID"
              idPlaceholder="ABCDEFGHIJ1234567890"
            />
            <TrackerRow
              form={form}
              label="LinkedIn Insight Tag"
              enabledField="linkedin_enabled"
              idField="linkedin_partner_id"
              idLabel="Partner ID"
              idPlaceholder="1234567"
            />
            <TrackerRow
              form={form}
              label="Twitter/X Pixel"
              enabledField="twitter_pixel_enabled"
              idField="twitter_pixel_id"
              idLabel="Pixel ID"
              idPlaceholder="abcde12345"
            />
            <TrackerRow
              form={form}
              label="Meta (Facebook) Pixel"
              enabledField="meta_pixel_enabled"
              idField="meta_pixel_id"
              idLabel="Pixel ID"
              idPlaceholder="123456789012345"
            />
          </SettingsSection>

          {/* ── Sticky save bar ───────────────────────────────────────────── */}
          <SettingsStickyActions
            message={
              submitError ? (
                <p className="text-destructive" role="alert">
                  {submitError}
                </p>
              ) : saveSuccess ? (
                <p className="text-brand-primary" role="status">
                  {saveSuccess}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Changes apply to the storefront immediately after saving.
                </p>
              )
            }
          >
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save settings"}
            </Button>
          </SettingsStickyActions>
        </form>
      </Form>
    </div>
  );
}
