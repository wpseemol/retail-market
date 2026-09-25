import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { History, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import {
  slugifyClient,
  shopStatusLabel,
  storefrontThemeLabel,
  productSortLabel,
  type Shop,
  type ShopHistoryItem,
  type ShopStatus,
  type StorefrontTheme,
  type ProductSort,
  SHOP_STATUSES,
  STOREFRONT_THEMES,
  PRODUCT_SORTS,
} from "@/lib/shops";
import { validateShopImageFile } from "@/lib/validators/shop";
import { useAuthStore } from "@/store/auth";
import {
  StoreFormHeader,
  StoreFormSection,
  StoreImageDropzone,
  StoreLivePreview,
  StoreStickyActions,
} from "@/components/shops/ShopFormShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type VendorOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function StoreEditPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [shop, setShop] = useState<Shop | null>(null);
  const [history, setHistory] = useState<ShopHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ShopStatus>("pending");
  const [ownerId, setOwnerId] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [theme, setTheme] = useState<StorefrontTheme>("classic");
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [featuredCount, setFeaturedCount] = useState(4);
  const [showBannedBrands, setShowBannedBrands] = useState(true);
  const [productSort, setProductSort] =
    useState<ProductSort>("featured_first");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function refreshHistory() {
    if (!token || !routeSlug) return;
    const hist = await apiFetch<{ history: ShopHistoryItem[] }>(
      `/api/dashboard/shops/${encodeURIComponent(routeSlug)}/history`,
      { token },
    );
    setHistory(hist.history);
  }

  async function loadAll() {
    if (!token || !routeSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [shopRes, historyRes] = await Promise.all([
        apiFetch<{ shop: Shop }>(
          `/api/dashboard/shops/${encodeURIComponent(routeSlug)}`,
          { token },
        ),
        apiFetch<{ history: ShopHistoryItem[] }>(
          `/api/dashboard/shops/${encodeURIComponent(routeSlug)}/history`,
          { token },
        ),
      ]);
      applyShop(shopRes.shop);
      setHistory(historyRes.history);

      if (isSuper) {
        const users = await apiFetch<{ users: VendorOption[] }>(
          "/api/dashboard/users?role=vendor&limit=100",
          { token },
        );
        setVendors(users.users);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load store");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, routeSlug, isSuper]);

  function applyShop(next: Shop) {
    setShop(next);
    setShopName(next.shop_name);
    setSlug(next.slug);
    setDescription(next.description ?? "");
    setStatus(next.status);
    setOwnerId(next.user_id);
    setTheme(next.storefront_theme ?? "classic");
    setProductsPerPage(next.products_per_page ?? 12);
    setFeaturedCount(next.featured_products_count ?? 4);
    setShowBannedBrands(next.show_banned_brands ?? true);
    setProductSort(next.product_sort ?? "featured_first");
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !routeSlug) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const data = await apiFetch<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${encodeURIComponent(routeSlug)}`,
        {
          method: "PATCH",
          token,
          body: {
            shop_name: shopName.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            storefront_theme: theme,
            products_per_page: productsPerPage,
            featured_products_count: featuredCount,
            show_banned_brands: showBannedBrands,
            product_sort: productSort,
            ...(isSuper
              ? {
                  status,
                  user_id: ownerId || undefined,
                }
              : {}),
          },
        },
      );
      applyShop(data.shop);
      setSaveSuccess(data.message || "Store updated");
      await refreshHistory();
      if (data.shop.slug !== routeSlug) {
        navigate(`/stores/${data.shop.slug}`, { replace: true });
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoChange(file: File | null) {
    if (!file || !token || !routeSlug) return;
    const checked = validateShopImageFile(file);
    if (!checked.ok) {
      setSaveError(checked.message);
      return;
    }
    setLogoUploading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const data = await apiUpload<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${encodeURIComponent(routeSlug)}/logo`,
        form,
        { token },
      );
      applyShop(data.shop);
      setSaveSuccess(data.message || "Store logo updated");
      await refreshHistory();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Logo upload failed",
      );
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onBannerChange(file: File | null) {
    if (!file || !token || !routeSlug) return;
    const checked = validateShopImageFile(file);
    if (!checked.ok) {
      setSaveError(checked.message);
      return;
    }
    setBannerUploading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const form = new FormData();
      form.append("banner", file);
      const data = await apiUpload<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${encodeURIComponent(routeSlug)}/banner`,
        form,
        { token },
      );
      applyShop(data.shop);
      setSaveSuccess(data.message || "Store banner updated");
      await refreshHistory();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Banner upload failed",
      );
    } finally {
      setBannerUploading(false);
      if (bannerRef.current) bannerRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!token || !routeSlug || !isSuper) return;
    const ok = window.confirm(
      `Delete store “${shop?.shop_name}”? This soft-deletes the store and is logged in history.`,
    );
    if (!ok) return;

    setDeleting(true);
    setSaveError(null);
    try {
      await apiFetch(
        `/api/dashboard/shops/${encodeURIComponent(routeSlug)}`,
        {
          method: "DELETE",
          token,
        },
      );
      navigate("/stores");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function onClearHistory() {
    if (!token || !routeSlug) return;
    const ok = window.confirm(
      "Clear all change history for this store? This permanently deletes history rows from the database.",
    );
    if (!ok) return;
    setClearingHistory(true);
    setSaveError(null);
    try {
      await apiFetch(
        `/api/dashboard/shops/${encodeURIComponent(routeSlug)}/history`,
        { method: "DELETE", token },
      );
      setHistory([]);
      setSaveSuccess("Store history cleared");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to clear history",
      );
    } finally {
      setClearingHistory(false);
    }
  }

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Loading store…
      </p>
    );
  }

  if (error || !shop) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <StoreFormHeader
          title="Store not found"
          subtitle="This store may have been removed or you do not have access."
        />
        <p className="text-sm text-destructive">{error ?? "Store not found"}</p>
      </div>
    );
  }

  const ownerEmail =
    shop.user?.email ??
    vendors.find((v) => v.id === ownerId)?.email ??
    undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <StoreFormHeader
        title={shop.shop_name}
        subtitle={`Edit store · /stores/${shop.slug}`}
        badge={
          <Badge variant="outline" className="capitalize">
            {shopStatusLabel(shop.status)}
          </Badge>
        }
      />

      <form
        onSubmit={onSave}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        noValidate
      >
        <div className="space-y-5">
          <StoreFormSection
            step="01"
            title="Store identity"
            description="Logo, banner, name, and URL slug for the public store page."
          >
            <StoreImageDropzone
              variant="logo"
              label="Store logo"
              hint="Square brand mark · JPEG, PNG, WebP, or GIF · max 5 MB · always resized on the server"
              previewUrl={shop.logo?.path}
              uploading={logoUploading}
              disabled={saving}
              inputRef={fileRef}
              onPick={() => fileRef.current?.click()}
              onFile={(file) => void onLogoChange(file)}
            />
            <StoreImageDropzone
              variant="banner"
              label="Store banner"
              hint={`Wide hero on /stores/${shop.slug} · JPEG, PNG, WebP, or GIF · max 5 MB · always resized on the server`}
              previewUrl={shop.banner?.path}
              uploading={bannerUploading}
              disabled={saving}
              inputRef={bannerRef}
              onPick={() => bannerRef.current?.click()}
              onFile={(file) => void onBannerChange(file)}
            />

            <div className="space-y-2">
              <Label htmlFor="store_name">Store name</Label>
              <Input
                id="store_name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_slug">Unique slug</Label>
              <Input
                id="store_slug"
                value={slug}
                onChange={(e) => setSlug(slugifyClient(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Public URL: /stores/{slug || "…"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_description">Description</Label>
              <Textarea
                id="store_description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short store description"
              />
            </div>

            {isSuper ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ShopStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {shopStatusLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shop.user &&
                      !vendors.some((v) => v.id === shop.user_id) ? (
                        <SelectItem value={shop.user_id}>
                          {shop.user.first_name} {shop.user.last_name} ·{" "}
                          {shop.user.email}
                        </SelectItem>
                      ) : null}
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.first_name} {v.last_name} · {v.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </StoreFormSection>

          <StoreFormSection
            step="02"
            title="Storefront layout"
            description="How this store appears on the customer site."
          >
            <div className="space-y-2">
              <Label>Page design</Label>
              <Select
                value={theme}
                onValueChange={(value) => setTheme(value as StorefrontTheme)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOREFRONT_THEMES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {storefrontThemeLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Classic = logo hero · Marketplace = banner + grid · Showcase =
                banner + featured strip
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="products_per_page">Products per page</Label>
                <Input
                  id="products_per_page"
                  type="number"
                  min={4}
                  max={48}
                  value={productsPerPage}
                  onChange={(e) =>
                    setProductsPerPage(Number(e.target.value) || 12)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured_count">Featured products</Label>
                <Input
                  id="featured_count"
                  type="number"
                  min={0}
                  max={12}
                  value={featuredCount}
                  onChange={(e) =>
                    setFeaturedCount(Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product order</Label>
              <Select
                value={productSort}
                onValueChange={(value) =>
                  setProductSort(value as ProductSort)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_SORTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {productSortLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--brand-primary,#00b207)]"
                checked={showBannedBrands}
                onChange={(e) => setShowBannedBrands(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">
                  Show banned-brand products
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  When on, products whose brand is inactive still appear — with
                  a distinct “banned brand” style on the storefront.
                </span>
              </span>
            </label>
          </StoreFormSection>

          <StoreStickyActions
            message={
              saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError}
                </p>
              ) : saveSuccess ? (
                <p className="text-brand-primary" role="status">
                  {saveSuccess}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Updates save to the live storefront after you click Save.
                </p>
              )
            }
          >
            <Button asChild type="button" variant="outline">
              <Link to="/stores">Cancel</Link>
            </Button>
            {isSuper ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || saving}
                onClick={() => void onDelete()}
              >
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </StoreStickyActions>

          <StoreFormSection
            step="03"
            title="Change history"
            description="Tracks create, edits, media uploads, and deletes. Clear removes rows from the database."
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {history.length} entr{history.length === 1 ? "y" : "ies"}
              </p>
              {history.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={clearingHistory}
                  onClick={() => void onClearHistory()}
                >
                  {clearingHistory ? "Clearing…" : "Clear history"}
                </Button>
              ) : null}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {item.action.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.actor
                              ? `${item.actor.first_name} ${item.actor.last_name}`
                              : "System"}{" "}
                            · {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {item.action}
                      </Badge>
                    </div>
                    {item.note ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.note}
                      </p>
                    ) : null}
                    {item.changes && Object.keys(item.changes).length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {Object.entries(item.changes).map(([field, diff]) => (
                          <li key={field}>
                            <span className="font-medium text-foreground">
                              {field}
                            </span>
                            : {formatChangeValue(diff.from)} →{" "}
                            {formatChangeValue(diff.to)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </StoreFormSection>
        </div>

        <StoreLivePreview
          mode="edit"
          shopName={shopName}
          slug={slug}
          description={description}
          status={status}
          imageUrl={shop.logo?.path}
          bannerUrl={shop.banner?.path}
          ownerEmail={ownerEmail}
          theme={theme}
        />
      </form>
    </div>
  );
}

/** @deprecated Use StoreEditPage */
export const ShopEditPage = StoreEditPage;
