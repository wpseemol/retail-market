import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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

type Props = {
  token: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const SLOT_META: Record<
  HomeHeroImageSlot,
  { title: string; fallbackHint: string }
> = {
  main_product: {
    title: "Main product image",
    fallbackHint: "Default: /images/camera.png",
  },
  main_bg: {
    title: "Main background",
    fallbackHint: "Default: hero background art",
  },
  side_product: {
    title: "Side product image",
    fallbackHint: "Default: /images/img_57 1.png",
  },
  side_bg: {
    title: "Side background",
    fallbackHint: "Default: hero background art",
  },
};

function slotPreview(hero: HomeHeroDto | null, slot: HomeHeroImageSlot) {
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
      onSuccess(data.message ?? "Image updated");
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

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Customize the storefront home hero (main + side promo). Text is
        rendered server-side for SEO; images fall back to built-in art until
        you upload replacements.
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Main banner</h3>
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
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="70"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = Number(raw);
                          field.onChange(
                            raw === "" || Number.isNaN(n) ? null : n,
                          );
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
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
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Side promo</h3>
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
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="25"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = Number(raw);
                          field.onChange(
                            raw === "" || Number.isNaN(n) ? null : n,
                          );
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
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
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="70"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = Number(raw);
                          field.onChange(
                            raw === "" || Number.isNaN(n) ? null : n,
                          );
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
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
          </div>

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Saving…" : "Save hero content"}
          </Button>
        </form>
      </Form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Hero images</h3>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              "main_product",
              "main_bg",
              "side_product",
              "side_bg",
            ] as HomeHeroImageSlot[]
          ).map((slot) => {
            const preview = slotPreview(hero, slot);
            const meta = SLOT_META[slot];
            const uploading = uploadingSlot === slot;
            return (
              <div
                key={slot}
                className="overflow-hidden rounded-xl border border-dashed border-border bg-linear-to-br from-muted/40 via-background to-brand-tint/20"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div
                    className={cn(
                      "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm",
                      slot.endsWith("_bg") && "size-24",
                    )}
                  >
                    {preview ? (
                      <img
                        key={preview}
                        src={preview}
                        alt={`${meta.title} preview`}
                        className="size-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImagePlus className="size-6" />
                        <span className="px-1 text-center text-[9px] font-medium uppercase tracking-wide">
                          Default
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">{meta.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {preview ? "Custom upload" : meta.fallbackHint}
                      </p>
                    </div>
                    <input
                      ref={(el) => {
                        fileRefs.current[slot] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) =>
                        void onImageFile(slot, e.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading || !!uploadingSlot}
                      onClick={() => fileRefs.current[slot]?.click()}
                    >
                      <Upload className="size-3.5" />
                      {uploading
                        ? "Uploading…"
                        : preview
                          ? "Replace image"
                          : "Upload image"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
