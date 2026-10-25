import { type FormEvent, useEffect, useRef, useState } from "react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { Link, useNavigate, useParams } from "react-router-dom";
import { History, Palette, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { checkImageDimensions, imageUploadHint } from "@/lib/imagePresets";
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
import {
  STORE_BANGLA_COPY,
  bnOrNull,
  firstZodError,
  shopBanglaSchema,
  validateShopImageFile,
} from "@/lib/validators/shop";
import { BanglaVersionFields } from "@/components/dashboard/bangla-version-fields";
import { useAuthStore } from "@/store/auth";
import { useBaselineDirty } from "@/hooks/use-baseline-dirty";
import { useEditSave } from "@/hooks/use-edit-save";
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

function storeDraftFromShop(shop: Shop) {
  return {
    shopName: shop.shop_name,
    slug: shop.slug,
    description: shop.description ?? "",
    bnEnabled: Boolean(shop.shop_name_bn || shop.description_bn),
    shopNameBn: shop.shop_name_bn ?? "",
    descriptionBn: shop.description_bn ?? "",
    status: shop.status,
    ownerId: shop.user_id,
    theme: shop.storefront_theme ?? "classic",
    productsPerPage: shop.products_per_page ?? 12,
    featuredCount: shop.featured_products_count ?? 4,
    showBannedBrands: shop.show_banned_brands ?? true,
    productSort: shop.product_sort ?? "featured_first",
  };
}

export function StoreEditPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
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
  const [bnEnabled, setBnEnabled] = useState(false);
  const [shopNameBn, setShopNameBn] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
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
  useToastMessages(saveSuccess, saveError);
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
    setShopNameBn(next.shop_name_bn ?? "");
    setDescriptionBn(next.description_bn ?? "");
    setBnEnabled(Boolean(next.shop_name_bn || next.description_bn));
    setStatus(next.status);
    setOwnerId(next.user_id);
    setTheme(next.storefront_theme ?? "classic");
    setProductsPerPage(next.products_per_page ?? 12);
    setFeaturedCount(next.featured_products_count ?? 4);
    setShowBannedBrands(next.show_banned_brands ?? true);
    setProductSort(next.product_sort ?? "featured_first");
  }

  const baseline = useBaselineDirty(
    {
      shopName,
      slug,
      description,
      bnEnabled,
      shopNameBn,
      descriptionBn,
      status,
      ownerId,
      theme,
      productsPerPage,
      featuredCount,
      showBannedBrands,
      productSort,
    },
    !loading && shop !== null,
  );
  const save = useEditSave(
    baseline.dirty,
    saving || deleting,
    "Updates save to the live storefront after you click Save.",
  );

  async function onToggleBangla(next: boolean) {
    if (!next && (shopNameBn.trim() || descriptionBn.trim())) {
      const ok = await confirm({
        title: `Remove the Bangla version of “${shop?.shop_name ?? shopName}”?`,
        description:
          "The Bangla store name and description are cleared when you save, and Bangla shoppers see the English text instead. This cannot be undone after saving.",
        confirmLabel: "Remove Bangla",
      });
      if (!ok) return;
      setShopNameBn("");
      setDescriptionBn("");
    }
    setBnEnabled(next);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !routeSlug) return;
    if (bnEnabled) {
      const bn = shopBanglaSchema.safeParse({
        shop_name_bn: shopNameBn,
        description_bn: descriptionBn,
      });
      if (!bn.success) {
        setSaveError(firstZodError(bn.error));
        setSaveSuccess(null);
        return;
      }
    }
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
            shop_name_bn: bnOrNull(bnEnabled, shopNameBn),
            description_bn: bnOrNull(bnEnabled, descriptionBn),
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
      baseline.markClean(storeDraftFromShop(data.shop));
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
    const typeCheck = validateShopImageFile(file);
    const checked = typeCheck.ok
      ? await checkImageDimensions(file, "shopLogo")
      : typeCheck;
    if (!checked.ok) {
      setSaveError(checked.message);
      setSaveSuccess(null);
      if (fileRef.current) fileRef.current.value = "";
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
    const typeCheck = validateShopImageFile(file);
    const checked = typeCheck.ok
      ? await checkImageDimensions(file, "shopBanner")
      : typeCheck;
    if (!checked.ok) {
      setSaveError(checked.message);
      setSaveSuccess(null);
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
    const ok = await confirm({
      title: `Delete store “${shop?.shop_name ?? "this store"}”?`,
      description: "The store is soft-deleted and hidden from the storefront. The action is logged in history.",
      confirmLabel: "Delete store",
    });
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
    const ok = await confirm({
      title: "Clear all change history for this store?",
      description: "History rows are permanently deleted from the database. This cannot be undone.",
      confirmLabel: "Clear history",
    });
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {shopStatusLabel(shop.status)}
            </Badge>
            <Button asChild type="button" size="sm" variant="outline" className="h-7 gap-1.5">
              <Link to={`/stores/${shop.slug}/design`}>
                <Palette className="size-3.5" />
                Customize store page
              </Link>
            </Button>
          </div>
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
              hint={imageUploadHint("shopLogo", 5, { prefix: "Square brand mark" })}
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
              hint={imageUploadHint("shopBanner", 5, {
                prefix: `Wide hero on /stores/${shop.slug}`,
              })}
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
            title="Bangla version"
            description="Optional — when empty the storefront shows the English text in Bangla too."
          >
            <BanglaVersionFields
              {...STORE_BANGLA_COPY}
              enabled={bnEnabled}
              onEnabledChange={(next) => void onToggleBangla(next)}
              nameBn={shopNameBn}
              onNameBnChange={setShopNameBn}
              descriptionBn={descriptionBn}
              onDescriptionBnChange={setDescriptionBn}
              englishName={shopName.trim()}
              disabled={saving}
            />
          </StoreFormSection>

          <StoreFormSection
            step="03"
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
                <p className="text-muted-foreground">{save.hint}</p>
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
            <Button
              type="submit"
              disabled={!save.canSave}
              title={save.blockedReason}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </StoreStickyActions>

          <StoreFormSection
            step="04"
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
