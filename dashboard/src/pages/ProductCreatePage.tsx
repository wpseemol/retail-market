import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Package, Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import type { Category } from "@/lib/categories";
import type { Brand } from "@/lib/brands";
import type { Shop } from "@/lib/shops";
import {
  cartesianVariants,
  PRODUCT_CREATE_STATUSES,
  slugifyClient,
  type Product,
  type ProductType,
} from "@/lib/products";
import { useAuthStore } from "@/store/auth";
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

export function ProductCreatePage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isElevated =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "moderator";
  const fileRef = useRef<HTMLInputElement>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [type, setType] = useState<ProductType>("simple");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [options, setOptions] = useState<OptionDraft[]>([
    { name: "Size", valuesText: "S, M, L" },
  ]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        if (shopRes.shops[0] && !shopId) setShopId(shopRes.shops[0].id);
        const unknown = brandRes.brands.find(
          (b) => b.slug === "unknown" || b.name === "Unknown",
        );
        if (unknown) setBrandId(unknown.id);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isElevated]);

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
          setSlug(data.slug);
        } catch {
          setSlug(slugifyClient(name));
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [name, slugTouched, token]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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

  function onPickImage(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (!categoryId) {
      setError("Select a category");
      return;
    }
    if (!brandId) {
      setError("Select a brand (create one under Catalog → Brands first)");
      return;
    }
    if (isElevated && !shopId) {
      setError("Select a shop");
      return;
    }
    if (type === "variable" && optionPayload.length === 0) {
      setError("Add at least one option with values for variant products");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        category_id: categoryId,
        brand_id: brandId,
        name: name.trim(),
        slug: slug.trim() || undefined,
        short_description: shortDescription.trim() || null,
        type,
        status,
        price: Number(price) || 0,
        stock_qty: Number(stock) || 0,
        ...(isElevated ? { vendor_id: shopId } : {}),
      };

      if (type === "variable") {
        body.options = optionPayload;
        body.variants = (variants.length
          ? variants
          : cartesianVariants(optionPayload).map((c) => ({
              title: c.title,
              price: price || "0",
              stock_qty: "0",
              option_values: c.option_values,
            }))
        ).map((v) => ({
          title: v.title,
          price: Number(v.price) || 0,
          stock_qty: Number(v.stock_qty) || 0,
          option_values: v.option_values,
        }));
      }

      const data = await apiFetch<{ product: Product }>(
        "/api/dashboard/products",
        { method: "POST", token, body },
      );

      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        await apiUpload(
          `/api/dashboard/products/${data.product.id}/thumbnail`,
          form,
          { token },
        );
      }

      navigate(`/products/${data.product.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create product",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/products">
            <ArrowLeft />
            Products
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shop → category → brand (create brands first) → simple or variant
          product.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Package className="size-4" />
          </div>
          <CardTitle>Product details</CardTitle>
          <CardDescription>
            Products belong to a shop and use shared platform categories.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product image</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose image
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
                Need a new brand?{" "}
                <Link to="/brands/new" className="text-brand-primary underline">
                  Create brand
                </Link>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug {previewing ? "(updating…)" : ""}
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugifyClient(e.target.value));
                }}
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
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
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
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Input
                      placeholder="Option name (Size)"
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
                <div className="flex flex-wrap gap-2">
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
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Base price"
                  />
                </div>
                {variants.length > 0 ? (
                  <div className="space-y-2">
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
                          placeholder="Price"
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
                          placeholder="Stock"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click “Generate variants” after setting options.
                  </p>
                )}
              </div>
            )}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? "Creating…" : "Create product"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
