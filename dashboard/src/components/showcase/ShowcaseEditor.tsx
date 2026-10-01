import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Lock,
  Megaphone,
  Palette,
  LayoutList,
  Contact,
  ScrollText,
  SearchCheck,
} from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { CharCounter, SearchPreview, SharePreview } from "@/components/seo/SeoPreview";
import { FormSection, FormStatusMessage, StickyFormActions } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { imageUploadHint, type ImagePresetKey } from "@/lib/imagePresets";
import { SEO_LIMITS, STOREFRONT_URL } from "@/lib/seo";
import {
  ACCENT_SWATCHES,
  ANNOUNCEMENT_TONES,
  contrastRatio,
  HERO_STYLE_META,
  isHexColor,
  SHOWCASE_HERO_STYLES,
  SHOWCASE_SECTION_META,
  SOCIAL_KEYS,
  SOCIAL_META,
  type ShowcasePayload,
} from "@/lib/showcase";
import { cn } from "@/lib/utils";
import {
  showcaseFormSchema,
  toShowcaseApiBody,
  toShowcaseFormValues,
  validateShowcaseImageFile,
  type ShowcaseFormValues,
  type ShowcaseImageSlot,
} from "@/lib/validators/showcase";
import { useAuthStore } from "@/store/auth";
import { ShowcaseImageField } from "./ShowcaseImageField";
import { ShowcasePreview } from "./ShowcasePreview";

type Kind = "store" | "brand";

const TABS = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "layout", label: "Layout", icon: LayoutList },
  { id: "about", label: "About & contact", icon: Contact },
  { id: "policies", label: "Policies", icon: ScrollText },
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "seo", label: "SEO", icon: SearchCheck },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Which tab holds the first invalid field, so a failed save jumps there. */
function tabForErrors(errors: FieldErrors<ShowcaseFormValues>): TabId {
  if (errors.tagline || errors.accent_color) return "branding";
  if (errors.seo_title || errors.seo_description || errors.seo_keywords) return "seo";
  const s = errors.showcase;
  if (s?.about || s?.contact || s?.social) return "about";
  if (s?.policies) return "policies";
  if (s?.announcement) return "announcement";
  return "layout";
}

type MediaSlot = {
  key: "logo" | "banner" | "og";
  title: string;
  preset: ImagePresetKey;
  limit: ShowcaseImageSlot;
  path: string;
  field: string;
  removable: boolean;
};

function mediaSlots(kind: Kind, apiBase: string): Record<MediaSlot["key"], MediaSlot> {
  return kind === "store"
    ? {
        logo: { key: "logo", title: "Store logo", preset: "shopLogo", limit: "storeLogo", path: `${apiBase}/logo`, field: "logo", removable: false },
        banner: { key: "banner", title: "Banner", preset: "shopBanner", limit: "storeBanner", path: `${apiBase}/banner`, field: "banner", removable: false },
        og: { key: "og", title: "Share image", preset: "ogImage", limit: "og", path: `${apiBase}/og-image`, field: "image", removable: true },
      }
    : {
        logo: { key: "logo", title: "Brand logo", preset: "brand", limit: "brandLogo", path: `${apiBase}/image`, field: "image", removable: false },
        banner: { key: "banner", title: "Banner", preset: "brandBanner", limit: "brandBanner", path: `${apiBase}/banner`, field: "banner", removable: true },
        og: { key: "og", title: "Share image", preset: "ogImage", limit: "og", path: `${apiBase}/og-image`, field: "image", removable: true },
      };
}

