import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import type { Category } from "@/lib/categories";
import type { Brand } from "@/lib/brands";
import type { Shop } from "@/lib/shops";
import {
  cartesianVariants,
  PRODUCT_CREATE_STATUSES,
  productStatusLabel,
  slugifyClient,
  type Product,
  type ProductType,
} from "@/lib/products";
import { getCategoryLucideIcon } from "@/lib/categoryIcons";
import { useAuthStore } from "@/store/auth";
import {
  ProductImageGalleryField,
  type LocalProductImage,
} from "@/components/products/ProductImageGalleryField";
import { RichTextEditor } from "@/components/products/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OptionDraft = { name: string; valuesText: string };
type VariantDraft = {
  title: string;
  price: string;
  stock_qty: string;
  option_values: Record<string, string>;
};

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isElevated =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "moderator";

  const [product, setProduct] = useState<Product | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProductType>("simple");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [localImages, setLocalImages] = useState<LocalProductImage[]>([]);
  const [localPrimaryKey, setLocalPrimaryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [prodRes, catRes, brandRes, shopRes] = await Promise.all([
          apiFetch<{ product: Product }>(`/api/dashboard/products/${id}`, {
            token,
          }),
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

        const next = prodRes.product;
        setProduct(next);
        setCategories(catRes.categories);
        setBrands(brandRes.brands);
        setShops(shopRes.shops);
        setShopId(next.vendor_id ?? "");
        setCategoryId(next.category_id ?? "");
        setBrandId(next.brand_id ?? next.brand?.id ?? "");
        setName(next.name);
        setSlug(next.slug);
        setShortDescription(next.short_description ?? "");
        setDescription(next.description ?? "");
        setType(next.type);
        setStatus(next.status === "active" ? "active" : "draft");
        setPrice(String(next.price ?? 0));
        setStock(String(next.stock_qty ?? 0));
        setOptions(
          (next.options ?? []).map((o) => ({
            name: o.name,
            valuesText: o.values.map((v) => v.value).join(", "),
          })),
        );
        setVariants(
          (next.variants ?? []).map((v) => ({
            title: v.title ?? "",
            price: String(v.price ?? next.price ?? 0),
            stock_qty: String(v.stock_qty ?? 0),
            option_values: Object.fromEntries(
              (v.option_values ?? []).map((ov) => [ov.option, ov.value]),
            ),
          })),
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load product",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, id, isElevated]);

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
    setVariants(
      combos.map((c) => ({
        title: c.title,
        price: price || "0",
        stock_qty: "0",
        option_values: c.option_values,
      })),
    );
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (localImages.length > 0) {
        await uploadLocalImages(localImages);
      }

      const body: Record<string, unknown> = {
        category_id: categoryId,
        brand_id: brandId || null,
        name: name.trim(),
        slug: slug.trim(),
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        type,
        status,
        price: Number(price) || 0,
        stock_qty: Number(stock) || 0,
        ...(isElevated && shopId ? { vendor_id: shopId } : {}),
      };

      if (type === "variable") {
        body.options = optionPayload;
        body.variants = variants.map((v) => ({
          title: v.title,
          price: Number(v.price) || 0,
          stock_qty: Number(v.stock_qty) || 0,
          option_values: v.option_values,
        }));
      }

      const data = await apiFetch<{ product: Product }>(
        `/api/dashboard/products/${id}`,
        { method: "PATCH", token, body },
      );
      setProduct(data.product);
      setSaveSuccess("Product saved");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLocalImages(files: LocalProductImage[]) {
    if (!token || !id || files.length === 0) return;
    setUploading(true);
    setSaveError(null);
    try {
      const ordered = [...files];
      if (localPrimaryKey) {
        const primaryIndex = ordered.findIndex(
          (img) => img.key === localPrimaryKey,
        );
        if (primaryIndex > 0) {
          const [primary] = ordered.splice(primaryIndex, 1);
          ordered.unshift(primary);
        }
      }

      const form = new FormData();
      for (const img of ordered) {
        form.append("images", img.file);
      }
      const data = await apiUpload<{ product: Product }>(
        `/api/dashboard/products/${id}/images`,
        form,
        { token },
      );
      setProduct(data.product);
      for (const img of localImages) URL.revokeObjectURL(img.preview);
      setLocalImages([]);
      setLocalPrimaryKey(null);
      setSaveSuccess("Product images uploaded");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Image upload failed";
      setSaveError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveRemoteImage(mediaId: string) {
    if (!token || !id) return;
    setUploading(true);
    setSaveError(null);
    try {
      const data = await apiFetch<{ product: Product }>(
        `/api/dashboard/products/${id}/images/${mediaId}`,
        { method: "DELETE", token },
      );
      setProduct(data.product);
      setSaveSuccess("Image removed");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to remove image",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSetPrimaryRemote(mediaId: string) {
    if (!token || !id) return;
    setUploading(true);
    setSaveError(null);
    try {
      const data = await apiFetch<{ product: Product }>(
        `/api/dashboard/products/${id}/images/${mediaId}/primary`,
        { method: "POST", token },
      );
      setProduct(data.product);
      setSaveSuccess("Primary image updated");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to set primary image",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    if (!window.confirm("Delete this product?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/dashboard/products/${id}`, {
        method: "DELETE",
        token,
      });
      navigate("/products");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to delete product",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading product…</p>;
  }

  if (error || !product) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? "Not found"}</p>
        <Button asChild variant="outline">
          <Link to="/products">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/products">
              <ArrowLeft />
              Products
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">/{product.slug}</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {productStatusLabel(product.status)}
        </Badge>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
              <Package className="size-4" />
            </div>
            <CardTitle>Media</CardTitle>
            <CardDescription>
              Manage gallery photos and choose the primary listing image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProductImageGalleryField
              images={product.gallery ?? []}
              primaryId={product.thumbnail_id ?? product.thumbnail?.id ?? null}
              localImages={localImages}
              localPrimaryKey={localPrimaryKey}
              onLocalImagesChange={setLocalImages}
              onLocalPrimaryChange={setLocalPrimaryKey}
              onRemoveRemote={(mediaId) => void onRemoveRemoteImage(mediaId)}
              onSetPrimaryRemote={(mediaId) => void onSetPrimaryRemote(mediaId)}
              disabled={uploading || saving}
            />
            {localImages.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploading}
                onClick={() => void uploadLocalImages(localImages)}
              >
                {uploading
                  ? "Uploading…"
                  : `Upload ${localImages.length} image${localImages.length === 1 ? "" : "s"}`}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit product</CardTitle>
            <CardDescription>
              Update shop, category, brand, description, and variants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isElevated ? (
              <div className="space-y-2">
                <Label>Shop</Label>
                <Select value={shopId || undefined} onValueChange={setShopId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shop_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId || undefined}
                  onValueChange={setCategoryId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={brandId || undefined}
                  onValueChange={setBrandId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <Link to="/brands/new" className="text-brand-primary underline">
                    Create brand
                  </Link>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugifyClient(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short">Short description</Label>
              <Input
                id="short"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={500}
                placeholder="One-line summary for listings"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                disabled={saving}
                placeholder="Materials, fit, care, and other product details…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ProductType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="variable">Variable (variants)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as "draft" | "active")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CREATE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "active" ? "publish" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {type === "simple" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Options & variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOptions((prev) => [
                        ...prev,
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
                      placeholder="Option name"
                      value={opt.name}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, name: e.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Input
                      placeholder="Values (S, M, L)"
                      value={opt.valuesText}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, valuesText: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={regenerateVariants}
                >
                  Regenerate variants
                </Button>
                {variants.map((v, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_100px_100px]"
                  >
                    <Input
                      value={v.title}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, title: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={v.price}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, price: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      value={v.stock_qty}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, stock_qty: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="text-sm text-brand-primary" role="status">
                {saveSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              <Trash2 />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
