import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/money";
import type { StorefrontProduct } from "@/lib/stores";

export function ShowcaseProductCard({
    product,
    t,
    hideBrand,
}: {
    product: StorefrontProduct;
    t: Dictionary["showcase"];
    hideBrand?: boolean;
}) {
    const hasCompare = product.compare_at_price != null && product.compare_at_price > product.price;
    const banned = Boolean(product.brand_banned);
    const meta = [hideBrand ? null : product.brand_name, product.category?.name].filter(Boolean).join(" · ");

    return (
        <article
            className={`group overflow-hidden rounded-xl border bg-bg-surface ${
                banned ? "border-dashed border-warning/50 opacity-90" : "border-border-default hover:border-sc-accent"
            }`}
        >
            <Link href={`/shop/${product.slug}`} className="block">
                <div className="relative aspect-square bg-bg-subtle">
                    {product.thumbnail?.path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={product.thumbnail.path}
                            alt={product.thumbnail.alt_text ?? product.name}
                            loading="lazy"
                            decoding="async"
                            className={`size-full object-contain p-3 ${banned ? "grayscale-[40%]" : ""}`}
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-sm text-text-secondary">{t.noImage}</div>
                    )}
                    {product.is_featured && !banned ? (
                        <span className="absolute left-3 top-3 rounded-full bg-sc-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sc-on-accent">
                            {t.featured}
                        </span>
                    ) : null}
                    {banned ? (
                        <span className="absolute left-3 top-3 rounded bg-[#1A1A1A]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {t.bannedBrand}
                        </span>
                    ) : null}
                </div>
                <div className="space-y-1.5 p-4">
                    {meta ? <p className="truncate text-[12px] text-text-secondary">{meta}</p> : null}
                    <h3
                        className={`line-clamp-2 text-[15px] font-semibold ${
                            banned ? "text-text-secondary" : "text-text-primary group-hover:text-sc-accent-text"
                        }`}
                    >
                        {product.name}
                    </h3>
                    <div className="flex flex-wrap items-baseline gap-2 pt-1">
                        <span className={`text-[16px] font-semibold ${banned ? "text-text-secondary" : "text-sc-accent-text"}`}>
                            {formatPrice(product.price)}
                        </span>
                        {hasCompare ? (
                            <span className="text-[13px] text-text-secondary line-through">
                                {formatPrice(product.compare_at_price!)}
                            </span>
                        ) : null}
                    </div>
                </div>
            </Link>
        </article>
    );
}
