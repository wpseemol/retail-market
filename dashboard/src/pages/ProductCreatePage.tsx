import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import type { Category } from "@/lib/categories";
import type { Brand } from "@/lib/brands";
import type { Shop } from "@/lib/shops";
import {
  cartesianVariants,
  PRODUCT_CREATE_STATUSES,
  slugifyClient,
  type Product,
} from "@/lib/products";
import { getCategoryLucideIcon } from "@/lib/categoryIcons";
import { useAuthStore } from "@/store/auth";
import {
  productFormSchema,
  toProductApiBody,
  validateProductImages,
  PRODUCT_IMAGE_MAX_COUNT,
  type ProductFormValues,
} from "@/lib/validators/product";
import {
  ProductFormHeader,
  ProductFormSection,
  ProductLivePreview,
  ProductStickyActions,
} from "@/components/products/ProductFormShell";
import {
  ProductImageGalleryField,
  type LocalProductImage,
} from "@/components/products/ProductImageGalleryField";
import { RichTextEditor } from "@/components/products/RichTextEditor";
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

export function ProductCreatePage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isElevated =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "moderator";

  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [localImages, setLocalImages] = useState<LocalProductImage[]>([]);
  const [localPrimaryKey, setLocalPrimaryKey] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      vendor_id: "",
      category_id: "",
      brand_id: "",
      name: "",
      slug: "",
      short_description: "",
      description: "",
      type: "simple",
      status: "draft",
      price: 0,
      stock_qty: 0,
      options: [{ name: "Size", valuesText: "S, M, L" }],
      variants: [],
    },
    mode: "onBlur",
  });

  const name = form.watch("name");
  const slug = form.watch("slug");
  const shortDescription = form.watch("short_description");
  const status = form.watch("status");
  const type = form.watch("type");
  const price = form.watch("price");
  const stockQty = form.watch("stock_qty");
  const options = form.watch("options");
  const variants = form.watch("variants");
  const categoryId = form.watch("category_id");
  const brandId = form.watch("brand_id");
  const vendorId = form.watch("vendor_id");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const [catRes, brandRes, shopRes] = await Promise.all([
          apiFetch<{ categories: Category[] }>(
            "/api/dashboard/categories?limit=100&active=true",
            { token },
          ),
          apiFetch<{ brands: Brand[] }>(
            "/api/dashboard/brands?limit=100&active=true",
            { token },
          ),
          isElevated
            ? apiFetch<{ shops: Shop[] }>("/api/dashboard/shops?limit=100", {
                token,
              })
            : Promise.resolve({ shops: [] as Shop[] }),
        ]);
        if (cancelled) return;
        setCategories(catRes.categories);
        setBrands(brandRes.brands);
        setShops(shopRes.shops);
        if (shopRes.shops[0] && !form.getValues("vendor_id")) {
          form.setValue("vendor_id", shopRes.shops[0].id);
        }
        const unknown = brandRes.brands.find(
          (b) => b.slug === "unknown" || b.name === "Unknown",
        );
        if (unknown && !form.getValues("brand_id")) {
          form.setValue("brand_id", unknown.id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isElevated, form]);

  useEffect(() => {
    if (!token || slugTouched || name.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/products/slug-preview?name=${encodeURIComponent(name.trim())}`,
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

  const optionPayload = useMemo(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: o.valuesText
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length > 0),
    [options],
  );

  function regenerateVariants() {
    const combos = cartesianVariants(optionPayload);
    form.setValue(
      "variants",
      combos.map((c) => ({
        title: c.title,
        price: price || 0,
        stock_qty: 0,
        option_values: c.option_values,
      })),
    );
  }

  const categoryName = categories.find((c) => c.id === categoryId)?.name;
  const brandName = brands.find((b) => b.id === brandId)?.name;
  const shopName = shops.find((s) => s.id === vendorId)?.shop_name;
  const localPrimaryImage =
    localImages.find((i) => i.key === localPrimaryKey)?.preview ??
    localImages[0]?.preview;

  async function onSubmit(values: ProductFormValues) {
    if (!token) return;

    const imageCheck = validateProductImages(localImages.map((i) => i.file));
    if (!imageCheck.ok) {
      setSubmitError(imageCheck.message);
      return;
    }

    setSubmitError(null);
    try {
      const data = await apiFetch<{ product: Product }>(
        "/api/dashboard/products",
        {
          method: "POST",
          token,
          body: toProductApiBody(values, { includeVendor: isElevated }),
        },
      );

      if (localImages.length > 0) {
        const ordered = [...localImages];
        if (localPrimaryKey) {
          const primaryIndex = ordered.findIndex(
            (img) => img.key === localPrimaryKey,
          );
          if (primaryIndex > 0) {
            const [primary] = ordered.splice(primaryIndex, 1);
            ordered.unshift(primary);
          }
        }
        const formData = new FormData();
        for (const img of ordered) {
          formData.append("images", img.file);
        }
        const uploaded = await apiUpload<{ product: Product }>(
          `/api/dashboard/products/${data.product.id}/images`,
          formData,
          { token },
        );
        if (localPrimaryKey && ordered[0]) {
          const primaryMedia = uploaded.product.gallery?.[0];
          if (
            primaryMedia &&
            uploaded.product.thumbnail_id !== primaryMedia.id
          ) {
            await apiFetch(
              `/api/dashboard/products/${data.product.id}/images/${primaryMedia.id}/primary`,
              { method: "POST", token },
            );
          }
        }
      }

      navigate(`/products/${data.product.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to create product",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <ProductFormHeader
        title="Add product"
        subtitle="Shop → category → brand → photos, details, and rich description."
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          noValidate
        >
          <div className="space-y-5">
            {/* 01 Media */}
            <ProductFormSection
              step="01"
              title="Media"
              description="Add multiple product photos. The primary image appears in catalog listings. JPEG, PNG, WebP, or GIF · max 5 MB · always resized on the server."
            >
              <ProductImageGalleryField
                localImages={localImages}
                localPrimaryKey={localPrimaryKey}
                onLocalImagesChange={setLocalImages}
                onLocalPrimaryChange={setLocalPrimaryKey}
                onError={setSubmitError}
                disabled={form.formState.isSubmitting}
                maxImages={PRODUCT_IMAGE_MAX_COUNT}
              />
            </ProductFormSection>

            {/* 02 Catalog placement */}
            <ProductFormSection
              step="02"
              title="Catalog placement"
              description="Assign shop, category, and brand so the product appears in the right listings."
            >
              {isElevated && (
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select shop" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shops.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.shop_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => {
                            const Icon = getCategoryLucideIcon(c.icon);
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="inline-flex items-center gap-2">
                                  <Icon className="size-3.5 text-brand-deep" />
                                  {c.name}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Need a new brand?{" "}
                        <Link
                          to="/brands/new"
                          className="text-brand-primary underline"
                        >
                          Create brand
                        </Link>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ProductFormSection>

            {/* 03 Details */}
            <ProductFormSection
              step="03"
              title="Details"
              description="Name, URL slug, descriptions, product type, status, price, and stock."
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Product name"
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

              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="One-line summary for catalog cards (max 500 chars)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        disabled={form.formState.isSubmitting}
                        placeholder="Materials, fit, care, and other product details…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="variable">
                            Variable (variants)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_CREATE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s === "active" ? "publish" : s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {type === "simple" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
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
                    name="stock_qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
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
                </div>
              )}
            </ProductFormSection>

            {/* 04 Variants */}
            {type === "variable" && (
              <ProductFormSection
                step="04"
                title="Options & variants"
                description="Define option axes (Size, Color). Value combinations become variant rows."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Options</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        form.setValue("options", [
                          ...options,
                          { name: "", valuesText: "" },
                        ])
                      }
                    >
                      <Plus />
                      Option
                    </Button>
                  </div>

                  {options.map((opt, index) => (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
                    >
                      <Input
                        placeholder="Option name (Size)"
                        value={opt.name}
                        onChange={(e) => {
                          const next = [...options];
                          next[index] = { ...next[index], name: e.target.value };
                          form.setValue("options", next);
                        }}
                      />
                      <Input
                        placeholder="Values (S, M, L)"
                        value={opt.valuesText}
                        onChange={(e) => {
                          const next = [...options];
                          next[index] = {
                            ...next[index],
                            valuesText: e.target.value,
                          };
                          form.setValue("options", next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          form.setValue(
                            "options",
                            options.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={regenerateVariants}
                    >
                      Generate variants
                    </Button>
                    <Input
                      className="max-w-[140px]"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Base price"
                      value={price}
                      onChange={(e) =>
                        form.setValue("price", Number(e.target.value) || 0)
                      }
                    />
                  </div>

                  {form.formState.errors.options?.message && (
                    <p className="text-sm text-destructive" role="alert">
                      {form.formState.errors.options.message}
                    </p>
                  )}

                  {variants.length > 0 ? (
                    <div className="space-y-2">
                      {variants.map((v, index) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_100px_100px]"
                        >
                          <Input
                            value={v.title}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = {
                                ...next[index],
                                title: e.target.value,
                              };
                              form.setValue("variants", next);
                            }}
                          />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = {
                                ...next[index],
                                price: Number(e.target.value) || 0,
                              };
                              form.setValue("variants", next);
                            }}
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Stock"
                            value={v.stock_qty}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = {
                                ...next[index],
                                stock_qty: Number(e.target.value) || 0,
                              };
                              form.setValue("variants", next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Click "Generate variants" after setting options.
                    </p>
                  )}
                </div>
              </ProductFormSection>
            )}

            <ProductStickyActions
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
                <Link to="/products">Cancel</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create product"}
              </Button>
            </ProductStickyActions>
          </div>

          <ProductLivePreview
            mode="create"
            name={name}
            slug={slug}
            shortDescription={shortDescription}
            status={status}
            type={type}
            price={price}
            stockQty={stockQty}
            imageUrl={localPrimaryImage}
            categoryName={categoryName}
            brandName={brandName}
            shopName={shopName}
          />
        </form>
      </Form>
    </div>
  );
}
