import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ApiError, apiFetch } from "@/lib/api";
import {
    siteSettingsFormSchema,
    type SiteSettingsApiResponse,
    type SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SETTINGS_TABS } from "./settingsTabs";
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        <Link to="/profile" className="hover:text-brand-primary transition-colors">
                            Profile
                        </Link>
                        <span className="mx-1.5 text-border">/</span>
                        Site settings
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Site settings</h1>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Storefront identity, shop catalog, payments, delivery, messaging, and tracking.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                >
                    Super admin
                </Badge>
            </div>

            <nav
                aria-label="Settings sections"
                className="flex flex-wrap gap-1 rounded-2xl border border-border/80 bg-muted/40 p-1"
            >
                {SETTINGS_TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={`/settings/${tab.path}`}
                        className={({ isActive }) =>
                            cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )
                        }
                    >
                        <tab.icon className="size-3.5 shrink-0" />
                        {tab.label}
                    </NavLink>
                ))}
            </nav>

            {context ? (
                <Outlet context={context} />
            ) : (
                <div className="space-y-5">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-48 animate-pulse rounded-2xl bg-muted/60" />
                    ))}
                </div>
            )}
        </div>
    );
}