export function ShowcaseEditor({
  kind,
  apiBase,
  onLoaded,
}: {
  kind: Kind;
  /** `/api/dashboard/shops/:slug` or `/api/dashboard/brands/:id`. */
  apiBase: string;
  onLoaded?: (payload: ShowcasePayload) => void;
}) {
  const { token } = useAuthStore();
  const confirm = useConfirm();
  const [payload, setPayload] = useState<ShowcasePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("branding");
  const [busy, setBusy] = useState<{ slot: MediaSlot["key"]; action: "upload" | "remove" } | null>(null);

  const form = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseFormSchema),
    mode: "onBlur",
  });

  const applyPayload = useCallback(
    (next: ShowcasePayload, resetForm: boolean) => {
      setPayload(next);
      onLoaded?.(next);
      if (resetForm) form.reset(toShowcaseFormValues(next));
    },
    [form, onLoaded],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ showcase: ShowcasePayload }>(`${apiBase}/showcase`, { token })
      .then((data) => {
        if (!cancelled) applyPayload(data.showcase, true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load the page design");
      });
    return () => {
      cancelled = true;
    };
  }, [token, apiBase, applyPayload]);

  function report(kindOf: "error" | "success", message: string) {
    setError(kindOf === "error" ? message : null);
    setSuccess(kindOf === "success" ? message : null);
  }

  async function refreshMedia() {
    const data = await apiFetch<{ showcase: ShowcasePayload }>(`${apiBase}/showcase`, { token });
    applyPayload(data.showcase, false);
  }

  async function onSubmit(values: ShowcaseFormValues) {
    try {
      const data = await apiFetch<{ showcase: ShowcasePayload }>(`${apiBase}/showcase`, {
        method: "PATCH",
        token,
        body: toShowcaseApiBody(values),
      });
      applyPayload(data.showcase, true);
      report("success", "Page saved — the storefront refreshes within a few seconds.");
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : "Failed to save the page");
    }
  }

  function onInvalid(errors: FieldErrors<ShowcaseFormValues>) {
    setTab(tabForErrors(errors));
    report("error", "Fix the highlighted fields before saving.");
  }

  async function uploadMedia(slot: MediaSlot, file: File) {
    const checked = validateShowcaseImageFile(file, slot.limit, slot.title);
    if (!checked.ok) {
      report("error", checked.message);
      return;
    }
    setBusy({ slot: slot.key, action: "upload" });
    try {
      const fd = new FormData();
      fd.append(slot.field, file);
      await apiUpload(slot.path, fd, { token });
      await refreshMedia();
      report("success", `${slot.title} updated`);
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : `${slot.title} upload failed`);
    } finally {
      setBusy(null);
    }
  }

  async function removeMedia(slot: MediaSlot) {
    const ok = await confirm({
      title: `Remove the ${slot.title.toLowerCase()}?`,
      description:
        slot.key === "og"
          ? "Link previews fall back to the logo or banner. The file is deleted and cannot be restored."
          : "The page falls back to an accent-colour gradient. The file is deleted and cannot be restored.",
      confirmLabel: `Remove ${slot.title.toLowerCase()}`,
    });
    if (!ok) return;
    setBusy({ slot: slot.key, action: "remove" });
    try {
      await apiFetch(slot.path, { method: "DELETE", token });
      await refreshMedia();
      report("success", `${slot.title} removed`);
    } catch (err) {
      report("error", err instanceof ApiError ? err.message : `Failed to remove ${slot.title.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  }

  async function onNoIndexChange(next: boolean, onChange: (v: boolean) => void) {
    if (next) {
      const ok = await confirm({
        title: "Hide this page from search engines?",
        description:
          "The page gets a noindex tag and is removed from the sitemap. Shoppers can still open it from links, but it will drop out of Google results. Takes effect when you save.",
        confirmLabel: "Hide from search",
        tone: "warning",
      });
      if (!ok) return;
    }
    onChange(next);
  }

  function moveSection(index: number, delta: -1 | 1) {
    const rows = [...form.getValues("showcase.sections")];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    form.setValue("showcase.sections", rows, { shouldDirty: true });
  }

  if (loadError) {
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {loadError}
      </p>
    );
  }
  if (!payload || !form.getValues("showcase")) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted/60" />;
  }

  const slots = mediaSlots(kind, apiBase);
  const name = (kind === "store" ? payload.shop_name : payload.name) ?? payload.slug;
  const logo = kind === "store" ? payload.logo : payload.image;
  const publicPath = `/${kind === "store" ? "stores" : "brands"}/${payload.slug}`;
  const values = form.watch();
  const accent = values.accent_color;
  const lowContrast = isHexColor(accent) && contrastRatio(accent, "#FFFFFF") < 3;
  const { isSubmitting, isDirty } = form.formState;

  const slotField = (slot: MediaSlot, extra?: { previewClassName?: string; imgClassName?: string; prefix?: string }) => (
    <ShowcaseImageField
      title={slot.title}
      description={imageUploadHint(slot.preset, SHOWCASE_IMAGE_MB[slot.limit], { prefix: extra?.prefix })}
      previewUrl={(slot.key === "logo" ? logo : slot.key === "banner" ? payload.banner : payload.og_image)?.path}
      previewClassName={extra?.previewClassName}
      imgClassName={extra?.imgClassName}
      busy={busy?.slot === slot.key ? busy.action : null}
      disabled={isSubmitting || (busy !== null && busy.slot !== slot.key)}
      onFile={(file) => void uploadMedia(slot, file)}
      onRemove={slot.removable ? () => void removeMedia(slot) : undefined}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
        <div className="min-w-0 space-y-5">
          <div role="tablist" aria-label="Page design sections" className="flex flex-wrap gap-1.5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-sm">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium",
                  tab === t.id ? "bg-brand-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "branding" ? (
            <FormSection step="01" title="Branding" description="Logo, banner, tagline and accent colour. Images save immediately.">
              <div className="grid gap-4 xl:grid-cols-2">
                {slotField(slots.logo, { previewClassName: "size-20" })}
                {slotField(slots.banner, { previewClassName: "h-20 w-40", imgClassName: "object-cover" })}
              </div>
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Tagline</FormLabel>
                      <CharCounter value={field.value} ideal={100} max={160} />
                    </div>
                    <FormControl>
                      <Input placeholder={kind === "store" ? "Genuine cameras & lenses, delivered fast" : "Imaging since 1937"} {...field} />
                    </FormControl>
                    <FormDescription>One line under the name in the page header and on directory cards.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent colour</FormLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        aria-label="Pick accent colour"
                        value={isHexColor(field.value) ? field.value : "#00B207"}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1"
                      />
                      <FormControl>
                        <Input className="w-32 font-mono uppercase" placeholder="#00B207" maxLength={7} {...field} />
                      </FormControl>
                      <div className="flex flex-wrap gap-1.5">
                        {ACCENT_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            title={hex}
                            aria-label={`Use ${hex}`}
                            onClick={() => form.setValue("accent_color", hex, { shouldDirty: true, shouldValidate: true })}
                            className={cn(
                              "size-7 rounded-full border-2",
                              field.value.toUpperCase() === hex ? "border-foreground" : "border-transparent",
                            )}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      {field.value ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("accent_color", "", { shouldDirty: true })}>
                          Use site default
                        </Button>
                      ) : null}
                    </div>
                    <FormDescription>Buttons, badges, prices and highlights on your page. Blank uses the site green.</FormDescription>
                    {lowContrast ? (
                      <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        This colour is very light — prices and links may be hard to read on a white background. Pick a
                        darker shade for accessibility (contrast {contrastRatio(accent, "#FFFFFF").toFixed(1)}:1, aim for 3:1+).
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
          ) : null}

          {tab === "layout" ? (
            <FormSection step="02" title="Layout" description="Header style and the order of page sections.">
              <FormField
                control={form.control}
                name="showcase.hero_style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header style</FormLabel>
                    <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                      {SHOWCASE_HERO_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          role="radio"
                          aria-checked={field.value === style}
                          onClick={() => field.onChange(style)}
                          className={cn(
                            "rounded-xl border p-3 text-left",
                            field.value === style ? "border-brand-primary bg-brand-tint/40 ring-1 ring-brand-primary" : "border-border hover:border-brand-primary/50",
                          )}
                        >
                          <span className="block text-sm font-semibold">{HERO_STYLE_META[style].label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{HERO_STYLE_META[style].hint}</span>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <p className="text-sm font-medium">Sections</p>
                <p className="text-xs text-muted-foreground">
                  Use the arrows to reorder and the switch to show or hide. Empty sections (e.g. no About text) are skipped automatically.
                </p>
                <ol className="mt-3 space-y-2">
                  {values.showcase.sections.map((row, index) => {
                    const meta = SHOWCASE_SECTION_META[row.key];
                    return (
                      <li
                        key={row.key}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3",
                          row.enabled ? "border-border bg-card" : "border-dashed border-border bg-muted/30 opacity-75",
                        )}
                      >
                        <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{meta.hint}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Move ${meta.label} up`} disabled={index === 0} onClick={() => moveSection(index, -1)}>
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Move ${meta.label} down`}
                            disabled={index === values.showcase.sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          {meta.locked ? (
                            <span title="Always shown" className="flex size-9 items-center justify-center text-muted-foreground">
                              <Lock className="size-4" />
                            </span>
                          ) : (
                            <Switch
                              checked={row.enabled}
                              aria-label={`Show ${meta.label}`}
                              onCheckedChange={(next) =>
                                form.setValue(`showcase.sections.${index}.enabled`, next, { shouldDirty: true })
                              }
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </FormSection>
          ) : null}

          {tab === "about" ? (
            <FormSection step="03" title="About & contact" description="Your story, how to reach you, and social profiles.">
              <FormField
                control={form.control}
                name="showcase.about"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>About</FormLabel>
                      <CharCounter value={field.value} ideal={1500} max={5000} />
                    </div>
                    <FormControl>
                      <Textarea rows={6} placeholder="Who you are, what you sell, why shoppers can trust you…" {...field} />
                    </FormControl>
                    <FormDescription>Plain text. Leave a blank line between paragraphs.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["showcase.contact.phone", "Phone", "+880 1XXX-XXXXXX"],
                    ["showcase.contact.email", "Email", "support@example.com"],
                    ["showcase.contact.address", "Address", "House 12, Road 5, Dhanmondi, Dhaka"],
                    ["showcase.contact.hours", "Opening hours", "Sat–Thu, 10am–8pm"],
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
              </div>
              <div>
                <p className="text-sm font-medium">Social links</p>
                <p className="text-xs text-muted-foreground">Full https:// links. Each must point at that network.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {SOCIAL_KEYS.map((key) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`showcase.social.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{SOCIAL_META[key].label}</FormLabel>
                          <FormControl>
                            <Input type="url" inputMode="url" placeholder={SOCIAL_META[key].placeholder} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </FormSection>
          ) : null}

          {tab === "policies" ? (
            <FormSection step="04" title="Policies" description="Shown in the Policies section. Plain text, blank line between paragraphs.">
              {(
                [
                  ["showcase.policies.shipping", "Shipping", "Delivery areas, times and charges…"],
                  ["showcase.policies.returns", "Returns & refunds", "Return window, condition, how refunds are paid…"],
                ] as const
              ).map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{label}</FormLabel>
                        <CharCounter value={field.value} ideal={1500} max={3000} />
                      </div>
                      <FormControl>
                        <Textarea rows={6} placeholder={placeholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </FormSection>
          ) : null}

          {tab === "announcement" ? (
            <FormSection step="05" title="Announcement bar" description="A short message across the top of your page — sales, holidays, delivery notices.">
              <FormField
                control={form.control}
                name="showcase.announcement.enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
                    <div>
                      <FormLabel>Show announcement bar</FormLabel>
                      <FormDescription>Turn off to hide it without losing the text.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Show announcement bar" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showcase.announcement.text"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Message</FormLabel>
                      <CharCounter value={field.value} ideal={90} max={160} />
                    </div>
                    <FormControl>
                      <Input placeholder="Eid sale — 15% off all lenses until Friday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <FormField
                  control={form.control}
                  name="showcase.announcement.link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="/shop?brand=canon or https://…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showcase.announcement.tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colour</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ANNOUNCEMENT_TONES.map((tone) => (
                            <SelectItem key={tone} value={tone}>
                              {tone === "brand" ? "Accent colour" : tone.charAt(0).toUpperCase() + tone.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
          ) : null}

          {tab === "seo" ? (
            <FormSection step="06" title="SEO" description="How this page appears in Google and link previews. Blank fields use the name, tagline and description.">
              <FormField
                control={form.control}
                name="seo_title"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>SEO title</FormLabel>
                      <CharCounter value={field.value} {...SEO_LIMITS.title} />
                    </div>
                    <FormControl>
                      <Input placeholder={name} {...field} />
                    </FormControl>
                    <FormDescription>The site title template is added after it.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seo_description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Meta description</FormLabel>
                      <CharCounter value={field.value} {...SEO_LIMITS.description} />
                    </div>
                    <FormControl>
                      <Textarea rows={3} placeholder={values.tagline || "A short summary for search results"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seo_keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input placeholder="cameras, lenses, dhaka" {...field} />
                    </FormControl>
                    <FormDescription>Optional, comma-separated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {slotField(slots.og, {
                previewClassName: "h-20 w-36",
                imgClassName: "object-cover",
                prefix: "Optional. Falls back to the logo, then the banner",
              })}
              <FormField
                control={form.control}
                name="noindex"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-4">
                    <div className="space-y-1">
                      <FormLabel>Hide this page from search engines</FormLabel>
                      <FormDescription>Adds noindex and removes it from the sitemap.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(next) => void onNoIndexChange(next, field.onChange)}
                        aria-label="Hide from search engines"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </FormSection>
          ) : null}

          <StickyFormActions
            message={
              <FormStatusMessage
                error={error}
                success={success}
                idle={isDirty ? "Unsaved changes on this page design." : "Images save right away; text and layout need Save."}
              />
            }
          >
            <Button asChild type="button" variant="outline">
              <a href={`${STOREFRONT_URL}${publicPath}`} target="_blank" rel="noreferrer">
                View live <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset(toShowcaseFormValues(payload))}>
              Discard
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save page"}
            </Button>
          </StickyFormActions>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ShowcasePreview
            name={name}
            kicker={kind === "store" ? "Store" : "Brand"}
            values={values}
            logo={logo}
            banner={payload.banner}
          />
          {tab === "seo" ? (
            <>
              <SearchPreview
                title={values.seo_title || name}
                description={values.seo_description || values.tagline}
                path={publicPath}
                siteName={name}
                noIndex={values.noindex}
              />
              <SharePreview
                title={values.seo_title || name}
                description={values.seo_description || values.tagline}
                imageUrl={payload.og_image?.path ?? logo?.path ?? payload.banner?.path}
              />
            </>
          ) : null}
        </aside>
      </form>
    </Form>
  );
}

const SHOWCASE_IMAGE_MB: Record<ShowcaseImageSlot, number> = {
  og: 1,
  storeLogo: 5,
  storeBanner: 5,
  brandLogo: 1,
  brandBanner: 5,
};
