import Link from "next/link";
import type {
  StorefrontProduct,
  StorefrontStore,
  StorefrontTheme,
} from "@/lib/stores";
import { formatPrice } from "@/lib/money";

function StoreBreadcrumb({ name }: { name: string }) {
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
            <Link
              href="/stores"
              className="text-text-secondary transition-colors hover:text-brand-primary"
            >
              Stores
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
              {name}
            </span>
          </li>
        </ol>
      </div>
    </nav>
  );
}

function StoreProductCard({
  product,
  muted,
}: {
  product: StorefrontProduct;
  muted?: boolean;
}) {
  const href = `/shop/${product.slug}`;
  const hasCompare =
    product.compare_at_price != null &&
    product.compare_at_price > product.price;
  const banned = Boolean(product.brand_banned);

  return (
    <article
      className={`group overflow-hidden rounded-lg border bg-bg-surface transition-[border-color,box-shadow] duration-300 ${
        banned
          ? "border-dashed border-warning/50 opacity-90"
          : "border-border-default hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,178,7,0.08)]"
      } ${muted ? "bg-bg-subtle/40" : ""}`}
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] bg-bg-subtle">
          {product.thumbnail?.path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnail.path}
              alt={product.thumbnail.alt_text ?? product.name}
              className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                banned ? "grayscale-[40%]" : ""
              }`}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-text-secondary">
              No image
            </div>
          )}
          {product.is_featured && !banned ? (
            <span className="absolute left-3 top-3 skew-x-[-8deg] bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="inline-block skew-x-[8deg]">Featured</span>
            </span>
          ) : null}
          {banned ? (
            <span className="absolute left-3 top-3 rounded bg-[#1A1A1A]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Banned brand
            </span>
          ) : null}
        </div>
        <div className="space-y-1.5 p-4">
          {product.brand_name || product.category?.name ? (
            <p className="truncate text-[12px] text-text-secondary">
              {[product.brand_name, product.category?.name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <h3
            className={`line-clamp-2 text-[15px] font-semibold transition-colors ${
              banned
                ? "text-text-secondary"
                : "text-text-primary group-hover:text-brand-primary"
            }`}
          >
            {product.name}
          </h3>
          {product.short_description ? (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
              {product.short_description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span
              className={`text-[16px] font-semibold ${
                banned ? "text-text-secondary" : "text-brand-primary"
              }`}
            >
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

function ClassicHero({ store }: { store: StorefrontStore }) {
  const initial = store.shop_name.charAt(0).toUpperCase();
  return (
    <section className="relative overflow-hidden border-b border-border-default bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary text-white">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
      <div className="container relative mx-auto flex flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:gap-10 lg:py-14">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-3xl font-semibold shadow-lg backdrop-blur-sm sm:size-28">
          {store.logo?.path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo.path}
              alt={store.logo.alt_text ?? store.shop_name}
              className="size-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Store · Classic
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {store.shop_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
            {store.description?.trim() || "Browse products from this store."}
          </p>
        </div>
      </div>
    </section>
  );
}

function BannerHero({
  store,
  label,
}: {
  store: StorefrontStore;
  label: string;
}) {
  const initial = store.shop_name.charAt(0).toUpperCase();
  return (
    <section className="relative overflow-hidden border-b border-border-default">
      <div className="relative aspect-[21/7] min-h-[180px] w-full bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary">
        {store.banner?.path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.banner.path}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container mx-auto flex items-end gap-4 px-4 pb-6 sm:px-6 sm:pb-8">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/15 text-xl font-semibold text-white shadow-lg backdrop-blur-sm sm:size-20 sm:text-2xl">
              {store.logo?.path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logo.path}
                  alt={store.logo.alt_text ?? store.shop_name}
                  className="size-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 pb-0.5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Store · {label}
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {store.shop_name}
              </h1>
              {store.description ? (
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-white/80">
                  {store.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({
  products,
  cols,
}: {
  products: StorefrontProduct[];
  cols: "3" | "4";
}) {
  const grid =
    cols === "3"
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={grid}>
      {products.map((product) => (
        <StoreProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function EmptyProducts({ storeName }: { storeName: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center">
      <p className="text-sm font-medium text-text-primary">No products yet</p>
      <p className="mt-1 text-sm text-text-secondary">
        {storeName} hasn&apos;t published products. Check back soon.
      </p>
      <Link
        href="/stores"
        className="mt-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-hover"
      >
        Browse stores
      </Link>
    </div>
  );
}

export default function StorePageContent({
  store,
  products,
  featuredProducts = [],
  total,
}: {
  store: StorefrontStore;
  products: StorefrontProduct[];
  featuredProducts?: StorefrontProduct[];
  total: number;
}) {
  const theme: StorefrontTheme = store.storefront_theme ?? "classic";
  const featured =
    featuredProducts.length > 0
      ? featuredProducts
      : products
          .filter((p) => p.is_featured)
          .slice(0, store.featured_products_count ?? 4);

  return (
    <div className="flex-1 bg-bg-base">
      <StoreBreadcrumb name={store.shop_name} />

      {theme === "classic" ? (
        <ClassicHero store={store} />
      ) : (
        <BannerHero
          store={store}
          label={theme === "showcase" ? "Showcase" : "Marketplace"}
        />
      )}

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        {theme === "showcase" && featured.length > 0 ? (
          <section className="mb-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  Featured
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Highlighted products for this store
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <StoreProductCard key={`f-${product.id}`} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">
              {theme === "marketplace" ? "Catalog" : "Products"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {total} item{total === 1 ? "" : "s"} from {store.shop_name}
              {store.products_per_page
                ? ` · showing up to ${store.products_per_page} per page`
                : ""}
            </p>
          </div>
          <Link
            href="/stores"
            className="text-sm font-medium text-brand-primary transition-colors hover:text-brand-hover"
          >
            All stores
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyProducts storeName={store.shop_name} />
        ) : (
          <ProductGrid
            products={products}
            cols={theme === "marketplace" ? "4" : "3"}
          />
        )}
      </div>
    </div>
  );
}
