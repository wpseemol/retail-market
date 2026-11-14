import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, apiFetch } from "@/lib/api";
import {
    siteSettingsFormSchema,
    type SiteSettingsApiResponse,
    type SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
import { useAuthStore } from "@/store/auth";
import { FadeIn, m, useMotionSafe } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SETTINGS_TAB_GROUPS } from "./settingsTabs";
import {
    EMPTY_SITE_SETTINGS_FORM,
    toSiteSettingsFormValues,
    type SiteSettingsOutletContext,
    type SiteSettingsSnapshot,
} from "./settingsContext";

function SettingsPanelSkeleton() {
    return (
        <div
            className="space-y-5"
            aria-busy="true"
            aria-live="polite"
            aria-label="Loading settings section"
        >
            <div className="h-10 w-2/3 max-w-md animate-pulse rounded-xl bg-muted/70" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted/50" />
            {[1, 2, 3].map((n) => (
                <div
                    key={n}
                    className="h-40 animate-pulse rounded-2xl border border-border/40 bg-muted/55"
                    style={{ animationDelay: `${n * 60}ms` }}
                />
            ))}
        </div>
    );
}

export function SiteSettingsLayout() {
    const { token } = useAuthStore();
    const { pathname } = useLocation();
    const { fadeIn, reduce } = useMotionSafe();
    const panelRef = useRef<HTMLDivElement>(null);

    const [settings, setSettings] = useState<SiteSettingsSnapshot | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    /** Brief panel swap animation when Identity → Header (etc.) so height does not jump. */
    const [panelPending, setPanelPending] = useState(false);
    const [panelPath, setPanelPath] = useState(pathname);
    useToastMessages(success, error);

    const form = useForm<SiteSettingsFormValues>({
        resolver: zodResolver(siteSettingsFormSchema),
        defaultValues: EMPTY_SITE_SETTINGS_FORM,
        mode: "onBlur",
    });

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        apiFetch<SiteSettingsApiResponse>("/api/dashboard/site-settings", { token })
            .then((data) => {
                if (cancelled) return;
                setSettings(data.settings);
                form.reset(toSiteSettingsFormValues(data.settings));
            })
            .catch((err) => {
                if (!cancelled) {
                    setLoadError(
                        err instanceof ApiError ? err.message : "Failed to load site settings",
                    );
                }
            });
        return () => {
            cancelled = true;
        };
    }, [token, form]);

    useEffect(() => {
        setError(null);
        setSuccess(null);
    }, [pathname]);

    useEffect(() => {
        if (pathname === panelPath) return;

        setPanelPending(true);

        const scrollRoot =
            panelRef.current?.closest("[data-slot='sidebar-inset']") ??
            panelRef.current?.closest("main") ??
            null;
        if (scrollRoot instanceof HTMLElement) {
            scrollRoot.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        } else if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        }

        const delay = reduce ? 0 : 160;
        const timer = window.setTimeout(() => {
            setPanelPath(pathname);
            setPanelPending(false);
        }, delay);

        return () => window.clearTimeout(timer);
    }, [pathname, panelPath, reduce]);

    const showError = useCallback((m: string) => {
        setError(m);
        setSuccess(null);
    }, []);
    const showSuccess = useCallback((m: string) => {
        setSuccess(m);
        setError(null);
    }, []);

    const context = useMemo<SiteSettingsOutletContext | null>(
        () =>
            token && settings
                ? {
                      token,
                      settings,
                      setSettings,
                      form,
                      error,
                      success,
                      showError,
                      showSuccess,
                  }
                : null,
        [token, settings, form, error, success, showError, showSuccess],
    );

    if (loadError) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col gap-6 pb-4">
            <FadeIn>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Site settings</h1>
                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                            Storefront identity, integrations, tracking, and system backups — shadcn
                            card layout on every section.
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className="border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                    >
                        Super admin
                    </Badge>
                </div>
            </FadeIn>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-56 xl:w-64">
                    {/* Mobile: horizontal group chips */}
                    <nav aria-label="Settings sections" className="space-y-3 lg:hidden">
                        {SETTINGS_TAB_GROUPS.map((group) => (
                            <div
                                key={group.id}
                                className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm"
                            >
                                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {group.tabs.map((tab) => (
                                        <NavLink
                                            key={tab.path}
                                            to={`/settings/${tab.path}`}
                                            className={({ isActive }) =>
                                                cn(
                                                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-brand-tint/70 text-brand-deep shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                                )
                                            }
                                        >
                                            <tab.icon className="size-3.5 shrink-0" />
                                            {tab.label}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Desktop: sticky vertical nav */}
                    <nav
                        aria-label="Settings sections"
                        className="hidden space-y-4 rounded-2xl border border-border/80 bg-card p-3 shadow-sm lg:block"
                    >
                        {SETTINGS_TAB_GROUPS.map((group) => (
                            <div key={group.id}>
                                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.tabs.map((tab) => (
                                        <li key={tab.path}>
                                            <NavLink
                                                to={`/settings/${tab.path}`}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                                                        isActive
                                                            ? "bg-brand-tint/70 text-brand-deep"
                                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                    )
                                                }
                                            >
                                                <tab.icon className="size-3.5 shrink-0" />
                                                <span className="truncate">{tab.label}</span>
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                <div
                    ref={panelRef}
                    className="min-h-[min(70vh,640px)] min-w-0 flex-1"
                >
                    {!context ? (
                        <SettingsPanelSkeleton />
                    ) : panelPending ? (
                        <SettingsPanelSkeleton />
                    ) : (
                        <m.div
                            key={panelPath}
                            initial="hidden"
                            animate="show"
                            variants={fadeIn}
                        >
                            <Outlet context={context} />
                        </m.div>
                    )}
                </div>
            </div>
        </div>
    );
}
