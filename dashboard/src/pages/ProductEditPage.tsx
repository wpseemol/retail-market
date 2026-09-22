import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Package, Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import type { Category } from "@/lib/categories";
import type { Shop } from "@/lib/shops";
import {
  brandModeFromValue,
  brandValueFromMode,
  cartesianVariants,
  PRODUCT_CREATE_STATUSES,
  productStatusLabel,
  slugifyClient,
  type BrandMode,
  type Product,
  type ProductType,
} from "@/lib/products";
import { useAuthStore } from "@/store/auth";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandMode, setBrandMode] = useState<BrandMode>("unknown");
  const [customBrand, setCustomBrand] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [type, setType] = useState<ProductType>("simple");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
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
        const [prodRes, catRes, shopRes] = await Promise.all([
          apiFetch<{ product: Product }>(`/api/dashboard/products/${id}`, {
            token,
          }),
          apiFetch<{ categories: Category[] }>(
            "/api/dashboard/categories?limit=100&active=true",
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
        setShops(shopRes.shops);
        setShopId(next.vendor_id ?? "");
        setCategoryId(next.category_id ?? "");
        setName(next.name);
        setSlug(next.slug);
        const mode = brandModeFromValue(next.brand);
        setBrandMode(mode);
        setCustomBrand(mode === "custom" ? next.brand ?? "" : "");
        setShortDescription(next.short_description ?? "");
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
      const body: Record<string, unknown> = {
        category_id: categoryId,
        name: name.trim(),
        slug: slug.trim(),
        brand: brandValueFromMode(brandMode, customBrand),
        short_description: shortDescription.trim() || null,
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

  async function onUpload(file: File | null) {
    if (!token || !id || !file) return;
    setUploading(true);
    setSaveError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const data = await apiUpload<{ product: Product }>(
        `/api/dashboard/products/${id}/thumbnail`,
        form,
        { token },
      );
      setProduct(data.product);
      setSaveSuccess("Product image updated");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Package className="size-4" />
          </div>
          <CardTitle>Edit product</CardTitle>
          <CardDescription>
            Update shop, category, brand, and variants.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product image</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {product.thumbnail?.path ? (
                    <img
                      src={product.thumbnail.path}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? "Uploading…" : "Change image"}
                  </Button>
                </div>
              </div>
            </div>

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
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={brandMode}
                onValueChange={(v) => setBrandMode(v as BrandMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="handmade">Handmade</SelectItem>
                  <SelectItem value="custom">Custom brand</SelectItem>
                </SelectContent>
              </Select>
              {brandMode === "custom" ? (
                <Input
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Brand name"
                />
              ) : null}
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
        </form>
      </Card>
    </div>
  );
}
