import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Pencil, Plus, Search, Store, Users } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Shop } from "@/lib/shops";
import { shopStatusLabel } from "@/lib/shops";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Store catalog — routes stay under `/stores`. */
export function StoresPage() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const isSuper = user?.role === "super_admin";
    const isVendor = user?.role === "vendor";

    const [stores, setStores] = useState<Shop[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [searchDraft, setSearchDraft] = useState("");

    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                if (isVendor && !isSuper) {
                    const me = await apiFetch<{ shop: Shop | null }>(
                        "/api/dashboard/shops/me",
                        { token },
                    );
                    if (cancelled) return;
                    if (!me.shop) {
                        navigate("/stores/new", { replace: true });
                        return;
                    }
                }

                const params = new URLSearchParams({ limit: "50" });
                if (q.trim()) params.set("q", q.trim());
                const data = await apiFetch<{
                    shops: Shop[];
                    pagination: { total: number };
                }>(`/api/dashboard/shops?${params.toString()}`, { token });
                if (cancelled) return;
                setStores(data.shops);
                setTotal(data.pagination.total);
            } catch (err) {
                if (cancelled) return;
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Failed to load stores",
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [token, q, isVendor, isSuper, navigate]);

    const activeCount = stores.filter((s) => s.status === "active").length;

    return (
        <div className="flex flex-col gap-6">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-deep via-[#0a4a10] to-brand-primary px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 max-w-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                            Marketplace
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Stores
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-white/80">
                            {isSuper
                                ? "Partner storefronts — name, slug, logo, status, and owner."
                                : "Your store profile on the Niyenin marketplace."}
                        </p>
                    </div>
                    <Button
                        asChild
                        size="sm"
                        className="bg-white text-brand-deep hover:bg-white/90"
                    >
                        <Link to="/stores/new">
                            <Plus className="size-3.5" />
                            Create store
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                        <Store className="size-4" />
                    </span>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Total stores
                        </p>
                        <p className="text-xl font-semibold tabular-nums">
                            {loading ? "…" : total}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                        <ArrowUpRight className="size-4" />
                    </span>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Active (page)
                        </p>
                        <p className="text-xl font-semibold tabular-nums">
                            {loading ? "…" : activeCount}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                        <Users className="size-4" />
                    </span>
                    <div>
                        <p className="text-xs text-muted-foreground">Showing</p>
                        <p className="text-xl font-semibold tabular-nums">
                            {loading ? "…" : stores.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Catalog */}
            <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border/70 bg-linear-to-r from-brand-tint/40 via-background to-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
                            <Store className="size-3.5" />
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight">
                                All stores
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Open a card to edit identity, media, and
                                storefront layout
                            </p>
                        </div>
                    </div>
                    {isSuper ? (
                        <form
                            className="flex w-full gap-2 sm:max-w-sm"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setQ(searchDraft.trim());
                            }}
                        >
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchDraft}
                                    onChange={(e) =>
                                        setSearchDraft(e.target.value)
                                    }
                                    placeholder="Search name or slug…"
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">
                                Search
                            </Button>
                        </form>
                    ) : null}
                </div>

                <div className="p-5">
                    {error ? (
                        <p
                            className="mb-4 text-sm text-destructive"
                            role="alert"
                        >
                            {error}
                        </p>
                    ) : null}

                    {loading ? (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                            Loading stores…
                        </p>
                    ) : stores.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center">
                            <Store className="mx-auto size-8 text-muted-foreground/40" />
                            <p className="mt-3 text-sm font-medium">
                                No stores yet
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Create a store to sell on the marketplace.
                            </p>
                            <Button asChild size="sm" className="mt-4">
                                <Link to="/stores/new">
                                    <Plus className="size-3.5" />
                                    Create store
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {stores.map((store) => (
                                <li key={store.id}>
                                    <Link
                                        to={`/stores/${store.slug}`}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-background to-muted/20 transition-all hover:border-brand-primary/30 hover:shadow-md"
                                    >
                                        <div className="relative aspect-video bg-linear-to-br from-brand-deep/90 via-[#0a4a10] to-brand-primary">
                                            {store.banner?.path ? (
                                                <img
                                                    src={store.banner.path}
                                                    alt=""
                                                    className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                                                />
                                            ) : (
                                                <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/10 blur-2xl" />
                                            )}
                                            <div className="absolute bottom-3 left-3 flex size-12 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-sm">
                                                {store.logo?.path ? (
                                                    <img
                                                        src={store.logo.path}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <Store className="size-5 text-white" />
                                                )}
                                            </div>
                                            <Badge
                                                className={cn(
                                                    "absolute right-3 top-3 capitalize shadow-sm",
                                                    store.status === "active"
                                                        ? "bg-white text-brand-deep hover:bg-white"
                                                        : "border-white/25 bg-black/35 text-white hover:bg-black/35",
                                                )}
                                            >
                                                {shopStatusLabel(store.status)}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-1 flex-col gap-3 p-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold tracking-tight">
                                                    {store.shop_name}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    /stores/{store.slug}
                                                </p>
                                            </div>
                                            {isSuper && store.user ? (
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    Owner ·{" "}
                                                    {store.user.first_name}{" "}
                                                    {store.user.last_name}
                                                </p>
                                            ) : null}
                                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary">
                                                    <Pencil className="size-3" />
                                                    Edit store
                                                </span>
                                                <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}

/** @deprecated Use StoresPage */
export const ShopsPage = StoresPage;
