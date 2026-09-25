import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Upload } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import {
  heroToFormValues,
  homeHeroFormSchema,
  validateHomeHeroImageFile,
  type HomeHeroApiResponse,
  type HomeHeroDto,
  type HomeHeroFormValues,
  type HomeHeroImageSlot,
} from "@/lib/validators/homeHero";
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
import { cn } from "@/lib/utils";
import { WhereItShows } from "@/components/settings/home/HomeEditorChrome";
import { resolveHomeImagePreview } from "@/components/settings/home/HomeImageField";

type Props = {
  token: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

/** Built-in storefront art (also mirrored under dashboard /public). */
const DEFAULT_HERO_IMAGES: Record<HomeHeroImageSlot, string> = {
  main_product: "/images/camera.png",
  main_bg: "/images/hero_bg_06 1.png",
  side_product: "/images/img_57 1.png",
  side_bg: "/images/hero_bg_06 1.png",
};

const SLOT_LABEL: Record<HomeHeroImageSlot, string> = {
  main_product: "Main product image",
  main_bg: "Main background image",
  side_product: "Side product image",
  side_bg: "Side background image",
};

function uploadedPath(
  hero: HomeHeroDto | null,
  slot: HomeHeroImageSlot,
): string | null {
  if (!hero) return null;
  switch (slot) {
    case "main_product":
      return hero.main.product_image?.path ?? null;
    case "main_bg":
      return hero.main.bg_image?.path ?? null;
    case "side_product":
      return hero.side.product_image?.path ?? null;
    case "side_bg":
      return hero.side.bg_image?.path ?? null;
  }
}

/** Image the storefront actually shows right now (upload or built-in). */
function displayImage(
  hero: HomeHeroDto | null,
  slot: HomeHeroImageSlot,
): { src: string; isCustom: boolean } {
  const custom = uploadedPath(hero, slot);
  if (custom) return { src: resolveHomeImagePreview(custom), isCustom: true };
  return {
    src: resolveHomeImagePreview(DEFAULT_HERO_IMAGES[slot]),
    isCustom: false,
  };
}

function PercentField({
  field,
  placeholder,
}: {
  field: {
    value: number | null;
    onChange: (v: number | null) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
  placeholder: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      max={100}
      placeholder={placeholder}
      value={field.value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        const n = Number(raw);
        field.onChange(raw === "" || Number.isNaN(n) ? null : n);
      }}
      onBlur={field.onBlur}
      name={field.name}
      ref={field.ref}
    />
  );
}

function HeroImageSlot({
  slot,
  hero,
  uploading,
  disabled,
  onPick,
  inputRef,
  onFile,
  tall,
}: {
  slot: HomeHeroImageSlot;
  hero: HomeHeroDto | null;
  uploading: boolean;
  disabled: boolean;
  onPick: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
  onFile: (file: File | null) => void;
  tall?: boolean;
}) {
  const { src, isCustom } = displayImage(hero, slot);
  const label = SLOT_LABEL[slot];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-muted/40",
          tall ? "aspect-16/10" : "aspect-square",
        )}
      >
        <img
          key={src}
          src={src}
          alt={`${label} — currently on storefront`}
          className={cn(
            "size-full",
            slot.endsWith("_bg") ? "object-cover opacity-80" : "object-contain p-3",
          )}
        />
        <span
          className={cn(
            "absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
            isCustom
              ? "bg-brand-primary text-white"
              : "bg-background/90 text-muted-foreground ring-1 ring-border",
          )}
        >
          {isCustom ? "Custom" : "Default · in use"}
        </span>
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-medium">
            Uploading…
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground">
            {isCustom
              ? "Custom upload is live on the storefront. Replace anytime."
              : "Showing the built-in image shoppers see now. Upload to replace it."}
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server
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
          className="w-full"
          disabled={disabled || uploading}
          onClick={onPick}
        >
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              {isCustom ? (
                <Upload className="size-3.5" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              {isCustom ? "Change image" : "Replace default"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function LiveHeroPreview({
  values,
  hero,
}: {
  values: HomeHeroFormValues;
  hero: HomeHeroDto | null;
}) {
  const mainBg = displayImage(hero, "main_bg").src;
  const mainProduct = displayImage(hero, "main_product").src;
  const sideBg = displayImage(hero, "side_bg").src;
  const sideProduct = displayImage(hero, "side_product").src;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold">Live preview</p>
          <p className="text-[11px] text-muted-foreground">
            What shoppers see now — text updates as you type; images update after
            upload.
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-12">
        <div className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-lg border border-border bg-background p-4 lg:col-span-8 sm:min-h-52 sm:flex-row sm:items-center sm:gap-4">
          <img
            src={mainBg}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div className="relative z-10 max-w-70 space-y-1.5">
            <p className="text-[11px] font-medium text-brand-primary">
              {values.main_eyebrow || "Eyebrow"}
            </p>
            <p className="text-sm font-extrabold uppercase leading-snug tracking-tight sm:text-base">
              {values.main_headline || "Headline"}
            </p>
            {values.main_subtext ? (
              <p className="text-[11px] text-muted-foreground">
                {values.main_subtext}
              </p>
            ) : null}
            <div className="flex items-baseline gap-3 pt-1 text-brand-primary">
              {values.main_discount_percent != null ? (
                <span className="text-2xl font-black leading-none">
                  {values.main_discount_percent}
                  <span className="text-sm">%</span>
                </span>
              ) : null}
              {values.main_price_label ? (
                <span className="text-sm font-bold">{values.main_price_label}</span>
              ) : null}
            </div>
            <span className="mt-2 inline-flex rounded-full bg-foreground px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-background">
              {values.main_cta_label || "CTA"}
            </span>
          </div>
          <div className="relative z-10 mx-auto mt-3 h-28 w-36 shrink-0 sm:mt-0 sm:h-36 sm:w-44">
            <img
              src={mainProduct}
              alt="Main product"
              className="size-full object-contain"
            />
          </div>
        </div>

        <div className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-lg border border-border bg-background p-4 lg:col-span-4">
          <img
            src={sideBg}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover opacity-35"
          />
          {values.side_offer_percent != null ? (
            <div className="absolute right-3 top-10 z-20 flex size-12 flex-col items-center justify-center rounded-full bg-brand-primary text-center text-white shadow">
              <span className="text-xs font-black leading-none">
                {values.side_offer_percent}%
              </span>
              {values.side_offer_label ? (
                <span className="text-[9px] font-semibold leading-tight">
                  {values.side_offer_label}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="relative z-10 space-y-1.5 pr-10">
            {values.side_badge_label ? (
              <span className="inline-block rounded bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white">
                {values.side_badge_label}
              </span>
            ) : null}
            <p className="text-sm font-bold uppercase leading-snug">
              {values.side_headline || "Side headline"}
            </p>
            {values.side_discount_percent != null ? (
              <p className="text-xl font-black text-brand-primary">
                {values.side_discount_percent}%
              </p>
            ) : null}
            <span className="inline-flex rounded-full border-2 border-brand-primary px-2.5 py-1 text-[10px] font-bold uppercase text-brand-primary">
              {values.side_cta_label || "CTA"}
            </span>
          </div>
          <div className="relative z-10 mx-auto mt-2 h-24 w-28">
            <img
              src={sideProduct}
              alt="Side product"
              className="size-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroBannerSettingsPanel({
  token,
  onError,
  onSuccess,
}: Props) {
  const [hero, setHero] = useState<HomeHeroDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<HomeHeroImageSlot | null>(
    null,
  );
  const fileRefs = useRef<Record<HomeHeroImageSlot, HTMLInputElement | null>>({
    main_product: null,
    main_bg: null,
    side_product: null,
    side_bg: null,
  });

  const form = useForm<HomeHeroFormValues>({
    resolver: zodResolver(homeHeroFormSchema),
    defaultValues: {
      main_eyebrow: "",
      main_headline: "",
      main_subtext: "",
      main_discount_percent: null,
      main_price_label: "",
      main_cta_label: "SHOP NOW",
      main_cta_href: "/shop",
      side_badge_label: "",
      side_offer_percent: null,
      side_offer_label: "",
      side_headline: "",
      side_discount_percent: null,
      side_cta_label: "SHOP NOW",
      side_cta_href: "/shop",
    },
  });

  const watched = useWatch({ control: form.control });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<HomeHeroApiResponse>(
          "/api/dashboard/home-hero",
          { token },
        );
        if (cancelled) return;
        setHero(data.hero);
        form.reset(heroToFormValues(data.hero));
      } catch (err) {
        if (!cancelled) {
          onError(
            err instanceof ApiError
              ? err.message
              : "Failed to load home hero",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, form, onError]);

  async function onSubmit(values: HomeHeroFormValues) {
    try {
      const data = await apiFetch<HomeHeroApiResponse>(
        "/api/dashboard/home-hero",
        {
          method: "PATCH",
          token,
          body: {
            main_eyebrow: values.main_eyebrow,
            main_headline: values.main_headline,
            main_subtext: values.main_subtext || null,
            main_discount_percent: values.main_discount_percent,
            main_price_label: values.main_price_label || null,
            main_cta_label: values.main_cta_label,
            main_cta_href: values.main_cta_href,
            side_badge_label: values.side_badge_label || null,
            side_offer_percent: values.side_offer_percent,
            side_offer_label: values.side_offer_label || null,
            side_headline: values.side_headline,
            side_discount_percent: values.side_discount_percent,
            side_cta_label: values.side_cta_label,
            side_cta_href: values.side_cta_href,
          },
        },
      );
      setHero(data.hero);
      form.reset(heroToFormValues(data.hero));
      onSuccess(data.message ?? "Home hero saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function onImageFile(slot: HomeHeroImageSlot, file: File | null) {
    if (!file) return;
    const checked = validateHomeHeroImageFile(file);
    if (!checked.ok) {
      onError(checked.message);
      const input = fileRefs.current[slot];
      if (input) input.value = "";
      return;
    }
    setUploadingSlot(slot);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiUpload<HomeHeroApiResponse>(
        `/api/dashboard/home-hero/images/${slot}`,
        fd,
        { token },
      );
      setHero(data.hero);
      onSuccess(data.message ?? "Image updated — now live on the storefront");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploadingSlot(null);
      const input = fileRefs.current[slot];
      if (input) input.value = "";
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading hero banner…</p>
    );
  }

  const previewValues = (watched ?? form.getValues()) as HomeHeroFormValues;

  return (
    <div className="space-y-6">
      <WhereItShows
        type="Hero"
        where="Top of the home page — large main banner + side promo"
        description="Main: eyebrow, headline, discount, price, CTA, product & background. Side: badge, offer, headline, CTA, images."
      />
      <LiveHeroPreview values={previewValues} hero={hero} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-6"
          noValidate
        >
          {/* ── Main banner ─────────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold">Main banner</h3>
              <p className="text-xs text-muted-foreground">
                Large left block on the home page. Edit copy, then replace the
                images shoppers currently see.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <HeroImageSlot
                slot="main_product"
                hero={hero}
                uploading={uploadingSlot === "main_product"}
                disabled={!!uploadingSlot}
                onPick={() => fileRefs.current.main_product?.click()}
                inputRef={(el) => {
                  fileRefs.current.main_product = el;
                }}
                onFile={(f) => void onImageFile("main_product", f)}
              />
              <HeroImageSlot
                slot="main_bg"
                hero={hero}
                uploading={uploadingSlot === "main_bg"}
                disabled={!!uploadingSlot}
                onPick={() => fileRefs.current.main_bg?.click()}
                inputRef={(el) => {
                  fileRefs.current.main_bg = el;
                }}
                onFile={(f) => void onImageFile("main_bg", f)}
                tall
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="main_eyebrow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eyebrow</FormLabel>
                    <FormControl>
                      <Input placeholder="Widescreen 4k ......." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="main_price_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price label</FormLabel>
                    <FormControl>
                      <Input placeholder="$ 180.99" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="main_headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DIGITAL SLR CAMERA HIGH DEFINITION"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="main_subtext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtext</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sumptuous, filling, and temptingly"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="main_discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <PercentField field={field} placeholder="70" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="main_cta_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA label</FormLabel>
                    <FormControl>
                      <Input placeholder="SHOP NOW" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="main_cta_href"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA link</FormLabel>
                    <FormControl>
                      <Input placeholder="/shop" {...field} />
                    </FormControl>
                    <FormDescription>Path or full URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* ── Side promo ──────────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold">Side promo</h3>
              <p className="text-xs text-muted-foreground">
                Narrow right card. Images below are what the storefront shows
                today — replace defaults when you are ready.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <HeroImageSlot
                slot="side_product"
                hero={hero}
                uploading={uploadingSlot === "side_product"}
                disabled={!!uploadingSlot}
                onPick={() => fileRefs.current.side_product?.click()}
                inputRef={(el) => {
                  fileRefs.current.side_product = el;
                }}
                onFile={(f) => void onImageFile("side_product", f)}
              />
              <HeroImageSlot
                slot="side_bg"
                hero={hero}
                uploading={uploadingSlot === "side_bg"}
                disabled={!!uploadingSlot}
                onPick={() => fileRefs.current.side_bg?.click()}
                inputRef={(el) => {
                  fileRefs.current.side_bg = el;
                }}
                onFile={(f) => void onImageFile("side_bg", f)}
                tall
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="side_badge_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge</FormLabel>
                    <FormControl>
                      <Input placeholder="New" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="side_headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CLOUD CAM, SECURITY CAMERA"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="side_offer_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer %</FormLabel>
                    <FormControl>
                      <PercentField field={field} placeholder="25" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="side_offer_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer label</FormLabel>
                    <FormControl>
                      <Input placeholder="offer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="side_discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <PercentField field={field} placeholder="70" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="side_cta_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA label</FormLabel>
                    <FormControl>
                      <Input placeholder="SHOP NOW" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="side_cta_href"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA link</FormLabel>
                  <FormControl>
                    <Input placeholder="/shop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Spacer so sticky bar doesn't cover the last fields */}
          <div className="h-16" aria-hidden />

          <div className="sticky bottom-3 z-20 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-muted-foreground">
                {form.formState.isDirty
                  ? "You have unsaved text changes."
                  : "Text edits need Save. Image uploads apply immediately."}
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? "Saving…" : "Save hero content"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
