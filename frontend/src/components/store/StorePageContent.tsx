import Link from "next/link";
import type { StorefrontProduct, StorefrontStore } from "@/lib/stores";

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

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

function StoreHero({ store }: { store: StorefrontStore }) {
  const initial = store.shop_name.charAt(0).toUpperCase();

  return (
    <section className="relative overflow-hidden border-b border-border-default bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary text-white">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-48 rounded-full bg-brand-tint/20 blur-3xl" />
      <div className="container relative mx-auto flex flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:gap-10 lg:py-14">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-3xl font-semibold shadow-lg backdrop-blur-sm sm:size-28">
          {store.logo?.path ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote upload URLs
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
            Store
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {store.shop_name}
          </h1>
          {store.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
              {store.description}
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Browse products from this store.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StoreProductCard({ product }: { product: StorefrontProduct }) {
  const href = `/shop/${product.id}`;
  const hasCompare =
    product.compare_at_price != null &&
    product.compare_at_price > product.price;

  return (
    <article className="group overflow-hidden rounded-lg border border-border-default bg-bg-surface transition-[border-color,box-shadow] duration-300 hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,178,7,0.08)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] bg-bg-subtle">
          {product.thumbnail?.path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnail.path}
              alt={product.thumbnail.alt_text ?? product.name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-text-secondary">
              No image
            </div>
          )}
          {product.is_featured ? (
            <span className="absolute left-3 top-3 skew-x-[-8deg] bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="inline-block skew-x-[8deg]">Featured</span>
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
          <h3 className="line-clamp-2 text-[15px] font-semibold text-text-primary transition-colors group-hover:text-brand-primary">
            {product.name}
          </h3>
          {product.short_description ? (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
              {product.short_description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-[16px] font-semibold text-brand-primary">
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

export default function StorePageContent({
  store,
  products,
  total,
}: {
  store: StorefrontStore;
  products: StorefrontProduct[];
  total: number;
}) {
  return (
    <div className="flex-1 bg-bg-base">
      <StoreBreadcrumb name={store.shop_name} />
      <StoreHero store={store} />

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text-primary">
              Products
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {total} item{total === 1 ? "" : "s"} from {store.shop_name}
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
          <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center">
            <p className="text-sm font-medium text-text-primary">
              No products yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              This store hasn&apos;t published products. Check back soon.
            </p>
            <Link
              href="/shop"
              className="mt-4 inline-flex text-sm font-medium text-brand-primary hover:text-brand-hover"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
