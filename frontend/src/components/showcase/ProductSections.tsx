import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import { STOREFRONT_SORTS, type StorefrontSort } from "@/lib/showcase";
import type { StorefrontProduct } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { ShowcaseProductCard } from "./ShowcaseProductCard";

type T = Dictionary["showcase"];

export function SectionHeading({ title, hint, aside }: { title: string; hint?: string; aside?: ReactNode }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-text-primary">
                    <span aria-hidden="true" className="h-5 w-1 rounded-full bg-sc-accent" />
                    {title}
                </h2>
                {hint ? <p className="mt-1 text-sm text-text-secondary">{hint}</p> : null}
            </div>
            {aside}
        </div>
    );
}

export function FeaturedProducts({
    products,
    name,
    t,
    hideBrand,
}: {
    products: StorefrontProduct[];
    name: string;
    t: T;
    hideBrand?: boolean;
}) {
    if (products.length === 0) return null;
    return (
        <section aria-labelledby="featured-heading" className="rounded-2xl bg-sc-accent-soft p-5 sm:p-7">
            <div id="featured-heading">
                <SectionHeading title={t.featured} hint={format(t.featuredHint, { name })} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {products.map((product) => (
                    <ShowcaseProductCard key={`f-${product.id}`} product={product} t={t} hideBrand={hideBrand} />
                ))}
            </div>
        </section>
    );
}

function pageHref(basePath: string, page: number, sort: StorefrontSort, defaultSort: StorefrontSort) {
    const params = new URLSearchParams();
    if (sort !== defaultSort) params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}#products`;
}

export function ProductGrid({
    products,
    name,
    total,
    page,
    totalPages,
    sort,
    defaultSort = "featured_first",
    basePath,
    t,
    hideBrand,
    aside,
}: {
    products: StorefrontProduct[];
    name: string;
    total: number;
    page: number;
    totalPages: number;
    sort: StorefrontSort;
    defaultSort?: StorefrontSort;
    basePath: string;
    t: T;
    hideBrand?: boolean;
    aside?: ReactNode;
}) {
    return (
        <section id="products" aria-labelledby="products-heading" className="scroll-mt-40">
            <div id="products-heading">
                <SectionHeading title={t.products} hint={format(t.productsHint, { count: total, name })} aside={aside} />
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={t.sortLabel}>
                <span className="mr-1 text-[13px] text-text-secondary">{t.sortLabel}:</span>
                {STOREFRONT_SORTS.map((key) => (
                    <Link
                        key={key}
                        href={pageHref(basePath, 1, key, defaultSort)}
                        scroll={false}
                        aria-current={sort === key ? "true" : undefined}
                        className={cn(
                            "rounded-full border px-3 py-1 text-[13px]",
                            sort === key
                                ? "border-sc-accent bg-sc-accent text-sc-on-accent"
                                : "border-border-default text-text-secondary hover:border-sc-accent hover:text-sc-accent-text",
                        )}
                    >
                        {t.sort[key]}
                    </Link>
                ))}
            </div>

            {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center">
                    <p className="text-sm font-medium text-text-primary">{t.emptyProducts}</p>
                    <p className="mt-1 text-sm text-text-secondary">{format(t.emptyProductsHint, { name })}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                        <ShowcaseProductCard key={product.id} product={product} t={t} hideBrand={hideBrand} />
                    ))}
                </div>
            )}

            {totalPages > 1 ? (
                <nav aria-label={t.pagination} className="mt-8 flex items-center justify-center gap-3 text-sm">
                    {page > 1 ? (
                        <Link
                            href={pageHref(basePath, page - 1, sort, defaultSort)}
                            rel="prev"
                            className="rounded-full border border-border-default px-4 py-1.5 hover:border-sc-accent hover:text-sc-accent-text"
                        >
                            ← {t.prev}
                        </Link>
                    ) : null}
                    <span className="text-text-secondary">{format(t.pageOf, { page, total: totalPages })}</span>
                    {page < totalPages ? (
                        <Link
                            href={pageHref(basePath, page + 1, sort, defaultSort)}
                            rel="next"
                            className="rounded-full border border-border-default px-4 py-1.5 hover:border-sc-accent hover:text-sc-accent-text"
                        >
                            {t.next} →
                        </Link>
                    ) : null}
                </nav>
            ) : null}
        </section>
    );
}
