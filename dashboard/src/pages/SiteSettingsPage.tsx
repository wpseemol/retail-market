import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    BarChart3,
    Globe,
    History,
    ImagePlus,
    LayoutGrid,
    LayoutTemplate,
    Megaphone,
    Menu,
    PanelBottom,
    Share2,
    Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import {
    invalidateSiteBrandingCache,
    applyFaviconHref,
    FALLBACK_FAVICON,
    FALLBACK_LOGIN_LOGO,
} from "@/lib/siteBranding";
import { useAuthStore } from "@/store/auth";
import { FooterSettingsPanel } from "@/components/settings/FooterSettingsPanel";
import { HeaderSettingsPanel } from "@/components/settings/HeaderSettingsPanel";
import { HomeSectionsPanel } from "@/components/settings/HomeSectionsPanel";
import { HeroBannerSettingsPanel } from "@/components/settings/HeroBannerSettingsPanel";
import {
    SHOP_FACET_VISIBLE_OPTIONS,
    SHOP_PER_PAGE_OPTIONS,
    SHOP_VIEW_OPTIONS,
    siteSettingsFormSchema,
    validateOgImageFile,
    validateFaviconFile,
    validateLoginLogoFile,
    type SiteSettingsApiResponse,
    type SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type SettingsTabId =
    | "identity"
    | "header"
    | "footer"
    | "home"
    | "shop"
    | "social"
    | "analytics"
    | "pixels"
    | "history";

const SETTINGS_TABS: Array<{
    id: SettingsTabId;
    label: string;
    icon: typeof Globe;
}> = [
    { id: "identity", label: "Identity", icon: Globe },
    { id: "header", label: "Header", icon: Menu },
    { id: "footer", label: "Footer", icon: PanelBottom },
    { id: "home", label: "Home", icon: LayoutTemplate },
    { id: "shop", label: "Shop", icon: LayoutGrid },
    { id: "social", label: "Social", icon: Share2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "pixels", label: "Pixels", icon: Megaphone },
    { id: "history", label: "History", icon: History },
];

type SettingsHistoryItem = {
    id: string;
    action: string;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    note?: string | null;
    created_at: string;
    actor: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    } | null;
};

function formatHistoryValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "on" : "off";
    return String(value);
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

