import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LayoutGrid,
  Megaphone,
  Images,
  Wrench,
  Award,
  ShoppingBag,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  HOME_COMPONENT_META,
  bestSellersFormSchema,
  dealsBannerFormSchema,
  dealsOfDayFormSchema,
  featuredFormSchema,
  laptopRepairFormSchema,
  latestProductsFormSchema,
  productGroupsFormSchema,
  promoSliderFormSchema,
  topBrandsFormSchema,
  type BestSellersFormValues,
  type DealsBannerFormValues,
  type DealsOfDayFormValues,
  type FeaturedFormValues,
  type HomeEditableKey,
  type LaptopRepairFormValues,
  type LatestProductsFormValues,
  type ProductGroupsFormValues,
  type PromoSliderFormValues,
  type TopBrandsFormValues,
} from "@/lib/validators/homeBlocks";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EditorCard,
  StickyEditorActions,
  WhereItShows,
} from "@/components/settings/home/HomeEditorChrome";
import { HomeImageField } from "@/components/settings/home/HomeImageField";

type Props = {
  token: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

type BlockResponse = {
  key: string;
  content: Record<string, unknown>;
  message?: string;
};

const ICONS: Record<HomeEditableKey, typeof LayoutGrid> = {
  featured: Sparkles,
  deals_banner: Megaphone,
  product_groups: Layers,
  promo_slider: Images,
  best_sellers: ShoppingBag,
  latest_products: Clock,
  deals_of_day: Award,
  laptop_repair: Wrench,
  top_brands: LayoutGrid,
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
  { value: "name-asc", label: "Name A–Z" },
] as const;

async function loadBlock(token: string, key: string) {
  return apiFetch<BlockResponse>(`/api/dashboard/home-blocks/${key}`, {
    token,
  });
}

async function saveBlock(
  token: string,
  key: string,
  content: Record<string, unknown>,
) {
  return apiFetch<BlockResponse>(`/api/dashboard/home-blocks/${key}`, {
    method: "PATCH",
    token,
    body: { content },
  });
}

async function resetBlock(token: string, key: string) {
  return apiFetch<BlockResponse>(`/api/dashboard/home-blocks/${key}/reset`, {
    method: "POST",
    token,
  });
}

function useBlockFormLifecycle(
  token: string,
  key: HomeEditableKey,
  onError: Props["onError"],
  onSuccess: Props["onSuccess"],
  resetForm: (content: Record<string, unknown>) => void,
) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadBlock(token, key);
        if (!cancelled) resetForm(data.content ?? {});
      } catch (err) {
        if (!cancelled) {
          onError(
            err instanceof ApiError ? err.message : `Failed to load ${key}`,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, key, onError, resetForm]);

  const persist = useCallback(
    async (content: Record<string, unknown>) => {
      try {
        const data = await saveBlock(token, key, content);
        resetForm(data.content ?? content);
        onSuccess(data.message ?? "Section saved");
      } catch (err) {
        onError(err instanceof ApiError ? err.message : "Save failed");
      }
    },
    [token, key, onError, onSuccess, resetForm],
  );

  const reset = useCallback(async () => {
    try {
      const data = await resetBlock(token, key);
      resetForm(data.content ?? {});
      onSuccess(data.message ?? "Reset to defaults");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reset failed");
    }
  }, [token, key, onError, onSuccess, resetForm]);

  return { loading, persist, reset };
}

/* ── Featured ─────────────────────────────────────────────────────────── */

