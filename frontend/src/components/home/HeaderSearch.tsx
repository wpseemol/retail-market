"use client";

import {
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatPrice } from "@/lib/money";
import {
    fetchSearchSuggestions,
    fetchSuggestedProducts,
    normalizeSearchQuery,
    readRecentProducts,
    readRecentSearches,
    rememberProduct,
    rememberSearch,
    removeRecentSearch,
    clearRecentSearches,
    SEARCH_MAX_CHARS,
    searchQueryIssue,
    type RecentSearchProduct,
    type SearchSuggestPayload,
    type SearchSuggestProduct,
} from "@/lib/search";
import {
    queryFromImageFileName,
    validateSearchImage,
    type SearchImageCode,
} from "@/lib/validators/searchImage";
import { useI18n } from "@/components/providers/LocaleProvider";
import { format } from "@/i18n/config";

type Variant = "desktop" | "mobile";

type FlatItem = { key: string; href: string };

function subscribeToNothing() {
    return () => {};
}

function Highlight({ text, query }: { text: string; query: string }) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (!query || idx < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-transparent font-semibold text-brand-primary">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
}

function Thumb({
    src,
    label,
    large,
}: {
    src: string | null;
    label: string;
    large?: boolean;
}) {
    const box = large ? "size-16" : "size-10";
    if (!src) {
        return (
            <span
                className={`flex ${box} shrink-0 items-center justify-center rounded-md bg-bg-subtle text-xs font-semibold uppercase text-text-secondary`}
            >
                {label.slice(0, 1)}
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            loading="lazy"
            className={`${box} shrink-0 rounded-md border border-border-default bg-white object-contain p-0.5`}
        />
    );
}

function ImageSearchIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
        >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M21 16l-5.2-5.2a1.5 1.5 0 0 0-2.1 0L7 17" />
        </svg>
    );
}