function SettingsSection({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description: string;
    icon?: typeof Globe;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="flex items-start gap-3 border-b border-border/70 bg-linear-to-r from-brand-tint/40 via-background to-background px-5 py-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
                    {Icon ? <Icon className="size-3.5" /> : null}
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight">
                        {title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <div className="space-y-4 p-5">{children}</div>
        </section>
    );
}

// ─── TrackerRow ───────────────────────────────────────────────────────────────

type TrackerRowProps = {
    form: ReturnType<typeof useForm<SiteSettingsFormValues>>;
    label: string;
    enabledField: keyof SiteSettingsFormValues;
    idField: keyof SiteSettingsFormValues;
    idLabel: string;
    idPlaceholder: string;
};

function TrackerRow({
    form,
    label,
    enabledField,
    idField,
    idLabel,
    idPlaceholder,
}: TrackerRowProps) {
    const enabled = form.watch(enabledField) as boolean;
    const idValue = form.watch(idField) as string;
    const isConnected = enabled && !!idValue.trim();

    return (
        <div className="rounded-xl border border-border/70 bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{label}</p>
                <Badge
                    variant="outline"
                    className={
                        isConnected
                            ? "border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                            : "text-muted-foreground"
                    }
                >
                    {isConnected ? "Connected" : "Not connected"}
                </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <FormField
                    control={form.control}
                    name={enabledField}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Status</FormLabel>
                            <Select
                                value={field.value ? "active" : "inactive"}
                                onValueChange={(v) =>
                                    field.onChange(v === "active")
                                }
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={idField}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">{idLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={idPlaceholder}
                                    {...field}
                                    value={field.value as string}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}

// ─── Branding image dropzone ──────────────────────────────────────────────────

function BrandingImageDropzone({
    title,
    description,
    emptyLabel,
    previewUrl,
    fallbackUrl,
    previewClassName,
    imgClassName,
    uploading,
    disabled,
    onPick,
    inputRef,
    onFile,
}: {
    title: string;
    description: string;
    emptyLabel: string;
    previewUrl?: string | null;
    /** Shown when no uploaded media yet (current site default). */
    fallbackUrl?: string | null;
    previewClassName?: string;
    imgClassName?: string;
    uploading?: boolean;
    disabled?: boolean;
    onPick: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFile: (file: File | null) => void;
}) {
    const displayUrl = previewUrl || fallbackUrl || null;
    const hasCustomUpload = Boolean(previewUrl);

    return (
        <div className="overflow-hidden rounded-xl border border-dashed border-border bg-linear-to-br from-muted/40 via-background to-brand-tint/20">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div
                    className={cn(
                        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm",
                        previewClassName,
                    )}
                >
                    {displayUrl ? (
                        <img
                            key={displayUrl}
                            src={displayUrl}
                            alt={`${title} preview`}
                            className={cn(
                                "size-full object-contain p-2",
                                imgClassName,
                            )}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ImagePlus className="size-6" />
                            <span className="text-[10px] font-medium uppercase tracking-wide">
                                {emptyLabel}
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                        {displayUrl && !hasCustomUpload ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Showing current site logo. Upload to replace it.
                            </p>
                        ) : null}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || uploading}
                        onClick={onPick}
                    >
                        <Upload className="size-3.5" />
                        {uploading
                            ? "Uploading…"
                            : hasCustomUpload
                              ? "Replace image"
                              : "Upload image"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Sticky save bar ──────────────────────────────────────────────────────────

function SettingsStickyActions({
    children,
    message,
}: {
    children: ReactNode;
    message?: ReactNode;
}) {
    return (
        <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-sm">{message}</div>
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Default form values ──────────────────────────────────────────────────────

const DEFAULT_VALUES: SiteSettingsFormValues = {
    site_name: "",
    site_title: "",
    site_description: "",
    keywords: "",
    og_title: "",
    og_description: "",
    twitter_title: "",
    twitter_description: "",
    twitter_handle: "",
    google_analytics_id: "",
    google_analytics_enabled: false,
    google_tag_manager_id: "",
    google_tag_manager_enabled: false,
    hotjar_site_id: "",
    hotjar_enabled: false,
    plerdy_site_id: "",
    plerdy_enabled: false,
    google_ads_id: "",
    google_ads_enabled: false,
    tiktok_pixel_id: "",
    tiktok_enabled: false,
    linkedin_partner_id: "",
    linkedin_enabled: false,
    twitter_pixel_id: "",
    twitter_pixel_enabled: false,
    meta_pixel_id: "",
    meta_pixel_enabled: false,
    shop_default_view: "grid4",
    shop_products_per_page: 12,
    shop_categories_visible: 5,
    shop_brands_visible: 6,
    shop_see_all_label: "See all",
    shop_show_less_label: "Show less",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SiteSettingsPage() {
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
    const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(null);
    const [settingsSnapshot, setSettingsSnapshot] = useState<
        SiteSettingsApiResponse["settings"] | null
    >(null);
    const [ogUploading, setOgUploading] = useState(false);
    const [faviconUploading, setFaviconUploading] = useState(false);
    const [loginLogoUploading, setLoginLogoUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTabId>("identity");
    const [history, setHistory] = useState<SettingsHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [clearingHistory, setClearingHistory] = useState(false);

    const ogFileRef = useRef<HTMLInputElement>(null);
    const faviconFileRef = useRef<HTMLInputElement>(null);
    const loginLogoFileRef = useRef<HTMLInputElement>(null);

    const form = useForm<SiteSettingsFormValues>({
        resolver: zodResolver(siteSettingsFormSchema),
        defaultValues: DEFAULT_VALUES,
        mode: "onBlur",
    });

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const data = await apiFetch<SiteSettingsApiResponse>(
                    "/api/dashboard/site-settings",
                    { token },
                );
                if (cancelled) return;
                const s = data.settings;
                setSettingsSnapshot(s);
                setOgImageUrl(s.og_image?.path ?? null);
                setFaviconUrl(s.favicon?.path ?? null);
                setLoginLogoUrl(s.login_logo?.path ?? null);
                form.reset({
                    site_name: s.site_name,
                    site_title: s.site_title,
                    site_description: s.site_description,
                    keywords: s.keywords ?? "",
                    og_title: s.og_title ?? "",
                    og_description: s.og_description ?? "",
                    twitter_title: s.twitter_title ?? "",
                    twitter_description: s.twitter_description ?? "",
                    twitter_handle: s.twitter_handle ?? "",
                    google_analytics_id: s.google_analytics_id ?? "",
                    google_analytics_enabled: s.google_analytics_enabled,
                    google_tag_manager_id: s.google_tag_manager_id ?? "",
                    google_tag_manager_enabled: s.google_tag_manager_enabled,
                    hotjar_site_id: s.hotjar_site_id ?? "",
                    hotjar_enabled: s.hotjar_enabled,
                    plerdy_site_id: s.plerdy_site_id ?? "",
                    plerdy_enabled: s.plerdy_enabled,
                    google_ads_id: s.google_ads_id ?? "",
                    google_ads_enabled: s.google_ads_enabled,
                    tiktok_pixel_id: s.tiktok_pixel_id ?? "",
                    tiktok_enabled: s.tiktok_enabled,
                    linkedin_partner_id: s.linkedin_partner_id ?? "",
                    linkedin_enabled: s.linkedin_enabled,
                    twitter_pixel_id: s.twitter_pixel_id ?? "",
                    twitter_pixel_enabled: s.twitter_pixel_enabled,
                    meta_pixel_id: s.meta_pixel_id ?? "",
                    meta_pixel_enabled: s.meta_pixel_enabled,
                    shop_default_view: s.shop_default_view ?? "grid4",
                    shop_products_per_page: s.shop_products_per_page ?? 12,
                    shop_categories_visible: s.shop_categories_visible ?? 5,
                    shop_brands_visible: s.shop_brands_visible ?? 6,
                    shop_see_all_label: s.shop_see_all_label ?? "See all",
                    shop_show_less_label: s.shop_show_less_label ?? "Show less",
                });
            } catch (err) {
                if (!cancelled)
                    setLoadError(
                        err instanceof ApiError
                            ? err.message
                            : "Failed to load site settings",
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, form]);

    useEffect(() => {
        if (!token || activeTab !== "history") return;
        let cancelled = false;
        void (async () => {
            setHistoryLoading(true);
            setHistoryError(null);
            try {
                const data = await apiFetch<{ history: SettingsHistoryItem[] }>(
                    "/api/dashboard/site-settings/history",
                    { token },
                );
                if (!cancelled) setHistory(data.history);
            } catch (err) {
                if (!cancelled) {
                    setHistoryError(
                        err instanceof ApiError
                            ? err.message
                            : "Failed to load history",
                    );
                }
            } finally {
                if (!cancelled) setHistoryLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, activeTab]);

    async function onClearHistory() {
        if (!token) return;
        const ok = window.confirm(
            "Clear all site settings history? This permanently deletes history rows from the database.",
        );
        if (!ok) return;
        setClearingHistory(true);
        setHistoryError(null);
        try {
            await apiFetch("/api/dashboard/site-settings/history", {
                method: "DELETE",
                token,
            });
            setHistory([]);
            setSaveSuccess("Site settings history cleared");
        } catch (err) {
            setHistoryError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to clear history",
            );
        } finally {
            setClearingHistory(false);
        }
    }

    async function onSubmit(values: SiteSettingsFormValues) {
        if (!token) return;
        setSubmitError(null);
        setSaveSuccess(null);
        try {
            const data = await apiFetch<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings",
                { method: "PATCH", token, body: values },
            );
            const s = data.settings;
            setSettingsSnapshot(s);
            setOgImageUrl(s.og_image?.path ?? null);
            setFaviconUrl(s.favicon?.path ?? null);
            setLoginLogoUrl(s.login_logo?.path ?? null);
            setSaveSuccess("Site settings saved");
        } catch (err) {
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to save site settings",
            );
        }
    }

    async function onOgImageFile(file: File | null) {
        if (!token || !file) return;
        const checked = validateOgImageFile(file);
        if (!checked.ok) {
            setSubmitError(checked.message);
            setSaveSuccess(null);
            if (ogFileRef.current) ogFileRef.current.value = "";
            return;
        }
        setOgUploading(true);
        setSubmitError(null);
        setSaveSuccess(null);
        try {
            const fd = new FormData();
            fd.append("image", file);
            const data = await apiUpload<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings/og-image",
                fd,
                { token },
            );
            setOgImageUrl(data.settings.og_image?.path ?? null);
            setSaveSuccess("OG image updated");
        } catch (err) {
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "OG image upload failed",
            );
        } finally {
            setOgUploading(false);
            if (ogFileRef.current) ogFileRef.current.value = "";
        }
    }

    async function onFaviconFile(file: File | null) {
        if (!token || !file) return;
        const checked = validateFaviconFile(file);
        if (!checked.ok) {
            setSubmitError(checked.message);
            setSaveSuccess(null);
            if (faviconFileRef.current) faviconFileRef.current.value = "";
            return;
        }
        setFaviconUploading(true);
        setSubmitError(null);
        setSaveSuccess(null);
        try {
            const fd = new FormData();
            fd.append("image", file);
            const data = await apiUpload<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings/favicon",
                fd,
                { token },
            );
            setFaviconUrl(data.settings.favicon?.path ?? null);
            if (data.settings.favicon?.path) {
                applyFaviconHref(data.settings.favicon.path);
            }
            invalidateSiteBrandingCache();
            setSaveSuccess("Favicon updated");
        } catch (err) {
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "Favicon upload failed",
            );
        } finally {
            setFaviconUploading(false);
            if (faviconFileRef.current) faviconFileRef.current.value = "";
        }
    }

    async function onLoginLogoFile(file: File | null) {
        if (!token || !file) return;
        const checked = validateLoginLogoFile(file);
        if (!checked.ok) {
            setSubmitError(checked.message);
            setSaveSuccess(null);
            if (loginLogoFileRef.current) loginLogoFileRef.current.value = "";
            return;
        }
        setLoginLogoUploading(true);
        setSubmitError(null);
        setSaveSuccess(null);
        try {
            const fd = new FormData();
            fd.append("image", file);
            const data = await apiUpload<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings/login-logo",
                fd,
                { token },
            );
            setLoginLogoUrl(data.settings.login_logo?.path ?? null);
            invalidateSiteBrandingCache();
            setSaveSuccess("Login logo updated");
        } catch (err) {
            setSubmitError(
                err instanceof ApiError
                    ? err.message
                    : "Login logo upload failed",
            );
        } finally {
            setLoginLogoUploading(false);
            if (loginLogoFileRef.current) loginLogoFileRef.current.value = "";
        }
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-4">
                <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
                <div className="space-y-5">
                    {[1, 2, 3, 4].map((n) => (
                        <div
                            key={n}
                            className="h-48 animate-pulse rounded-2xl bg-muted/60"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
            </div>
        );
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <Link
                            to="/profile"
                            className="hover:text-brand-primary transition-colors"
                        >
                            Profile
                        </Link>
                        <span className="mx-1.5 text-border">/</span>
                        Site settings
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                        Site settings
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Storefront identity, shop catalog, social previews, and
                        tracking. Open this page from your profile menu.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                >
                    Super admin
                </Badge>
            </div>

            <div
                role="tablist"
                aria-label="Settings sections"
                className="flex flex-wrap gap-1 rounded-2xl border border-border/80 bg-muted/40 p-1"
            >
                {SETTINGS_TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                                active
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <tab.icon className="size-3.5 shrink-0" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === "history" ? (
                <SettingsSection
                    title="Change history"
                    description="Tracks site settings saves and OG image uploads. Clear permanently deletes rows from the database."
                    icon={History}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                            {historyLoading
                                ? "Loading…"
                                : `${history.length} entr${history.length === 1 ? "y" : "ies"}`}
                        </p>
                        {history.length > 0 ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={clearingHistory}
                                onClick={() => void onClearHistory()}
                            >
                                {clearingHistory
                                    ? "Clearing…"
                                    : "Clear history"}
                            </Button>
                        ) : null}
                    </div>
                    {historyError ? (
                        <p className="text-sm text-destructive" role="alert">
                            {historyError}
                        </p>
                    ) : null}
                    {historyLoading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Loading history…
                        </p>
                    ) : history.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No history yet. Save settings to start tracking
                            changes.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {history.map((item) => (
                                <li
                                    key={item.id}
                                    className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium capitalize">
                                                {item.action.replaceAll(
                                                    "_",
                                                    " ",
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.actor
                                                    ? `${item.actor.first_name} ${item.actor.last_name}`
                                                    : "System"}{" "}
                                                ·{" "}
                                                {new Date(
                                                    item.created_at,
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            {item.action}
                                        </Badge>
                                    </div>
                                    {item.note ? (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {item.note}
                                        </p>
                                    ) : null}
                                    {item.changes &&
                                    Object.keys(item.changes).length > 0 ? (
                                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                            {Object.entries(item.changes).map(
                                                ([field, diff]) => (
                                                    <li key={field}>
                                                        <span className="font-medium text-foreground">
                                                            {field}
                                                        </span>
                                                        :{" "}
                                                        {formatHistoryValue(
                                                            diff.from,
                                                        )}{" "}
                                                        →{" "}
                                                        {formatHistoryValue(
                                                            diff.to,
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </SettingsSection>
            ) : activeTab === "header" && settingsSnapshot && token ? (
                <SettingsSection
                    title="Header & top bar"
                    description="Contact details, social links, and primary navigation (drag to reorder)."
                    icon={Menu}
                >
                    <HeaderSettingsPanel
                        token={token}
                        settings={settingsSnapshot}
                        onUpdated={setSettingsSnapshot}
                        onError={(m) => {
                            setSubmitError(m);
                            setSaveSuccess(null);
                        }}
                        onSuccess={(m) => {
                            setSaveSuccess(m);
                            setSubmitError(null);
                        }}
                    />
                    {(submitError || saveSuccess) && (
                        <p
                            className={
                                submitError
                                    ? "text-sm text-destructive"
                                    : "text-sm text-brand-primary"
                            }
                            role={submitError ? "alert" : "status"}
                        >
                            {submitError ?? saveSuccess}
                        </p>
                    )}
                </SettingsSection>
            ) : activeTab === "footer" && settingsSnapshot && token ? (
                <SettingsSection
                    title="Footer"
                    description="Support blurb, phone, and footer link columns (drag to reorder)."
                    icon={PanelBottom}
                >
                    <FooterSettingsPanel
                        token={token}
                        settings={settingsSnapshot}
                        onUpdated={setSettingsSnapshot}
                        onError={(m) => {
                            setSubmitError(m);
                            setSaveSuccess(null);
                        }}
                        onSuccess={(m) => {
                            setSaveSuccess(m);
                            setSubmitError(null);
                        }}
                    />
                    {(submitError || saveSuccess) && (
                        <p
                            className={
                                submitError
                                    ? "text-sm text-destructive"
                                    : "text-sm text-brand-primary"
                            }
                            role={submitError ? "alert" : "status"}
                        >
                            {submitError ?? saveSuccess}
                        </p>
                    )}
                </SettingsSection>
            ) : activeTab === "home" && settingsSnapshot && token ? (
                <div className="space-y-5">
                    <SettingsSection
                        title="Hero banner"
                        description="Main and side promo copy, CTAs, and images for the storefront home hero."
                        icon={LayoutTemplate}
                    >
                        <HeroBannerSettingsPanel
                            token={token}
                            onError={(m) => {
                                setSubmitError(m);
                                setSaveSuccess(null);
                            }}
                            onSuccess={(m) => {
                                setSaveSuccess(m);
                                setSubmitError(null);
                            }}
                        />
                        {(submitError || saveSuccess) && (
                            <p
                                className={
                                    submitError
                                        ? "text-sm text-destructive"
                                        : "text-sm text-brand-primary"
                                }
                                role={submitError ? "alert" : "status"}
                            >
                                {submitError ?? saveSuccess}
                            </p>
                        )}
                    </SettingsSection>
                    <SettingsSection
                        title="Home page sections"
                        description="Enable, disable, and reorder storefront home components."
                        icon={LayoutTemplate}
                    >
                        <HomeSectionsPanel
                            token={token}
                            sections={settingsSnapshot.home_sections ?? []}
                            onUpdated={setSettingsSnapshot}
                            onError={(m) => {
                                setSubmitError(m);
                                setSaveSuccess(null);
                            }}
                            onSuccess={(m) => {
                                setSaveSuccess(m);
                                setSubmitError(null);
                            }}
                        />
                        {(submitError || saveSuccess) && (
                            <p
                                className={
                                    submitError
                                        ? "text-sm text-destructive"
                                        : "text-sm text-brand-primary"
                                }
                                role={submitError ? "alert" : "status"}
                            >
                                {submitError ?? saveSuccess}
                            </p>
                        )}
                    </SettingsSection>
                </div>
            ) : (
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-5"
                        noValidate
                    >
                        {activeTab === "identity" ? (
                            <SettingsSection
                                title="Website identity"
                                description="Site name, page title, meta description, keywords, login logo, and favicon."
                                icon={Globe}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="site_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Site name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Niyenin"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Short brand name.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="site_title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Page title
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Niyenin | Retail Market"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Shown in the browser tab and
                                                    search results.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="site_description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Meta description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea rows={3} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                10–500 characters. Shown in
                                                search engine snippets.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="keywords"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Keywords</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="retail, electronics, gadgets, …"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Optional comma-separated
                                                keywords.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <BrandingImageDropzone
                                        title="Login logo"
                                        emptyLabel="Login"
                                        description="Shown on the dashboard sign-in screen. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                                        previewUrl={loginLogoUrl}
                                        fallbackUrl={FALLBACK_LOGIN_LOGO}
                                        previewClassName="h-16 w-56 bg-brand-primary"
                                        uploading={loginLogoUploading}
                                        disabled={form.formState.isSubmitting}
                                        onPick={() =>
                                            loginLogoFileRef.current?.click()
                                        }
                                        inputRef={loginLogoFileRef}
                                        onFile={(file) =>
                                            void onLoginLogoFile(file)
                                        }
                                    />
                                    <BrandingImageDropzone
                                        title="Favicon"
                                        emptyLabel="Favicon"
                                        description="Browser tab icon for the dashboard and storefront. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                                        previewUrl={faviconUrl}
                                        fallbackUrl={FALLBACK_FAVICON}
                                        previewClassName="size-16 bg-muted/40"
                                        uploading={faviconUploading}
                                        disabled={form.formState.isSubmitting}
                                        onPick={() =>
                                            faviconFileRef.current?.click()
                                        }
                                        inputRef={faviconFileRef}
                                        onFile={(file) =>
                                            void onFaviconFile(file)
                                        }
                                    />
                                </div>
                            </SettingsSection>
                        ) : null}

                        {activeTab === "shop" ? (
                            <SettingsSection
                                title="Shop catalog"
                                description="Default product grid, pagination, and sidebar category/brand preview on /shop."
                                icon={LayoutGrid}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="shop_default_view"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Default product view
                                                </FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select view" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {SHOP_VIEW_OPTIONS.map(
                                                            (opt) => (
                                                                <SelectItem
                                                                    key={
                                                                        opt.value
                                                                    }
                                                                    value={
                                                                        opt.value
                                                                    }
                                                                >
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Initial layout when shoppers
                                                    open /shop (they can still
                                                    switch in the toolbar).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shop_products_per_page"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Products per page
                                                </FormLabel>
                                                <Select
                                                    value={String(field.value)}
                                                    onValueChange={(v) =>
                                                        field.onChange(
                                                            Number(v),
                                                        )
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select count" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {SHOP_PER_PAGE_OPTIONS.map(
                                                            (n) => (
                                                                <SelectItem
                                                                    key={n}
                                                                    value={String(
                                                                        n,
                                                                    )}
                                                                >
                                                                    {n} per page
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Pagination size for the shop
                                                    catalog listing.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shop_categories_visible"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Categories shown
                                                </FormLabel>
                                                <Select
                                                    value={String(field.value)}
                                                    onValueChange={(v) =>
                                                        field.onChange(
                                                            Number(v),
                                                        )
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select count" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {SHOP_FACET_VISIBLE_OPTIONS.map(
                                                            (n) => (
                                                                <SelectItem
                                                                    key={n}
                                                                    value={String(
                                                                        n,
                                                                    )}
                                                                >
                                                                    {n}{" "}
                                                                    categories
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    How many categories appear
                                                    before the expand button.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shop_brands_visible"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Brands shown
                                                </FormLabel>
                                                <Select
                                                    value={String(field.value)}
                                                    onValueChange={(v) =>
                                                        field.onChange(
                                                            Number(v),
                                                        )
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select count" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {SHOP_FACET_VISIBLE_OPTIONS.map(
                                                            (n) => (
                                                                <SelectItem
                                                                    key={n}
                                                                    value={String(
                                                                        n,
                                                                    )}
                                                                >
                                                                    {n} brands
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    How many brands appear
                                                    before the expand button.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shop_see_all_label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Expand button label
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="See all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Shown when more
                                                    categories/brands are
                                                    hidden.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="shop_show_less_label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Collapse button label
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Show less"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Shown after the list is
                                                    expanded.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </SettingsSection>
                        ) : null}

                        {activeTab === "social" ? (
                            <SettingsSection
                                title="Social share"
                                description="Open Graph and Twitter/X card metadata for link previews."
                                icon={Share2}
                            >
                                <BrandingImageDropzone
                                    title="Open Graph image"
                                    emptyLabel="OG Image"
                                    description="Optional. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                                    previewUrl={ogImageUrl}
                                    previewClassName="h-24 w-40"
                                    uploading={ogUploading}
                                    disabled={isSubmitting}
                                    inputRef={ogFileRef}
                                    onPick={() => ogFileRef.current?.click()}
                                    onFile={(file) => void onOgImageFile(file)}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="og_title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>OG title</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Same as page title if blank"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="twitter_title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Twitter/X title
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Same as OG title if blank"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="og_description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    OG description
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        rows={3}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="twitter_description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Twitter/X description
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        rows={3}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="twitter_handle"
                                    render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel>
                                                Twitter/X handle
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="@yourhandle"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Include the @ sign, e.g.
                                                @niyenin.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </SettingsSection>
                        ) : null}

                        {activeTab === "analytics" ? (
                            <SettingsSection
                                title="Analytics"
                                description="Enable and configure analytics tracking for the storefront."
                                icon={BarChart3}
                            >
                                <TrackerRow
                                    form={form}
                                    label="Google Analytics (GA4)"
                                    enabledField="google_analytics_enabled"
                                    idField="google_analytics_id"
                                    idLabel="Measurement ID"
                                    idPlaceholder="G-XXXXXXXXXX"
                                />
                                <TrackerRow
                                    form={form}
                                    label="Google Tag Manager"
                                    enabledField="google_tag_manager_enabled"
                                    idField="google_tag_manager_id"
                                    idLabel="Container ID"
                                    idPlaceholder="GTM-XXXXXXX"
                                />
                                <TrackerRow
                                    form={form}
                                    label="Hotjar"
                                    enabledField="hotjar_enabled"
                                    idField="hotjar_site_id"
                                    idLabel="Site ID"
                                    idPlaceholder="1234567"
                                />
                                <TrackerRow
                                    form={form}
                                    label="Plerdy"
                                    enabledField="plerdy_enabled"
                                    idField="plerdy_site_id"
                                    idLabel="Site ID"
                                    idPlaceholder="abcd1234"
                                />
                            </SettingsSection>
                        ) : null}

                        {activeTab === "pixels" ? (
                            <SettingsSection
                                title="Advertising pixels"
                                description="Enable and configure advertising conversion pixels."
                                icon={Megaphone}
                            >
                                <TrackerRow
                                    form={form}
                                    label="Google Ads"
                                    enabledField="google_ads_enabled"
                                    idField="google_ads_id"
                                    idLabel="Conversion ID"
                                    idPlaceholder="AW-123456789"
                                />
                                <TrackerRow
                                    form={form}
                                    label="TikTok Pixel"
                                    enabledField="tiktok_enabled"
                                    idField="tiktok_pixel_id"
                                    idLabel="Pixel ID"
                                    idPlaceholder="ABCDEFGHIJ1234567890"
                                />
                                <TrackerRow
                                    form={form}
                                    label="LinkedIn Insight Tag"
                                    enabledField="linkedin_enabled"
                                    idField="linkedin_partner_id"
                                    idLabel="Partner ID"
                                    idPlaceholder="1234567"
                                />
                                <TrackerRow
                                    form={form}
                                    label="Twitter/X Pixel"
                                    enabledField="twitter_pixel_enabled"
                                    idField="twitter_pixel_id"
                                    idLabel="Pixel ID"
                                    idPlaceholder="abcde12345"
                                />
                                <TrackerRow
                                    form={form}
                                    label="Meta (Facebook) Pixel"
                                    enabledField="meta_pixel_enabled"
                                    idField="meta_pixel_id"
                                    idLabel="Pixel ID"
                                    idPlaceholder="123456789012345"
                                />
                            </SettingsSection>
                        ) : null}

                        <SettingsStickyActions
                            message={
                                submitError ? (
                                    <p
                                        className="text-destructive"
                                        role="alert"
                                    >
                                        {submitError}
                                    </p>
                                ) : saveSuccess ? (
                                    <p
                                        className="text-brand-primary"
                                        role="status"
                                    >
                                        {saveSuccess}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground">
                                        Saving updates the live storefront for
                                        the current tab and all other settings.
                                    </p>
                                )
                            }
                        >
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving…" : "Save settings"}
                            </Button>
                        </SettingsStickyActions>
                    </form>
                </Form>
            )}
        </div>
    );
}
