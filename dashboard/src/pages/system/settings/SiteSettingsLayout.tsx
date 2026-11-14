import { useCallback, useEffect, useMemo, useState } from "react";
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
import { FadeUp } from "@/components/motion";
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

export function SiteSettingsLayout() {
    const { token } = useAuthStore();
    const { pathname } = useLocation();

    const [settings, setSettings] = useState<SiteSettingsSnapshot | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
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
            <FadeUp>
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
            </FadeUp>

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

                <div className="min-w-0 flex-1">
                    {context ? (
                        <FadeUp key={pathname}>
                            <Outlet context={context} />
                        </FadeUp>
                    ) : (
                        <div className="space-y-5">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className="h-48 animate-pulse rounded-2xl bg-muted/60"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