export default function HeaderSearch({ variant }: { variant: Variant }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const overlayInputRef = useRef<HTMLInputElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const previewRef = useRef<string | null>(null);
    const wasOpen = useRef(false);

    const [query, setQuery] = useState("");
    const [openOnPath, setOpenOnPath] = useState<string | null>(null);
    const mounted = useSyncExternalStore(
        subscribeToNothing,
        () => true,
        () => false,
    );
    const [result, setResult] = useState<{
        q: string;
        data: SearchSuggestPayload | null;
        error: string | null;
    } | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [recentProducts, setRecentProducts] = useState<RecentSearchProduct[]>(
        [],
    );
    const [suggested, setSuggested] = useState<SearchSuggestProduct[] | null>(
        null,
    );
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState<SearchImageCode | null>(null);

    const debounced = useDebouncedValue(query, 300);
    const normalized = normalizeSearchQuery(debounced);
    const live = normalizeSearchQuery(query);
    const issue = searchQueryIssue(query);

    const open = openOnPath === pathname;
    const setOpen = (value: boolean) => {
        if (value) {
            setRecentSearches(readRecentSearches());
            setRecentProducts(readRecentProducts());
        }
        setOpenOnPath(value ? pathname : null);
    };

    const current = live && result?.q === live ? result : null;
    const data = current?.data ?? null;
    const error = current?.error ?? null;
    const loading = Boolean(live) && !current;

    useEffect(() => {
        if (!normalized) return;
        const controller = new AbortController();
        fetchSearchSuggestions(normalized, controller.signal)
            .then((payload) => {
                setResult({ q: normalized, data: payload, error: null });
                setActiveIndex(-1);
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                setResult({
                    q: normalized,
                    data: null,
                    error: err instanceof Error ? err.message : "",
                });
            });
        return () => controller.abort();
    }, [normalized]);

    useEffect(() => {
        if (!open || recentProducts.length > 0) return;
        const controller = new AbortController();
        fetchSuggestedProducts(controller.signal)
            .then(setSuggested)
            .catch(() => {
                if (!controller.signal.aborted) setSuggested([]);
            });
        return () => controller.abort();
    }, [open, recentProducts.length]);

    useEffect(() => {
        if (open && !wasOpen.current) overlayInputRef.current?.focus();
        wasOpen.current = open;
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    function replacePreview(next: string | null) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = next;
        setImagePreview(next);
    }

    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            const node = e.target as Node;
            if (rootRef.current?.contains(node)) return;
            if (panelRef.current?.contains(node)) return;
            setOpenOnPath(null);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    const products = data?.products ?? [];
    const categories = data?.categories ?? [];
    const shops = data?.shops ?? [];
    const hasResults =
        products.length > 0 || categories.length > 0 || shops.length > 0;
    const trimmed = query.trim();
    const browsing = !normalized && !issue;
    const browseProducts =
        recentProducts.length > 0 ? recentProducts : (suggested ?? []);

    const flat: FlatItem[] = browsing
        ? browseProducts.map((p) => ({
              key: `p-${p.id}`,
              href: `/shop/${p.slug}`,
          }))
        : [
              ...products.map((p) => ({
                  key: `p-${p.id}`,
                  href: `/shop/${p.slug}`,
              })),
              ...categories.map((c) => ({
                  key: `c-${c.id}`,
                  href: `/shop?category=${encodeURIComponent(c.slug)}`,
              })),
              ...shops.map((s) => ({
                  key: `s-${s.id}`,
                  href: `/stores/${s.slug}`,
              })),
          ];
    const indexOf = (key: string) => flat.findIndex((f) => f.key === key);
    const activeKey = activeIndex >= 0 ? flat[activeIndex]?.key : undefined;

    function close() {
        setOpen(false);
        inputRef.current?.blur();
    }

    function goToAllResults() {
        const q = normalizeSearchQuery(query);
        if (!q) return;
        setRecentSearches(rememberSearch(q));
        close();
        router.push(`/shop?q=${encodeURIComponent(q)}`);
    }

    function visitProduct(product: SearchSuggestProduct | RecentSearchProduct) {
        setRecentProducts(
            rememberProduct({
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                thumbnail: product.thumbnail,
            }),
        );
        if (normalized) setRecentSearches(rememberSearch(normalized));
        close();
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") {
            close();
            return;
        }
        if (!open || flat.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % flat.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            const target = flat[activeIndex];
            if (!target) return;
            const product = [...browseProducts, ...products].find(
                (item) => target.key === `p-${item.id}`,
            );
            if (product) visitProduct(product);
            else close();
            router.push(target.href);
        }
    }

    async function onImageChosen(file: File | undefined) {
        setOpen(true);
        setImageError(null);
        const checked = await validateSearchImage(file);
        if (!checked.ok) {
            setImageError(checked.code);
            return;
        }
        replacePreview(file ? URL.createObjectURL(file) : null);
        const fromName = normalizeSearchQuery(
            queryFromImageFileName(file?.name ?? "") ?? "",
        );
        if (fromName) setQuery(fromName);
    }

    function clearImage() {
        replacePreview(null);
        setImageError(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    const itemClass = (key: string) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
            activeKey === key ? "bg-bg-subtle" : "hover:bg-bg-subtle"
        }`;

    const isDesktop = variant === "desktop";
    const queryIssue =
        issue === "short"
            ? t.search.typeMore
            : issue === "unsafe"
              ? t.search.unsafe
              : null;

    const fileInput = (
        <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            className="sr-only"
            tabIndex={-1}
            aria-label={t.search.imageSearch}
            onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void onImageChosen(file);
            }}
        />
    );

    const overlay =
        open && mounted
            ? createPortal(
                  <div
                      ref={panelRef}
                      role="dialog"
                      aria-modal="true"
                      aria-label={t.search.placeholderLong}
                      className="fixed inset-0 z-90 flex flex-col bg-bg-base"
                  >
                      <form
                          role="search"
                          onSubmit={(e) => {
                              e.preventDefault();
                              if (activeIndex >= 0 && flat[activeIndex]) {
                                  const target = flat[activeIndex];
                                  const product = [
                                      ...browseProducts,
                                      ...products,
                                  ].find(
                                      (item) => target.key === `p-${item.id}`,
                                  );
                                  if (product) visitProduct(product);
                                  else close();
                                  router.push(target.href);
                                  return;
                              }
                              goToAllResults();
                          }}
                          className="border-b border-border-default bg-bg-base"
                      >
                          <div className="container mx-auto flex items-center gap-2 px-4 py-4 sm:px-6">
                              <div className="flex min-w-0 flex-1 items-center rounded-full border border-brand-primary bg-bg-base px-4 py-2.5">
                                  <input
                                      ref={overlayInputRef}
                                      type="search"
                                      name="q"
                                      value={query}
                                      maxLength={SEARCH_MAX_CHARS}
                                      autoComplete="off"
                                      placeholder={t.search.placeholderLong}
                                      role="combobox"
                                      aria-expanded={open}
                                      aria-controls={listboxId}
                                      aria-autocomplete="list"
                                      aria-invalid={issue !== null}
                                      aria-activedescendant={
                                          activeKey
                                              ? `${listboxId}-${activeKey}`
                                              : undefined
                                      }
                                      onChange={(e) => setQuery(e.target.value)}
                                      onKeyDown={onKeyDown}
                                      className="w-full bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-secondary"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => fileRef.current?.click()}
                                      aria-label={t.search.imageSearch}
                                      title={t.search.imageHint}
                                      className="ml-2 shrink-0 cursor-pointer text-text-secondary hover:text-brand-primary"
                                  >
                                      <ImageSearchIcon />
                                  </button>
                              </div>
                              <button
                                  type="submit"
                                  aria-label={t.search.submit}
                                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-white"
                              >
                                  <Image
                                      src="/icons/search.svg"
                                      alt=""
                                      width={16}
                                      height={16}
                                      aria-hidden="true"
                                      className="brightness-0 invert"
                                  />
                              </button>
                              <button
                                  type="button"
                                  onClick={close}
                                  aria-label={t.search.close}
                                  className="shrink-0 cursor-pointer px-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                              >
                                  {t.search.close}
                              </button>
                          </div>
                          <p className="container mx-auto px-4 pb-3 text-[12px] text-text-secondary sm:px-6">
                              {t.search.imageHint}
                          </p>
                      </form>

                      <div
                          id={listboxId}
                          role="listbox"
                          data-lenis-prevent
                          className="min-h-0 flex-1 overflow-y-auto"
                      >
                          <div className="container mx-auto flex flex-col gap-6 px-4 py-6 sm:px-6">
                              {imagePreview ? (
                                  <div className="flex items-center gap-3 rounded-xl border border-border-default p-3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                          src={imagePreview}
                                          alt=""
                                          className="size-16 rounded-md border border-border-default object-contain"
                                      />
                                      <p className="min-w-0 flex-1 text-sm text-text-secondary">
                                          {t.search.imageReady}
                                      </p>
                                      <button
                                          type="button"
                                          onClick={clearImage}
                                          className="shrink-0 cursor-pointer text-sm font-medium text-brand-primary"
                                      >
                                          {t.search.imageRemove}
                                      </button>
                                  </div>
                              ) : null}

                              {imageError ? (
                                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                      {t.search.imageErrors[imageError]}
                                  </p>
                              ) : null}

                              {queryIssue ? (
                                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                      {queryIssue}
                                  </p>
                              ) : null}

                              {browsing && recentSearches.length > 0 ? (
                                  <section aria-label={t.search.recent}>
                                      <div className="mb-3 flex items-center justify-between">
                                          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                                              {t.search.recent}
                                          </h2>
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  clearRecentSearches();
                                                  setRecentSearches([]);
                                              }}
                                              className="cursor-pointer text-sm text-brand-primary"
                                          >
                                              {t.search.clearRecent}
                                          </button>
                                      </div>
                                      <ul className="flex flex-wrap gap-2">
                                          {recentSearches.map((item) => (
                                              <li
                                                  key={item}
                                                  className="flex items-center rounded-full border border-border-default bg-bg-subtle"
                                              >
                                                  <button
                                                      type="button"
                                                      onClick={() =>
                                                          setQuery(item)
                                                      }
                                                      className="cursor-pointer px-3 py-1.5 text-sm text-text-primary"
                                                  >
                                                      {item}
                                                  </button>
                                                  <button
                                                      type="button"
                                                      aria-label={format(
                                                          t.search.removeRecent,
                                                          { query: item },
                                                      )}
                                                      onClick={() =>
                                                          setRecentSearches(
                                                              removeRecentSearch(
                                                                  item,
                                                              ),
                                                          )
                                                      }
                                                      className="cursor-pointer pr-2 text-text-secondary hover:text-text-primary"
                                                  >
                                                      ×
                                                  </button>
                                              </li>
                                          ))}
                                      </ul>
                                  </section>
                              ) : null}

                              {browsing ? (
                                  <section
                                      aria-label={
                                          recentProducts.length > 0
                                              ? t.search.recentProducts
                                              : t.search.suggested
                                      }
                                  >
                                      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                                          {recentProducts.length > 0
                                              ? t.search.recentProducts
                                              : t.search.suggested}
                                      </h2>
                                      {suggested === null &&
                                      recentProducts.length === 0 ? (
                                          <p className="text-sm text-text-secondary">
                                              {t.search.searching}
                                          </p>
                                      ) : (
                                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                              {browseProducts.map((product) => {
                                                  const key = `p-${product.id}`;
                                                  return (
                                                      <Link
                                                          key={key}
                                                          id={`${listboxId}-${key}`}
                                                          role="option"
                                                          aria-selected={
                                                              activeKey === key
                                                          }
                                                          href={`/shop/${product.slug}`}
                                                          onMouseEnter={() =>
                                                              setActiveIndex(
                                                                  indexOf(key),
                                                              )
                                                          }
                                                          onClick={() =>
                                                              visitProduct(
                                                                  product,
                                                              )
                                                          }
                                                          className={`${itemClass(key)} border border-border-default`}
                                                      >
                                                          <Thumb
                                                              src={
                                                                  product.thumbnail
                                                              }
                                                              label={
                                                                  product.name
                                                              }
                                                              large
                                                          />
                                                          <span className="min-w-0 flex-1">
                                                              <span className="block truncate text-sm text-text-primary">
                                                                  {product.name}
                                                              </span>
                                                              <span className="mt-1 block text-sm font-semibold text-brand-primary">
                                                                  {formatPrice(
                                                                      product.price,
                                                                  )}
                                                              </span>
                                                          </span>
                                                      </Link>
                                                  );
                                              })}
                                          </div>
                                      )}
                                  </section>
                              ) : null}

                              {!browsing && error !== null ? (
                                  <p className="text-sm text-red-600">
                                      {error || t.search.failed}
                                  </p>
                              ) : null}
                              {!browsing && loading && !data ? (
                                  <p className="text-sm text-text-secondary">
                                      {t.search.searching}
                                  </p>
                              ) : null}
                              {!browsing &&
                              !hasResults &&
                              data &&
                              !queryIssue ? (
                                  <p className="text-sm text-text-secondary">
                                      {format(t.search.noResults, {
                                          query: trimmed,
                                      })}
                                  </p>
                              ) : null}

                              {products.length > 0 ? (
                                  <section aria-label={t.search.products}>
                                      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                                          {t.search.products}
                                      </h2>
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                          {products.map((product) => {
                                              const key = `p-${product.id}`;
                                              return (
                                                  <Link
                                                      key={key}
                                                      id={`${listboxId}-${key}`}
                                                      role="option"
                                                      aria-selected={
                                                          activeKey === key
                                                      }
                                                      href={`/shop/${product.slug}`}
                                                      onMouseEnter={() =>
                                                          setActiveIndex(
                                                              indexOf(key),
                                                          )
                                                      }
                                                      onClick={() =>
                                                          visitProduct(product)
                                                      }
                                                      className={`${itemClass(key)} border border-border-default`}
                                                  >
                                                      <Thumb
                                                          src={
                                                              product.thumbnail
                                                          }
                                                          label={product.name}
                                                          large
                                                      />
                                                      <span className="min-w-0 flex-1">
                                                          <span className="block text-sm text-text-primary">
                                                              <Highlight
                                                                  text={
                                                                      product.name
                                                                  }
                                                                  query={
                                                                      trimmed
                                                                  }
                                                              />
                                                          </span>
                                                          <span className="block truncate text-[12px] text-text-secondary">
                                                              {[
                                                                  product.category,
                                                                  product.shop,
                                                              ]
                                                                  .filter(
                                                                      Boolean,
                                                                  )
                                                                  .join(" · ")}
                                                          </span>
                                                          <span className="mt-1 block text-sm font-semibold text-brand-primary">
                                                              {formatPrice(
                                                                  product.price,
                                                              )}
                                                          </span>
                                                      </span>
                                                  </Link>
                                              );
                                          })}
                                      </div>
                                  </section>
                              ) : null}

                              {categories.length > 0 ? (
                                  <section
                                      aria-label={t.search.categories}
                                      className="border-t border-border-default pt-4"
                                  >
                                      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                                          {t.search.categories}
                                      </h2>
                                      {categories.map((category) => {
                                          const key = `c-${category.id}`;
                                          return (
                                              <Link
                                                  key={key}
                                                  id={`${listboxId}-${key}`}
                                                  role="option"
                                                  aria-selected={
                                                      activeKey === key
                                                  }
                                                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                                                  onMouseEnter={() =>
                                                      setActiveIndex(
                                                          indexOf(key),
                                                      )
                                                  }
                                                  onClick={close}
                                                  className={itemClass(key)}
                                              >
                                                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                                                      <Highlight
                                                          text={category.name}
                                                          query={trimmed}
                                                      />
                                                  </span>
                                                  <span className="shrink-0 text-[12px] text-text-secondary">
                                                      {format(
                                                          t.search.itemsCount,
                                                          {
                                                              count: category.products_count,
                                                          },
                                                      )}
                                                  </span>
                                              </Link>
                                          );
                                      })}
                                  </section>
                              ) : null}

                              {shops.length > 0 ? (
                                  <section
                                      aria-label={t.search.shops}
                                      className="border-t border-border-default pt-4"
                                  >
                                      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                                          {t.search.shops}
                                      </h2>
                                      {shops.map((shop) => {
                                          const key = `s-${shop.id}`;
                                          return (
                                              <Link
                                                  key={key}
                                                  id={`${listboxId}-${key}`}
                                                  role="option"
                                                  aria-selected={
                                                      activeKey === key
                                                  }
                                                  href={`/stores/${shop.slug}`}
                                                  onMouseEnter={() =>
                                                      setActiveIndex(
                                                          indexOf(key),
                                                      )
                                                  }
                                                  onClick={close}
                                                  className={itemClass(key)}
                                              >
                                                  <Thumb
                                                      src={shop.logo}
                                                      label={shop.name}
                                                  />
                                                  <span className="min-w-0 flex-1">
                                                      <span className="block truncate text-sm text-text-primary">
                                                          <Highlight
                                                              text={shop.name}
                                                              query={trimmed}
                                                          />
                                                      </span>
                                                      <span className="block text-[12px] text-text-secondary">
                                                          {format(
                                                              t.search
                                                                  .productsCount,
                                                              {
                                                                  count: shop.products_count,
                                                              },
                                                          )}
                                                      </span>
                                                  </span>
                                              </Link>
                                          );
                                      })}
                                  </section>
                              ) : null}

                              {data && data.product_total > 0 ? (
                                  <button
                                      type="button"
                                      onClick={goToAllResults}
                                      className="w-full rounded-lg border border-border-default px-3 py-3 text-center text-sm font-medium text-brand-primary hover:bg-bg-subtle"
                                  >
                                      {format(t.search.seeAll, {
                                          count: data.product_total,
                                          query: trimmed,
                                      })}
                                  </button>
                              ) : null}
                          </div>
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <div
            ref={rootRef}
            className={isDesktop ? "relative w-48 xl:w-64" : "relative w-full"}
        >
            <form
                role="search"
                onSubmit={(e) => {
                    e.preventDefault();
                    setOpen(true);
                    goToAllResults();
                }}
                className={`flex items-center rounded-full border border-border-default bg-bg-base transition-colors focus-within:border-brand-primary ${
                    isDesktop ? "px-3.5 py-1.5" : "bg-bg-surface px-4 py-2"
                }`}
            >
                <input
                    ref={inputRef}
                    type="search"
                    name="q"
                    value={query}
                    maxLength={SEARCH_MAX_CHARS}
                    autoComplete="off"
                    placeholder={
                        isDesktop
                            ? t.search.placeholderShort
                            : t.search.placeholderLong
                    }
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-invalid={issue !== null}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    className={`w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary ${
                        isDesktop ? "text-[13px]" : "text-[14px]"
                    }`}
                />
                {loading ? (
                    <span
                        aria-hidden
                        className="ml-1 size-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"
                    />
                ) : null}
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label={t.search.imageSearch}
                    title={t.search.imageHint}
                    className="ml-1 shrink-0 cursor-pointer text-text-secondary hover:text-brand-primary"
                >
                    <ImageSearchIcon />
                </button>
                <button
                    type="submit"
                    aria-label={t.search.submit}
                    className="ml-1.5 shrink-0 cursor-pointer"
                >
                    <Image
                        src="/icons/search.svg"
                        alt=""
                        width={isDesktop ? 15 : 16}
                        height={isDesktop ? 15 : 16}
                        aria-hidden="true"
                        className="opacity-70 hover:opacity-100"
                    />
                </button>
                {fileInput}
            </form>
            {overlay}
        </div>
    );
}
