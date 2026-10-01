import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, ShieldAlert, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { BrandingImageDropzone } from "@/components/settings/BrandingImageDropzone";
import { CharCounter, SearchPreview, SharePreview } from "@/components/seo/SeoPreview";
import {
  FormSection,
  FormStatusMessage,
  PageHero,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { imageUploadHint } from "@/lib/imagePresets";
import {
  applyTitleTemplate,
  SEO_LIMITS,
  SEO_PAGE_KEYS,
  SEO_PAGE_META,
  STOREFRONT_URL,
  type SeoPageKey,
  type SeoSettings,
} from "@/lib/seo";
import { cn } from "@/lib/utils";
import {
  seoSettingsSchema,
  toSeoApiBody,
  toSeoFormValues,
  validateSeoOgImageFile,
  type SeoSettingsFormValues,
} from "@/lib/validators/seo";
import { useAuthStore } from "@/store/auth";

const EMPTY_PAGES = Object.fromEntries(
  SEO_PAGE_KEYS.map((k) => [k, { title: "", description: "" }]),
) as SeoSettingsFormValues["seo_pages"];

const EMPTY: SeoSettingsFormValues = {
  site_title: "",
  site_description: "",
  keywords: "",
  seo_title_template: "",
  og_title: "",
  og_description: "",
  twitter_title: "",
  twitter_description: "",
  twitter_handle: "",
  google_site_verification: "",
  bing_site_verification: "",
  seo_noindex_site: false,
  seo_pages: EMPTY_PAGES,
};

export function SeoSettingsPage() {
  const { token } = useAuthStore();
  const confirm = useConfirm();
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [activePage, setActivePage] = useState<SeoPageKey>("home");
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<SeoSettingsFormValues>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ seo: SeoSettings }>("/api/dashboard/seo", { token })
      .then((data) => {
        if (cancelled) return;
        setSettings(data.seo);
        form.reset(toSeoFormValues(data.seo));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load SEO settings");
      });
    return () => {
      cancelled = true;
    };
  }, [token, form]);

  function report(kind: "error" | "success", message: string) {
    setError(kind === "error" ? message : null);
    setSuccess(kind === "success" ? message : null);
  }

  async function onSubmit(values: SeoSettingsFormValues) {
    try {
      const data = await apiFetch<{ seo: SeoSettings }>("/api/dashboard/seo", {
        method: "PATCH",
        token,
        body: toSeoApiBody(values),
      });
      setSettings(data.seo);
      form.reset(toSeoFormValues(data.seo));
      report("success", "SEO settings saved — the storefront refreshes within a few seconds.");
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : "Failed to save SEO settings");
    }
  }

  async function onNoIndexChange(next: boolean, onChange: (v: boolean) => void) {
    if (next) {
      const ok = await confirm({
        title: "Hide the whole storefront from search engines?",
        description:
          "Every page gets a noindex tag, robots.txt blocks crawlers and the sitemap is emptied. Existing Google rankings drop over the following days. Only use this for staging or maintenance — it takes effect when you save.",
        confirmLabel: "Turn on noindex",
        tone: "warning",
      });
      if (!ok) return;
    }
    onChange(next);
  }

  async function onOgFile(file: File | null) {
    if (!file) return;
    const checked = validateSeoOgImageFile(file);
    if (!checked.ok) {
      report("error", checked.message);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiUpload<{ seo: SeoSettings }>("/api/dashboard/seo/og-image", fd, { token });
      setSettings(data.seo);
      report("success", "Share image updated");
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : "Share image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemoveOg() {
    const ok = await confirm({
      title: "Remove the default share image?",
      description:
        "Link previews fall back to the site logo. The uploaded file is deleted and cannot be restored — you can upload a new one any time.",
      confirmLabel: "Remove image",
    });
    if (!ok) return;
    setRemoving(true);
    try {
      const data = await apiFetch<{ seo: SeoSettings }>("/api/dashboard/seo/og-image", { method: "DELETE", token });
      setSettings(data.seo);
      report("success", "Share image removed");
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : "Failed to remove share image");
    } finally {
      setRemoving(false);
    }
  }

  const v = form.watch();
  const siteName = settings?.site_name ?? "Niyenin";
  const page = v.seo_pages?.[activePage] ?? { title: "", description: "" };
  const previewTitle =
    activePage === "home"
      ? page.title || v.site_title
      : applyTitleTemplate(page.title || SEO_PAGE_META[activePage].label, v.seo_title_template, siteName);
  const previewDescription = page.description || v.site_description;
  const { isSubmitting, isDirty } = form.formState;

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <PageHero
        eyebrow="Marketing & SEO"
        title="Search & share settings"
        description="How the storefront looks in Google, Bing and link previews. Store and brand pages can override these with their own SEO."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={`${STOREFRONT_URL}/sitemap.xml`} target="_blank" rel="noreferrer">
                sitemap.xml <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`${STOREFRONT_URL}/robots.txt`} target="_blank" rel="noreferrer">
                robots.txt <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </>
        }
      />

      {!settings ? (
        <div className="h-96 animate-pulse rounded-2xl bg-muted/60" />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
            noValidate
          >
            <div className="space-y-5">
              {v.seo_noindex_site ? (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p>
                    <span className="font-semibold text-destructive">Site-wide noindex is on.</span> Search engines
                    are told to drop every storefront page.
                  </p>
                </div>
              ) : null}

              <FormSection step="01" title="Search appearance" description="Default title, description and keywords for the whole site.">
                <FormField
                  control={form.control}
                  name="site_title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Site title</FormLabel>
                        <CharCounter value={field.value} {...SEO_LIMITS.title} />
                      </div>
                      <FormControl>
                        <Input placeholder="Niyenin | Online retail market in Bangladesh" {...field} />
                      </FormControl>
                      <FormDescription>Used on the home page and as the fallback for pages without their own title.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seo_title_template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title template</FormLabel>
                      <FormControl>
                        <Input placeholder={`%s | ${siteName}`} {...field} />
                      </FormControl>
                      <FormDescription>
                        <code>%s</code> is replaced by each page&apos;s title, e.g. “
                        {applyTitleTemplate("Canon EOS R50", field.value, siteName)}”.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site_description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Meta description</FormLabel>
                        <CharCounter value={field.value} {...SEO_LIMITS.description} />
                      </div>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>Search engines show about 155 characters.</FormDescription>
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
                        <Input placeholder="electronics, gadgets, cameras, Bangladesh" {...field} />
                      </FormControl>
                      <FormDescription>Optional, comma-separated. Google ignores them; some other engines still read them.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection step="02" title="Page defaults" description="Titles and descriptions for the main index pages. Leave blank to use the defaults.">
                <div role="tablist" aria-label="Page" className="flex flex-wrap gap-1.5">
                  {SEO_PAGE_KEYS.map((key) => {
                    const filled = Boolean(v.seo_pages?.[key]?.title || v.seo_pages?.[key]?.description);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={activePage === key}
                        onClick={() => setActivePage(key)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          activePage === key
                            ? "border-brand-primary bg-brand-primary text-white"
                            : "border-border text-muted-foreground hover:border-brand-primary/60",
                        )}
                      >
                        {SEO_PAGE_META[key].label}
                        {filled ? <span className="ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle" /> : null}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  <code>{SEO_PAGE_META[activePage].path}</code> — {SEO_PAGE_META[activePage].hint}
                </p>
                <FormField
                  key={`${activePage}-title`}
                  control={form.control}
                  name={`seo_pages.${activePage}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Title</FormLabel>
                        <CharCounter value={field.value} {...SEO_LIMITS.title} />
                      </div>
                      <FormControl>
                        <Input placeholder={activePage === "home" ? v.site_title : SEO_PAGE_META[activePage].label} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  key={`${activePage}-description`}
                  control={form.control}
                  name={`seo_pages.${activePage}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Description</FormLabel>
                        <CharCounter value={field.value} {...SEO_LIMITS.description} />
                      </div>
                      <FormControl>
                        <Textarea rows={2} placeholder={v.site_description} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection step="03" title="Social sharing" description="Open Graph and X (Twitter) cards for Facebook, WhatsApp, Messenger, LinkedIn and X.">
                <BrandingImageDropzone
                  title="Default share image"
                  emptyLabel="Share"
                  description={imageUploadHint("ogImage", 1, {
                    prefix: "Used when a page has no image of its own",
                  })}
                  previewUrl={settings.og_image?.path ?? null}
                  previewClassName="h-24 w-44"
                  imgClassName="object-cover p-0"
                  uploading={uploading}
                  disabled={isSubmitting || removing}
                  inputRef={fileRef}
                  onPick={() => fileRef.current?.click()}
                  onFile={(file) => void onOgFile(file)}
                />
                {settings.og_image ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={removing || uploading}
                    onClick={() => void onRemoveOg()}
                  >
                    <Trash2 className="size-3.5" />
                    {removing ? "Removing…" : "Remove share image"}
                  </Button>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["og_title", "Open Graph title", "Same as site title if blank"],
                      ["twitter_title", "X (Twitter) title", "Same as Open Graph title if blank"],
                    ] as const
                  ).map(([name, label, placeholder]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder={placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  {(
                    [
                      ["og_description", "Open Graph description"],
                      ["twitter_description", "X (Twitter) description"],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="Same as meta description if blank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormField
                  control={form.control}
                  name="twitter_handle"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>X (Twitter) handle</FormLabel>
                      <FormControl>
                        <Input placeholder="@niyenin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection step="04" title="Search console verification" description="Prove ownership in Google Search Console and Bing Webmaster Tools.">
                {(
                  [
                    ["google_site_verification", "Google Search Console", "google-site-verification"],
                    ["bing_site_verification", "Bing Webmaster Tools", "msvalidate.01"],
                  ] as const
                ).map(([name, label, metaName]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`<meta name="${metaName}" content="…" /> or just the code`}
                            className="font-mono text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Paste the HTML tag or the code — only the code is stored.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </FormSection>

              <FormSection step="05" tone="danger" title="Indexing" description="Emergency switch for staging or maintenance.">
                <FormField
                  control={form.control}
                  name="seo_noindex_site"
                  render={({ field }) => (
                    <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4">
                      <div className="space-y-1">
                        <FormLabel>Hide the entire storefront from search engines</FormLabel>
                        <FormDescription>
                          Adds noindex to every page, blocks crawlers in robots.txt and empties the sitemap.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(next) => void onNoIndexChange(next, field.onChange)}
                          aria-label="Site-wide noindex"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </FormSection>

              <StickyFormActions
                message={
                  <FormStatusMessage
                    error={error}
                    success={success}
                    idle={isDirty ? "Unsaved SEO changes." : "Saving refreshes the storefront within a few seconds."}
                  />
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty || isSubmitting}
                  onClick={() => form.reset(toSeoFormValues(settings))}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save SEO settings"}
                </Button>
              </StickyFormActions>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <SearchPreview
                title={previewTitle}
                description={previewDescription}
                path={SEO_PAGE_META[activePage].path}
                siteName={siteName}
                faviconUrl={settings.favicon?.path}
                noIndex={v.seo_noindex_site}
              />
              <SharePreview
                title={v.og_title || v.site_title}
                description={v.og_description || v.site_description}
                imageUrl={settings.og_image?.path}
              />
              <p className="px-1 text-xs text-muted-foreground">
                Previewing the <span className="font-medium text-foreground">{SEO_PAGE_META[activePage].label}</span> page.
                Switch pages under “Page defaults”.
              </p>
            </aside>
          </form>
        </Form>
      )}
    </div>
  );
}
