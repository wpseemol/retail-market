import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import { ShowcaseBreadcrumb } from "./ShowcaseBreadcrumb";

type T = Dictionary["showcase"];

/** Shared shell for the `/stores` and `/brands` directories. */
export function DirectoryPage({
    t,
    path,
    title,
    kicker,
    intro,
    listTitle,
    searchPlaceholder,
    countLabel,
    q,
    emptyTitle,
    emptyHint,
    isEmpty,
    toolbar,
    children,
    pagination,
}: {
    t: T;
    path: string;
    title: string;
    kicker: string;
    intro: string;
    listTitle: string;
    searchPlaceholder: string;
    countLabel: string;
    q?: string;
    emptyTitle: string;
    emptyHint: string;
    isEmpty: boolean;
    toolbar?: ReactNode;
    children: ReactNode;
    pagination?: { page: number; totalPages: number };
}) {
    const pageHref = (page: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (page > 1) params.set("page", String(page));
        const qs = params.toString();
        return `${path}${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="showcase-theme flex-1 bg-bg-base">
            <ShowcaseBreadcrumb label={t.breadcrumb} items={[{ name: t.home, href: "/" }, { name: title }]} />

            <section className="relative overflow-hidden border-b border-border-default bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary text-white dark:from-[#0b2a0e] dark:via-[#0f3a13] dark:to-[#167a1b]">
                <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
                <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{kicker}</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-[15px]">{intro}</p>
                </div>
            </section>

            <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-text-primary">{listTitle}</h2>
                        <p className="mt-1 text-sm text-text-secondary">
                            {countLabel}
                            {q ? ` ${format(t.matching, { q })}` : ""}
                        </p>
                    </div>
                    <form action={path} method="get" role="search" className="flex w-full max-w-sm gap-2">
                        <input
                            type="search"
                            name="q"
                            defaultValue={q ?? ""}
                            maxLength={100}
                            aria-label={searchPlaceholder}
                            placeholder={searchPlaceholder}
                            className="h-11 w-full rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary outline-none placeholder:text-text-secondary/70 focus:border-brand-primary"
                        />
                        <button
                            type="submit"
                            className="h-11 shrink-0 rounded bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover"
                        >
                            {t.search}
                        </button>
                    </form>
                </div>

                {toolbar}

                {isEmpty ? (
                    <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center">
                        <p className="text-sm font-medium text-text-primary">{emptyTitle}</p>
                        <p className="mt-1 text-sm text-text-secondary">{q ? t.noResultsHint : emptyHint}</p>
                        <Link
                            href="/shop"
                            className="mt-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-hover"
                        >
                            {t.browseShop}
                        </Link>
                    </div>
                ) : (
                    children
                )}

                {pagination && pagination.totalPages > 1 ? (
                    <nav aria-label={t.pagination} className="mt-8 flex items-center justify-center gap-3 text-sm">
                        {pagination.page > 1 ? (
                            <Link
                                href={pageHref(pagination.page - 1)}
                                rel="prev"
                                className="rounded-full border border-border-default px-4 py-1.5 hover:border-brand-primary"
                            >
                                ← {t.prev}
                            </Link>
                        ) : null}
                        <span className="text-text-secondary">
                            {format(t.pageOf, { page: pagination.page, total: pagination.totalPages })}
                        </span>
                        {pagination.page < pagination.totalPages ? (
                            <Link
                                href={pageHref(pagination.page + 1)}
                                rel="next"
                                className="rounded-full border border-border-default px-4 py-1.5 hover:border-brand-primary"
                            >
                                {t.next} →
                            </Link>
                        ) : null}
                    </nav>
                ) : null}
            </div>
        </div>
    );
}
