import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, apiFetch } from "@/lib/api";
import {
  DEFAULT_WELCOME_MODAL,
  welcomeModalFormSchema,
  welcomeModalToFormValues,
  type WelcomeModalFormValues,
} from "@/lib/validators/welcomeModal";
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

import { WhereItShows } from "@/components/settings/home/HomeEditorChrome";
import {
  HomeImageField,
  resolveHomeImagePreview,
} from "@/components/settings/home/HomeImageField";

type Props = {
  token: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

type BlockResponse = {
  key: string;
  content: Partial<WelcomeModalFormValues>;
  message?: string;
};

export function WelcomeModalSettingsPanel({
  token,
  onError,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);

  const form = useForm<WelcomeModalFormValues>({
    resolver: zodResolver(welcomeModalFormSchema),
    defaultValues: DEFAULT_WELCOME_MODAL,
  });

  const productPreview = form.watch("product_image");
  const bgPreview = form.watch("bg_image");
  const discountPreview = form.watch("discount_percent");
  const eyebrowPreview = form.watch("eyebrow");
  const headlineBefore = form.watch("headline_before");
  const headlineAfter = form.watch("headline_after");
  const badgePreview = form.watch("badge_label");
  const bodyPreview = form.watch("body");
  const ctaPreview = form.watch("cta_label");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BlockResponse>(
          "/api/dashboard/home-blocks/welcome_modal",
          { token },
        );
        if (cancelled) return;
        form.reset(welcomeModalToFormValues(data.content));
      } catch (err) {
        if (!cancelled) {
          onError(
            err instanceof ApiError
              ? err.message
              : "Failed to load welcome modal",
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

  async function onSubmit(values: WelcomeModalFormValues) {
    try {
      const data = await apiFetch<BlockResponse>(
        "/api/dashboard/home-blocks/welcome_modal",
        {
          method: "PATCH",
          token,
          body: { content: values },
        },
      );
      form.reset(welcomeModalToFormValues(data.content));
      onSuccess(data.message ?? "Welcome modal saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function onReset() {
    try {
      const data = await apiFetch<BlockResponse>(
        "/api/dashboard/home-blocks/welcome_modal/reset",
        { method: "POST", token },
      );
      form.reset(welcomeModalToFormValues(data.content));
      onSuccess(data.message ?? "Welcome modal reset to defaults");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reset failed");
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading welcome modal…</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Popup offer on the storefront home page. Content is validated and saved
        to <code className="text-[11px]">home_block_contents</code> (
        <code className="text-[11px]">welcome_modal</code>
        ). Server-rendered for SEO; images use a path or full URL.
      </p>

      <WhereItShows
        type="Popup"
        where="Over the home page on first visit this session"
        description="Badge · countdown · headline with % · CTA · product & background images."
      />

      {/* Live preview */}
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold">Live preview</p>
          <p className="text-[11px] text-muted-foreground">
            Updates as you type — matches the storefront welcome dialog.
          </p>
        </div>
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="relative min-h-44 bg-muted/40">
            {bgPreview ? (
              <img
                src={resolveHomeImagePreview(bgPreview)}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-40"
              />
            ) : null}
            <div className="relative z-10 flex h-full min-h-44 items-center justify-center p-4">
              {productPreview ? (
                <img
                  src={resolveHomeImagePreview(productPreview)}
                  alt="Product"
                  className="max-h-32 w-auto object-contain drop-shadow-md"
                />
              ) : null}
            </div>
            <span className="absolute left-3 top-3 z-20 rounded bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {badgePreview || "Badge"}
            </span>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              {eyebrowPreview || "Eyebrow"}
            </p>
            <p className="text-base font-extrabold leading-snug">
              {headlineBefore || "…"}{" "}
              <span className="text-brand-primary">
                {discountPreview ?? 0}%
              </span>{" "}
              {headlineAfter || "…"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-3">
              {bodyPreview || "Body copy"}
            </p>
            <span className="inline-flex rounded-full bg-brand-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {ctaPreview || "CTA"}
            </span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="badge_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge</FormLabel>
                  <FormControl>
                    <Input placeholder="Limited Offer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eyebrow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eyebrow</FormLabel>
                  <FormControl>
                    <Input placeholder="Don't Miss Out" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="headline_before"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline (before %)</FormLabel>
                  <FormControl>
                    <Input placeholder="Get Up To" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discount_percent"
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
                          raw === "" || Number.isNaN(n) ? 0 : n,
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
              name="headline_after"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headline (after %)</FormLabel>
                  <FormControl>
                    <Input placeholder="Off Digital Cameras" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Flash deal ends when the timer hits zero…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cta_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA label</FormLabel>
                  <FormControl>
                    <Input placeholder="Shop Now" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cta_href"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA link</FormLabel>
                  <FormControl>
                    <Input placeholder="/shop?category=cameras" {...field} />
                  </FormControl>
                  <FormDescription>Path or full URL.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dismiss_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dismiss label</FormLabel>
                  <FormControl>
                    <Input placeholder="No thanks, close" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="countdown_seconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Countdown (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      placeholder="30"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const n = Number(raw);
                        field.onChange(
                          raw === "" || Number.isNaN(n) ? 30 : n,
                        );
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>Auto-closes after this many seconds (5–120).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="product_image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <HomeImageField
                      label="Product image"
                      description="Foreground product shown in the welcome popup."
                      value={field.value}
                      blockKey="welcome_modal"
                      fieldPath="product_image"
                      token={token}
                      disabled={form.formState.isSubmitting}
                      onUploaded={(path) =>
                        form.setValue("product_image", path, {
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
            <FormField
              control={form.control}
              name="bg_image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <HomeImageField
                      label="Background image"
                      description="Backdrop behind the product in the welcome popup."
                      value={field.value}
                      blockKey="welcome_modal"
                      fieldPath="bg_image"
                      token={token}
                      disabled={form.formState.isSubmitting}
                      onUploaded={(path) =>
                        form.setValue("bg_image", path, {
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
          </div>

          <div className="h-14" aria-hidden />
          <div className="sticky bottom-3 z-20 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-muted-foreground">
                {form.formState.isDirty
                  ? "You have unsaved welcome modal changes."
                  : "All changes saved."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={form.formState.isSubmitting}
                  onClick={() => void onReset()}
                >
                  Reset defaults
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    form.formState.isSubmitting || !form.formState.isDirty
                  }
                >
                  {form.formState.isSubmitting
                    ? "Saving…"
                    : "Save welcome modal"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