function FeaturedEditor(props: Props) {
  const form = useForm<FeaturedFormValues>({
    resolver: zodResolver(featuredFormSchema),
    defaultValues: { items: [] },
  });
  const { fields } = useFieldArray({ control: form.control, name: "items" });
  const resetForm = useCallback(
    (c: Record<string, unknown>) => {
      form.reset({
        items: Array.isArray(c.items) ? (c.items as FeaturedFormValues["items"]) : [],
      });
    },
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "featured",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "featured")!;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void persist(v))}
          className="space-y-4"
          noValidate
        >
          {fields.map((field, index) => (
            <EditorCard
              key={field.id}
              title={`USP tile ${index + 1}`}
              hint="Shown left → right on desktop in this order."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.title`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormDescription>Bold line under the icon.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.alt`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Icon alt text</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name={`items.${index}.description`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...f} />
                    </FormControl>
                    <FormDescription>Supporting sentence under the title.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`items.${index}.icon`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormControl>
                      <HomeImageField
                        label="Icon image"
                        description="Small icon for this USP tile."
                        value={f.value}
                        blockKey="featured"
                        fieldPath={`items.${index}.icon`}
                        token={props.token}
                        disabled={form.formState.isSubmitting}
                        onUploaded={(path) =>
                          form.setValue(`items.${index}.icon`, path, {
                            shouldDirty: false,
                            shouldValidate: true,
                          })
                        }
                        onError={props.onError}
                        onSuccess={props.onSuccess}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </EditorCard>
          ))}
          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={() => void reset()}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Deals banner ─────────────────────────────────────────────────────── */

function DealsBannerEditor(props: Props) {
  const form = useForm<DealsBannerFormValues>({
    resolver: zodResolver(dealsBannerFormSchema),
    defaultValues: { cards: [] },
  });
  const { fields } = useFieldArray({ control: form.control, name: "cards" });
  const resetForm = useCallback(
    (c: Record<string, unknown>) => {
      form.reset({
        cards: Array.isArray(c.cards)
          ? (c.cards as DealsBannerFormValues["cards"])
          : [],
      });
    },
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "deals_banner",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "deals_banner")!;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void persist(v))}
          className="space-y-4"
          noValidate
        >
          {fields.map((field, index) => (
            <EditorCard
              key={field.id}
              title={`Deal card ${index + 1}`}
              hint="Image on the left · copy + % + CTA on the right."
            >
              <div className="mb-3">
                <FormField
                  control={form.control}
                  name={`cards.${index}.image`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <HomeImageField
                          label="Product image"
                          description={`Deal card ${index + 1} product art.`}
                          value={f.value}
                          blockKey="deals_banner"
                          fieldPath={`cards.${index}.image`}
                          token={props.token}
                          disabled={form.formState.isSubmitting}
                          onUploaded={(path) =>
                            form.setValue(`cards.${index}.image`, path, {
                              shouldDirty: false,
                              shouldValidate: true,
                            })
                          }
                          onError={props.onError}
                          onSuccess={props.onSuccess}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`cards.${index}.title_top`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Title line 1</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`cards.${index}.title_bottom`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Title line 2</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`cards.${index}.discount_percent`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={f.value}
                          onChange={(e) => f.onChange(Number(e.target.value) || 0)}
                          onBlur={f.onBlur}
                          name={f.name}
                          ref={f.ref}
                        />
                      </FormControl>
                      <FormDescription>Big green “Up to X%” number.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`cards.${index}.cta_label`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>CTA label</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`cards.${index}.href`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Shop link</FormLabel>
                      <FormControl>
                        <Input placeholder="/shop?category=…" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`cards.${index}.alt`}
                  render={({ field: f }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Image alt</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </EditorCard>
          ))}
          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={() => void reset()}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Laptop repair ────────────────────────────────────────────────────── */

function LaptopRepairEditor(props: Props) {
  const form = useForm<LaptopRepairFormValues>({
    resolver: zodResolver(laptopRepairFormSchema),
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) => {
      form.reset(c as unknown as LaptopRepairFormValues);
    },
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "laptop_repair",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "laptop_repair")!;
  const values = form.watch();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <div className="relative overflow-hidden rounded-xl border border-border bg-[#111315] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
          Banner preview
        </p>
        <span className="mt-2 inline-block rounded bg-brand-primary px-2 py-0.5 text-[10px] font-bold">
          {values.badge_label || "Badge"}
        </span>
        <p className="mt-2 text-lg font-bold uppercase leading-tight">
          {values.headline_line1}
          <br />
          {values.headline_line2}
        </p>
        <p className="mt-1 text-xs text-white/60">{values.subtext}</p>
        <p className="mt-3 text-sm font-black text-brand-primary">
          {values.offer_percent}% {values.offer_label}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void persist(v))}
          className="space-y-4"
          noValidate
        >
          <EditorCard title="Copy" hint="Left side of the dark banner.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["badge_label", "Badge", "Small green pill above the headline"],
                  ["headline_line1", "Headline line 1", "First bold line"],
                  ["headline_line2", "Headline line 2", "Second bold line"],
                  ["subtext", "Subtext", "Muted line under headlines"],
                  ["offer_percent", "Offer %", "Rosette number"],
                  ["offer_label", "Offer label", "Word under the % (e.g. offer)"],
                  ["cta_label", "CTA label", "Link text like MAKE ENQUIRY"],
                  ["cta_href", "CTA link", "Usually /contact?…"],
                ] as const
              ).map(([name, label, hint]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        {name === "offer_percent" ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={field.value as number}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value) || 0)
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        ) : (
                          <Input {...field} value={String(field.value ?? "")} />
                        )}
                      </FormControl>
                      <FormDescription>{hint}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </EditorCard>
          <EditorCard title="Images" hint="Background fills the banner; product sits on the right.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="bg_image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <HomeImageField
                        label="Background image"
                        description="Full-bleed banner background."
                        value={field.value}
                        blockKey="laptop_repair"
                        fieldPath="bg_image"
                        token={props.token}
                        disabled={form.formState.isSubmitting}
                        onUploaded={(path) =>
                          form.setValue("bg_image", path, {
                            shouldDirty: false,
                            shouldValidate: true,
                          })
                        }
                        onError={props.onError}
                        onSuccess={props.onSuccess}
                      />                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="product_image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <HomeImageField
                        label="Product / hardware image"
                        description="Laptop or hardware art on the right."
                        value={field.value}
                        blockKey="laptop_repair"
                        fieldPath="product_image"
                        token={props.token}
                        disabled={form.formState.isSubmitting}
                        onUploaded={(path) =>
                          form.setValue("product_image", path, {
                            shouldDirty: false,
                            shouldValidate: true,
                          })
                        }
                        onError={props.onError}
                        onSuccess={props.onSuccess}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </EditorCard>
          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={() => void reset()}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Top brands ───────────────────────────────────────────────────────── */

