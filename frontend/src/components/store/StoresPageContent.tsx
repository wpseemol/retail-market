import Link from "next/link";
import type { StorefrontStore } from "@/lib/stores";

function StoresBreadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full border-b border-border-default bg-bg-subtle/60"
    >
      <div className="container mx-auto px-4 py-3.5 sm:px-6">
        <ol className="m-0 flex list-none items-center gap-2 p-0 text-[13px]">
          <li>
            <Link
              href="/"
              className="text-text-secondary transition-colors hover:text-brand-primary"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-text-secondary">
            &gt;
          </li>
          <li>
            <span
              aria-current="page"
              className="font-medium text-text-primary"
            >
              Stores
            </span>
          </li>
        </ol>
      </div>
    </nav>
  );
}

function StoreCard({ store }: { store: StorefrontStore }) {
  const initial = store.shop_name.charAt(0).toUpperCase();
  const count = store.products_count ?? 0;

  return (
    <article className="group overflow-hidden rounded-lg border border-border-default bg-bg-surface transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,178,7,0.08)]">
      <Link href={`/stores/${store.slug}`} className="block">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-bg-subtle to-brand-tint/40">
          {store.logo?.path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo.path}
              alt={store.logo.alt_text ?? store.shop_name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-text-secondary">
              <span className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-2xl font-semibold text-brand-deep">
                {initial}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h2 className="truncate text-[16px] font-semibold text-text-primary transition-colors group-hover:text-brand-primary">
            {store.shop_name}
          </h2>
          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-text-secondary">
            {store.description?.trim() ||
              "Visit this store to browse products."}
          </p>
          <div className="flex items-center justify-between border-t border-border-default pt-3 text-[12px]">
            <span className="text-text-secondary">
              {count} product{count === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-brand-primary">View store</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function StoresPageContent({
  stores,
  total,
  q,
}: {
  stores: StorefrontStore[];
  total: number;
  q?: string;
}) {
  return (
    <div className="flex-1 bg-bg-base">
      <StoresBreadcrumb />

      <section className="relative overflow-hidden border-b border-border-default bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 size-48 rounded-full bg-brand-tint/20 blur-3xl" />
        <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Explore
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Stores
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
            Discover partner stores and shop their catalogs. Pick a store to see
            its products.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">
              All stores
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {total} store{total === 1 ? "" : "s"}
              {q ? ` matching “${q}”` : ""}
            </p>
          </div>
          <form action="/stores" method="get" className="flex w-full max-w-sm gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search stores…"
              className="h-11 w-full rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-brand-primary"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Search
            </button>
          </form>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center">
            <p className="text-sm font-medium text-text-primary">
              No stores found
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {q
                ? "Try a different search, or browse the full shop."
                : "Published stores will appear here."}
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-hover"
            >
              Browse shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
