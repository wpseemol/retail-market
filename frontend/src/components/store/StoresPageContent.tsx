import Link from "next/link";
import type { CSSProperties } from "react";
import { DirectoryPage } from "@/components/showcase/DirectoryPage";
import { readableTextOn } from "@/components/showcase/ShowcaseTheme";
import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import type { StorefrontStore } from "@/lib/stores";

type T = Dictionary["showcase"];

function StoreCard({ store, t }: { store: StorefrontStore; t: T }) {
  const count = store.products_count ?? 0;
  const accent = store.accent_color && /^#[0-9a-f]{6}$/i.test(store.accent_color) ? store.accent_color : null;
  const style = accent
    ? ({ "--showcase-accent": accent, "--showcase-on-accent": readableTextOn(accent) } as CSSProperties)
    : undefined;

  return (
    <article
      style={style}
      className="showcase-theme group overflow-hidden rounded-xl border border-border-default bg-bg-surface hover:border-sc-accent"
    >
      <Link href={`/stores/${store.slug}`} className="block">
        <div className="relative aspect-[16/7] bg-gradient-to-br from-sc-accent-deep to-sc-accent">
          {store.banner?.path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.banner.path} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="relative px-4 pb-4">
          <div className="-mt-8 flex size-16 items-center justify-center overflow-hidden rounded-xl border-4 border-bg-surface bg-bg-surface text-xl font-semibold text-sc-accent-text shadow-sm">
            {store.logo?.path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo.path}
                alt={store.logo.alt_text ?? store.shop_name}
                loading="lazy"
                decoding="async"
                className="size-full object-contain"
              />
            ) : (
              store.shop_name.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="mt-3 truncate text-[16px] font-semibold text-text-primary group-hover:text-sc-accent-text">
            {store.shop_name}
          </h2>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-text-secondary">
            {store.tagline || store.description?.trim() || "\u00a0"}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border-default pt-3 text-[12px]">
            <span className="text-text-secondary">
              {count === 1 ? t.productsCountOne : format(t.productsCount, { count })}
            </span>
            <span className="font-medium text-sc-accent-text">{t.viewStore} →</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function StoresPageContent({
  stores,
  total,
  page,
  totalPages,
  q,
  t,
}: {
  stores: StorefrontStore[];
  total: number;
  page: number;
  totalPages: number;
  q?: string;
  t: T;
}) {
  return (
    <DirectoryPage
      t={t}
      path="/stores"
      title={t.storesTitle}
      kicker={t.storesKicker}
      intro={t.storesIntro}
      listTitle={t.allStores}
      searchPlaceholder={t.storesSearch}
      countLabel={total === 1 ? t.storesCountOne : format(t.storesCount, { count: total })}
      q={q}
      emptyTitle={t.noStores}
      emptyHint={t.noStoresHint}
      isEmpty={stores.length === 0}
      pagination={{ page, totalPages }}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} t={t} />
        ))}
      </div>
    </DirectoryPage>
  );
}