function TopBrandsEditor(props: Props) {
  const form = useForm<TopBrandsFormValues>({
    resolver: zodResolver(topBrandsFormSchema),
    defaultValues: { brands: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "brands",
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) => {
      form.reset({
        title: String(c.title ?? "Top Brands"),
        see_all_label: String(c.see_all_label ?? "See All Brands"),
        see_all_href: String(c.see_all_href ?? "/brands"),
        brands: Array.isArray(c.brands)
          ? (c.brands as TopBrandsFormValues["brands"]).map((b) => ({
              name: b.name,
              href: b.href,
              image: b.image ?? null,
            }))
          : [],
      });
    },
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "top_brands",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "top_brands")!;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) =>
            void persist({
              ...v,
              brands: v.brands.map((b) => ({
                ...b,
                image: b.image || null,
              })),
            }),
          )}
          className="space-y-4"
          noValidate
        >
          <EditorCard title="Section header" hint="Angled title on the left · see-all on the right.">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="see_all_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>See-all label</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="see_all_href"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>See-all link</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </EditorCard>
          {fields.map((field, index) => (
            <EditorCard key={field.id} title={`Brand ${index + 1}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`brands.${index}.name`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormDescription>Used for text logo if no image.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`brands.${index}.href`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Shop link</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-3">
                <FormField
                  control={form.control}
                  name={`brands.${index}.image`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <HomeImageField
                          label="Brand logo image"
                          description="Optional logo. Leave empty to show the brand name."
                          value={f.value}
                          blockKey="top_brands"
                          fieldPath={`brands.${index}.image`}
                          token={props.token}
                          allowEmpty
                          disabled={form.formState.isSubmitting}
                          onUploaded={(path) =>
                            form.setValue(`brands.${index}.image`, path, {
                              shouldDirty: false,
                              shouldValidate: true,
                            })
                          }
                          onError={props.onError}
                          onSuccess={props.onSuccess}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => remove(index)}
              >
                Remove brand
              </Button>
            </EditorCard>
          ))}          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({ name: "New brand", href: "/shop", image: null })
            }
          >
            Add brand
          </Button>
          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={() => void reset()}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Promo slider ─────────────────────────────────────────────────────── */

function PromoSliderEditor(props: Props) {
  const form = useForm<PromoSliderFormValues>({
    resolver: zodResolver(promoSliderFormSchema),
    defaultValues: { slides: [], autoplay_ms: 4500, bg_image: "" },
  });
  const { fields } = useFieldArray({ control: form.control, name: "slides" });
  const resetForm = useCallback(
    (c: Record<string, unknown>) => {
      form.reset({
        bg_image: String(c.bg_image ?? ""),
        autoplay_ms: Number(c.autoplay_ms ?? 4500),
        slides: Array.isArray(c.slides)
          ? (c.slides as PromoSliderFormValues["slides"])
          : [],
      });
    },
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "promo_slider",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "promo_slider")!;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void persist(v))}
          className="space-y-4"
          noValidate
        >
          <EditorCard title="Slider chrome" hint="Shared background and autoplay for all slides.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="bg_image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <HomeImageField
                        label="Background image"
                        description="Shared backdrop behind every slide."
                        value={field.value}
                        blockKey="promo_slider"
                        fieldPath="bg_image"
                        token={props.token}
                        disabled={form.formState.isSubmitting}
                        onUploaded={(path) =>
                          form.setValue("bg_image", path, {
                            shouldDirty: false,
                            shouldValidate: true,
                          })
                        }
                        onError={props.onError}
                        onSuccess={props.onSuccess}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoplay_ms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autoplay (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2000}
                        max={20000}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 4500)
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>2000–20000 milliseconds between slides.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </EditorCard>
          {fields.map((field, index) => (
            <EditorCard
              key={field.id}
              title={`Slide ${index + 1}`}
              hint="Price + tagline · highlight · two-line title · CTA · product image."
            >
              <div className="mb-3">
                <FormField
                  control={form.control}
                  name={`slides.${index}.image`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <HomeImageField
                          label="Product image"
                          description={`Slide ${index + 1} product art.`}
                          value={f.value}
                          blockKey="promo_slider"
                          fieldPath={`slides.${index}.image`}
                          token={props.token}
                          disabled={form.formState.isSubmitting}
                          onUploaded={(path) =>
                            form.setValue(`slides.${index}.image`, path, {
                              shouldDirty: false,
                              shouldValidate: true,
                            })
                          }
                          onError={props.onError}
                          onSuccess={props.onSuccess}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["price", "Price label"],
                    ["tagline", "Tagline under price"],
                    ["highlight_text", "Big highlight (e.g. 5K)"],
                    ["sub_highlight", "Sub highlight"],
                    ["category_tag", "Category tag"],
                    ["title_line1", "Title line 1"],
                    ["title_line2", "Title line 2"],
                    ["cta_label", "CTA label"],
                    ["cta_href", "CTA link"],
                    ["image_alt", "Product image alt"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={`slides.${index}.${name}`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </EditorCard>
          ))}          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={() => void reset()}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Simple chrome sections ───────────────────────────────────────────── */

function BestSellersEditor(props: Props) {
  const form = useForm<BestSellersFormValues>({
    resolver: zodResolver(bestSellersFormSchema),
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) =>
      form.reset(c as unknown as BestSellersFormValues),
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "best_sellers",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "best_sellers")!;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <SimpleChromeForm
      meta={meta}
      form={form}
      token={props.token}
      blockKey="best_sellers"
      onError={props.onError}
      onSuccess={props.onSuccess}
      onSubmit={(v) => void persist(v)}
      onReset={() => void reset()}
      fields={[
        { name: "title", label: "Section title", hint: "Heading above the product tabs" },
        { name: "promo_badge", label: "Left promo badge", hint: "Small badge on the promo panel" },
        { name: "promo_headline", label: "Left promo headline", hint: "Main promo text" },
        { name: "promo_discount_percent", label: "Promo discount %", hint: "Large % on promo", number: true },
        { name: "promo_cta_label", label: "Promo CTA", hint: "Button on promo panel" },
        { name: "promo_cta_href", label: "Promo link", hint: "Where the promo CTA goes" },
        {
          name: "promo_image",
          label: "Promo image",
          hint: "Visual on the left panel",
          image: true,
        },
        { name: "product_sort", label: "Product sort", hint: "How the product list is ordered", sort: true },
        { name: "product_limit", label: "Product limit", hint: "How many products to show", number: true },
      ]}
    />
  );
}

function LatestProductsEditor(props: Props) {
  const form = useForm<LatestProductsFormValues>({
    resolver: zodResolver(latestProductsFormSchema),
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) =>
      form.reset(c as unknown as LatestProductsFormValues),
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "latest_products",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "latest_products")!;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <SimpleChromeForm
      meta={meta}
      form={form}
      token={props.token}
      blockKey="latest_products"
      onError={props.onError}
      onSuccess={props.onSuccess}
      onSubmit={(v) => void persist(v)}
      onReset={() => void reset()}
      fields={[
        { name: "title", label: "Grid title", hint: "Main product grid heading" },
        { name: "sidebar_title", label: "Sidebar title", hint: "Latest items column heading" },
        { name: "product_sort", label: "Grid sort", hint: "Sort for the main grid", sort: true },
        { name: "product_limit", label: "Grid product limit", hint: "Cards in the main grid", number: true },
        { name: "sidebar_limit", label: "Sidebar limit", hint: "Items in the latest sidebar", number: true },
      ]}
    />
  );
}

function DealsOfDayEditor(props: Props) {
  const form = useForm<DealsOfDayFormValues>({
    resolver: zodResolver(dealsOfDayFormSchema),
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) =>
      form.reset(c as unknown as DealsOfDayFormValues),
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "deals_of_day",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "deals_of_day")!;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <SimpleChromeForm
      meta={meta}
      form={form}
      token={props.token}
      blockKey="deals_of_day"
      onError={props.onError}
      onSuccess={props.onSuccess}
      onSubmit={(v) => void persist(v)}
      onReset={() => void reset()}
      fields={[
        { name: "title", label: "Section title", hint: "Heading with the green underline" },
        { name: "left_badge", label: "Left badge", hint: "Pill on the left promo" },
        { name: "left_headline", label: "Left headline", hint: "Promo headline" },
        { name: "left_cta_label", label: "Left CTA", hint: "Button label" },
        { name: "left_cta_href", label: "Left link", hint: "CTA destination" },
        {
          name: "left_image",
          label: "Left product image",
          hint: "Foreground product art",
          image: true,
        },
        {
          name: "left_bg",
          label: "Left background image",
          hint: "Promo panel background",
          image: true,
        },
        { name: "product_sort", label: "Carousel sort", hint: "Center/right product source sort", sort: true },
        { name: "product_limit", label: "Product limit", hint: "How many deal products", number: true },
      ]}
    />
  );
}

function ProductGroupsEditor(props: Props) {
  const form = useForm<ProductGroupsFormValues>({
    resolver: zodResolver(productGroupsFormSchema),
  });
  const resetForm = useCallback(
    (c: Record<string, unknown>) =>
      form.reset(c as unknown as ProductGroupsFormValues),
    [form],
  );
  const { loading, persist, reset } = useBlockFormLifecycle(
    props.token,
    "product_groups",
    props.onError,
    props.onSuccess,
    resetForm,
  );
  const meta = HOME_COMPONENT_META.find((m) => m.key === "product_groups")!;
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <SimpleChromeForm
      meta={meta}
      form={form}
      token={props.token}
      blockKey="product_groups"
      onError={props.onError}
      onSuccess={props.onSuccess}
      onSubmit={(v) => void persist(v)}
      onReset={() => void reset()}
      fields={[
        { name: "title", label: "Section title", hint: "Label for the product groups block" },
        { name: "note", label: "Internal note", hint: "Dashboard-only reminder (optional)", area: true },
      ]}
    />
  );
}

function SimpleChromeForm<T extends Record<string, unknown>>({
  meta,
  form,
  token,
  blockKey,
  onError,
  onSuccess,
  onSubmit,
  onReset,
  fields,
}: {
  meta: (typeof HOME_COMPONENT_META)[number];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: ReturnType<typeof useForm<any>>;
  token: string;
  blockKey: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onSubmit: (v: T) => void;
  onReset: () => void;
  fields: Array<{
    name: string;
    label: string;
    hint: string;
    number?: boolean;
    sort?: boolean;
    area?: boolean;
    image?: boolean;
  }>;
}) {
  const textFields = fields.filter((f) => !f.image);
  const imageFields = fields.filter((f) => f.image);

  return (
    <div className="space-y-4">
      <WhereItShows {...meta} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v: T) => onSubmit(v))}
          className="space-y-4"
          noValidate
        >
          {textFields.length > 0 ? (
            <EditorCard
              title="Editable fields"
              hint="Each label maps to a visible storefront element."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {textFields.map((f) => (
                  <FormField
                    key={f.name}
                    control={form.control}
                    name={f.name}
                    render={({ field }) => (
                      <FormItem className={f.area ? "sm:col-span-2" : undefined}>
                        <FormLabel>{f.label}</FormLabel>
                        <FormControl>
                          {f.sort ? (
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                              value={String(field.value ?? "newest")}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            >
                              {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : f.area ? (
                            <Textarea
                              rows={3}
                              {...field}
                              value={String(field.value ?? "")}
                            />
                          ) : f.number ? (
                            <Input
                              type="number"
                              value={field.value as number}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) || 0)
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          ) : (
                            <Input
                              {...field}
                              value={String(field.value ?? "")}
                            />
                          )}
                        </FormControl>
                        <FormDescription>{f.hint}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </EditorCard>
          ) : null}
          {imageFields.length > 0 ? (
            <EditorCard
              title="Images"
              hint="Preview · change with file upload · resized on the server."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {imageFields.map((f) => (
                  <FormField
                    key={f.name}
                    control={form.control}
                    name={f.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <HomeImageField
                            label={f.label}
                            description={f.hint}
                            value={
                              field.value == null
                                ? ""
                                : String(field.value)
                            }
                            blockKey={blockKey}
                            fieldPath={f.name}
                            token={token}
                            disabled={form.formState.isSubmitting}
                            onUploaded={(path) =>
                              form.setValue(f.name, path, {
                                shouldDirty: false,
                                shouldValidate: true,
                              })
                            }
                            onError={onError}
                            onSuccess={onSuccess}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </EditorCard>
          ) : null}
          <StickyEditorActions
            dirty={form.formState.isDirty}
            saving={form.formState.isSubmitting}
            onReset={onReset}
          />
        </form>
      </Form>
    </div>
  );
}

/* ── Hub ──────────────────────────────────────────────────────────────── */

export function HomeComponentsEditor({ token, onError, onSuccess }: Props) {
  const [active, setActive] = useState<HomeEditableKey>("featured");
  const meta = HOME_COMPONENT_META.find((m) => m.key === active)!;
  const Icon = ICONS[active];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Home components"
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {HOME_COMPONENT_META.map((item) => {
            const ItemIcon = ICONS[item.key];
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={cn(
                  "flex min-w-40 shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors lg:min-w-0",
                  selected
                    ? "border-brand-primary bg-brand-tint/50 shadow-sm"
                    : "border-transparent bg-muted/30 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    selected
                      ? "bg-brand-primary text-white"
                      : "bg-background text-brand-primary ring-1 ring-border",
                  )}
                >
                  <ItemIcon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.type}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/15 px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{meta.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {meta.description}
              </p>
            </div>
          </div>

          {active === "featured" ? (
            <FeaturedEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "deals_banner" ? (
            <DealsBannerEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "laptop_repair" ? (
            <LaptopRepairEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "top_brands" ? (
            <TopBrandsEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "promo_slider" ? (
            <PromoSliderEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "best_sellers" ? (
            <BestSellersEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "latest_products" ? (
            <LatestProductsEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "deals_of_day" ? (
            <DealsOfDayEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
          {active === "product_groups" ? (
            <ProductGroupsEditor
              token={token}
              onError={onError}
              onSuccess={onSuccess}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
