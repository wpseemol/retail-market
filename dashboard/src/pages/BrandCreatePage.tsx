import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, apiFetch } from "@/lib/api";
import { slugifyClient, type Brand } from "@/lib/brands";
import {
  brandFormSchema,
  toBrandApiBody,
  type BrandFormValues,
} from "@/lib/validators/brand";
import { useAuthStore } from "@/store/auth";
import {
  BrandFormHeader,
  BrandFormSection,
  BrandLivePreview,
  BrandStickyActions,
} from "@/components/brands/BrandFormShell";
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

export function BrandCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
      sort_order: 0,
    },
    mode: "onBlur",
  });

  const name = form.watch("name");
  const slug = form.watch("slug");
  const description = form.watch("description");
  const isActive = form.watch("is_active");
  const sortOrder = form.watch("sort_order");

  useEffect(() => {
    if (!token || slugTouched || name.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/brands/slug-preview?name=${encodeURIComponent(name.trim())}`,
            { token },
          );
          form.setValue("slug", data.slug, { shouldValidate: true });
        } catch {
          form.setValue("slug", slugifyClient(name), { shouldValidate: true });
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [name, slugTouched, token, form]);

  async function onSubmit(values: BrandFormValues) {
    if (!token) return;
    setSubmitError(null);
    try {
      const data = await apiFetch<{ brand: Brand }>("/api/dashboard/brands", {
        method: "POST",
        token,
        body: toBrandApiBody(values),
      });
      navigate(`/brands/${data.brand.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to create brand",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <BrandFormHeader
        title="Add brand"
        subtitle="Create a shared catalog brand with Zod-validated fields. Assign it when adding products."
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          noValidate
        >
          <div className="space-y-5">
            <BrandFormSection
              step="01"
              title="Brand identity"
              description="Name and URL slug used across the product catalog."
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Handmade"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Slug {previewing ? "(updating…)" : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          setSlugTouched(true);
                          field.onChange(slugifyClient(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase letters, numbers, and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </BrandFormSection>

            <BrandFormSection
              step="02"
              title="Details & visibility"
              description="Optional description, sort order, and publish status."
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Optional note for staff (max 500 chars)"
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
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
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
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
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
              </div>
            </BrandFormSection>

            <BrandStickyActions
              message={
                submitError ? (
                  <p className="text-destructive" role="alert">
                    {submitError}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Validated with Zod · injection-safe strings
                  </p>
                )
              }
            >
              <Button asChild type="button" variant="outline">
                <Link to="/brands">Cancel</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create brand"}
              </Button>
            </BrandStickyActions>
          </div>

          <BrandLivePreview
            mode="create"
            name={name}
            slug={slug}
            description={description}
            isActive={isActive}
            sortOrder={sortOrder}
          />
        </form>
      </Form>
    </div>
  );
}
