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
  feePlanLabel,
  rentPeriodLabel,
  type Shop,
  type ShopHistoryItem,
  type ShopStatus,
  type StorefrontTheme,
  type ProductSort,
  type VendorFeePlan,
  type VendorRentPeriod,
  SHOP_STATUSES,
  STOREFRONT_THEMES,
  PRODUCT_SORTS,
  VENDOR_FEE_PLANS,
  VENDOR_RENT_PERIODS,
} from "@/lib/shops";
import { STORE_FEE_ROLES, STORE_TEAM_ROLES } from "@/lib/rbac";
import { StoreTeamSection } from "@/components/shops/StoreTeamSection";
import { shopFeeFormSchema } from "@/lib/validators/shop";
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
    feePlan: shop.fee_plan ?? "commission",
    commissionPercent:
      shop.commission_percent === undefined || shop.commission_percent === null
        ? 3
        : shop.commission_percent,
    rentAmount: shop.rent_amount ?? null,
    rentPeriod: shop.rent_period ?? null,
    hasPendingLogo: false,
    hasPendingBanner: false,
  };
}

export function StoreEditPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const canEditFees = Boolean(user && STORE_FEE_ROLES.includes(user.role));
  const canManageTeam = Boolean(user && STORE_TEAM_ROLES.includes(user.role));
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
  const [feePlan, setFeePlan] = useState<VendorFeePlan>("commission");
  const [commissionPercent, setCommissionPercent] = useState<number | null>(3);
  const [rentAmount, setRentAmount] = useState<number | null>(null);
  const [rentPeriod, setRentPeriod] = useState<VendorRentPeriod | null>(null);

  const myMembership = shop?.members?.find((m) => m.user_id === user?.id);
  const isOwner = Boolean(
    isSuper ||
      (user && shop && shop.user_id === user.id) ||
      myMembership?.role === "owner",
  );
  const canEditProfile = isSuper || isOwner;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  useToastMessages(saveSuccess, saveError);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<File | null>(null);
  const [pendingBannerUrl, setPendingBannerUrl] = useState<string | null>(null);
  const [logoFieldError, setLogoFieldError] = useState<string | null>(null);
  const [bannerFieldError, setBannerFieldError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function clearPendingLogo() {
    if (pendingLogoUrl) URL.revokeObjectURL(pendingLogoUrl);
    setPendingLogo(null);
    setPendingLogoUrl(null);
    setLogoFieldError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearPendingBanner() {
    if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl);
    setPendingBanner(null);
    setPendingBannerUrl(null);
    setBannerFieldError(null);
    if (bannerRef.current) bannerRef.current.value = "";
  }

  useEffect(() => {
    return () => {
      if (pendingLogoUrl) URL.revokeObjectURL(pendingLogoUrl);
      if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl);
    };
    // Only revoke on unmount / URL change via clear helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setFeePlan(next.fee_plan ?? "commission");
    setCommissionPercent(
      next.commission_percent === undefined || next.commission_percent === null
        ? 3
        : next.commission_percent,
    );
    setRentAmount(next.rent_amount ?? null);
    setRentPeriod(next.rent_period ?? null);
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
      feePlan,
      commissionPercent,
      rentAmount,
      rentPeriod,
      hasPendingLogo: Boolean(pendingLogo),
      hasPendingBanner: Boolean(pendingBanner),
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
    if (!token || !routeSlug || !canEditProfile) return;
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
    if (canEditFees) {
      const fee = shopFeeFormSchema.safeParse({
        fee_plan: feePlan,
        commission_percent: commissionPercent,
        rent_amount: rentAmount,
        rent_period: rentPeriod,
      });
      if (!fee.success) {
        setSaveError(firstZodError(fee.error));
        setSaveSuccess(null);
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      let latestShop: Shop | null = shop;
      const slugForUpload = encodeURIComponent(routeSlug);

      if (pendingLogo) {
        const form = new FormData();
        form.append("logo", pendingLogo);
        const uploaded = await apiUpload<{ message: string; shop: Shop }>(
          `/api/dashboard/shops/${slugForUpload}/logo`,
          form,
          { token },
        );
        latestShop = uploaded.shop;
      }

      if (pendingBanner) {
        const form = new FormData();
        form.append("banner", pendingBanner);
        const uploaded = await apiUpload<{ message: string; shop: Shop }>(
          `/api/dashboard/shops/${slugForUpload}/banner`,
          form,
          { token },
        );
        latestShop = uploaded.shop;
      }

      const data = await apiFetch<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${slugForUpload}`,
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
            ...(canEditFees
              ? {
                  fee_plan: feePlan,
                  commission_percent: commissionPercent,
                  rent_amount: rentAmount,
                  rent_period: rentPeriod,
                }
              : {}),
          },
        },
      );
      latestShop = data.shop;
      clearPendingLogo();
      clearPendingBanner();
      applyShop(latestShop);
      baseline.markClean(storeDraftFromShop(latestShop));
      setSaveSuccess(data.message || "Store updated");
      await refreshHistory();
      if (latestShop.slug !== routeSlug) {
        navigate(`/stores/${latestShop.slug}`, { replace: true });
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPick(file: File | null) {
    if (!file) {
      clearPendingLogo();
      return;
    }
    const typeCheck = validateShopImageFile(file);
    const checked = typeCheck.ok
      ? await checkImageDimensions(file, "shopLogo")
      : typeCheck;
    if (!checked.ok) {
      setLogoFieldError(checked.message);
      setSaveError(null);
      setSaveSuccess(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (pendingLogoUrl) URL.revokeObjectURL(pendingLogoUrl);
    setLogoFieldError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setPendingLogo(file);
    setPendingLogoUrl(URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onBannerPick(file: File | null) {
    if (!file) {
      clearPendingBanner();
      return;
    }
    const typeCheck = validateShopImageFile(file);
    const checked = typeCheck.ok
      ? await checkImageDimensions(file, "shopBanner")
      : typeCheck;
    if (!checked.ok) {
      setBannerFieldError(checked.message);
      setSaveError(null);
      setSaveSuccess(null);
      if (bannerRef.current) bannerRef.current.value = "";
      return;
    }
    if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl);
    setBannerFieldError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setPendingBanner(file);
    setPendingBannerUrl(URL.createObjectURL(file));
    if (bannerRef.current) bannerRef.current.value = "";
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
              hint={imageUploadHint("shopLogo", 5, {
                prefix: pendingLogo
                  ? "Selected — click Save changes to upload"
                  : "Square brand mark",
              })}
              previewUrl={pendingLogoUrl ?? shop.logo?.path}
              disabled={saving || !canEditProfile}
              inputRef={fileRef}
              onPick={() => fileRef.current?.click()}
              onFile={(file) => void onLogoPick(file)}
              onClear={
                pendingLogo ? () => clearPendingLogo() : undefined
              }
              error={logoFieldError}
            />
            <StoreImageDropzone
              variant="banner"
              label="Store banner"
              hint={imageUploadHint("shopBanner", 5, {
                prefix: pendingBanner
                  ? "Selected — click Save changes to upload"
                  : `Wide hero on /stores/${shop.slug}`,
              })}
              previewUrl={pendingBannerUrl ?? shop.banner?.path}
              disabled={saving || !canEditProfile}
              inputRef={bannerRef}
              onPick={() => bannerRef.current?.click()}
              onFile={(file) => void onBannerPick(file)}
              onClear={
                pendingBanner ? () => clearPendingBanner() : undefined
              }
              error={bannerFieldError}
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

          {(canEditFees || shop.fee_plan) && (
            <StoreFormSection
              step="03"
              title="Fee plan"
              description="How Niyenin earns from this store — commission on each sale, fixed rent, or both."
            >
              {canEditFees ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Plan</Label>
                    <Select
                      value={feePlan}
                      onValueChange={(v) => setFeePlan(v as VendorFeePlan)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDOR_FEE_PLANS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {feePlanLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {feePlan === "commission" || feePlan === "both" ? (
                    <div className="space-y-2">
                      <Label htmlFor="commission_percent">
                        Commission % per sale
                      </Label>
                      <Input
                        id="commission_percent"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={commissionPercent ?? ""}
                        onChange={(e) =>
                          setCommissionPercent(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  ) : null}
                  {feePlan === "rent" || feePlan === "both" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="rent_amount">Rent amount (৳)</Label>
                        <Input
                          id="rent_amount"
                          type="number"
                          min={0}
                          step={1}
                          value={rentAmount ?? ""}
                          onChange={(e) =>
                            setRentAmount(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rent period</Label>
                        <Select
                          value={rentPeriod ?? undefined}
                          onValueChange={(v) =>
                            setRentPeriod(v as VendorRentPeriod)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            {VENDOR_RENT_PERIODS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {rentPeriodLabel(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {feePlanLabel(shop.fee_plan ?? "commission")}
                  {(shop.fee_plan === "commission" ||
                    shop.fee_plan === "both") &&
                  shop.commission_percent != null
                    ? ` · ${shop.commission_percent}% per sale`
                    : ""}
                  {(shop.fee_plan === "rent" || shop.fee_plan === "both") &&
                  shop.rent_amount != null
                    ? ` · ৳${shop.rent_amount.toLocaleString()} ${shop.rent_period ?? ""}`
                    : ""}
                </p>
              )}
            </StoreFormSection>
          )}

          <StoreFormSection
            step="04"
            title="Store team"
            description="One owner plus up to two helper vendors who can manage products and orders."
          >
            {token ? (
              <StoreTeamSection
                shop={shop}
                token={token}
                canManageTeam={canManageTeam}
                onShopUpdated={applyShop}
                onError={setSaveError}
                onSuccess={setSaveSuccess}
              />
            ) : null}
          </StoreFormSection>

          {canEditProfile ? (
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
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Only the store owner or super admin can change store settings.
              {saveError ? (
                <p className="mt-2 text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
              {saveSuccess ? (
                <p className="mt-2 text-brand-primary" role="status">
                  {saveSuccess}
                </p>
              ) : null}
            </div>
          )}

          <StoreFormSection
            step="05"
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
          imageUrl={pendingLogoUrl ?? shop.logo?.path}
          bannerUrl={pendingBannerUrl ?? shop.banner?.path}
          ownerEmail={ownerEmail}
          theme={theme}
        />
      </form>
    </div>
  );
}

/** @deprecated Use StoreEditPage */
export const ShopEditPage = StoreEditPage;
