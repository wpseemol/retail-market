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
    categoryName,
    categoryShopHref,
    type PublicCategory,
} from "@/lib/categories";
import {
    fetchCategoryCovers,
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

const CATEGORY_TILES = 10;

function subscribeToNothing() {
    return () => {};
}

function placeUnderSearch(
    panel: HTMLDivElement | null,
    root: HTMLDivElement | null,
) {
    if (!panel || !root) return;
    const rect = root.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 8}px`;
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
    const box = large ? "size-[72px]" : "size-10";
    if (!src) {
        return (
            <span
                className={`flex ${box} shrink-0 items-center justify-center rounded-md bg-bg-subtle text-sm font-semibold uppercase text-text-secondary`}
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
            className={`${box} shrink-0 rounded-md bg-bg-subtle object-contain`}
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

export default function HeaderSearch({
    variant,
    categories = [],
}: {
    variant: Variant;
    categories?: PublicCategory[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { locale, t } = useI18n();
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const previewRef = useRef<string | null>(null);
    const ignoreOutsideRef = useRef(false);

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
    const [tilePage, setTilePage] = useState(0);
    const [covers, setCovers] = useState<Record<string, string>>({});

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
        if (!open) return;
        const controller = new AbortController();
        fetchCategoryCovers(controller.signal)
            .then((next) => {
                if (!controller.signal.aborted) setCovers(next);
            })
            .catch(() => {
                if (!controller.signal.aborted) setCovers({});
            });
        return () => controller.abort();
    }, [open]);

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
        if (!open) return;
        const place = () => placeUnderSearch(panelRef.current, rootRef.current);
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
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
            const inside =
                rootRef.current?.contains(node) ||
                panelRef.current?.contains(node);
            if (ignoreOutsideRef.current) {
                ignoreOutsideRef.current = false;
                if (!inside) return;
            }
            if (inside) return;
            setOpenOnPath(null);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    const products = data?.products ?? [];
    const matchedCategories = data?.categories ?? [];
    const shops = data?.shops ?? [];
    const hasResults =
        products.length > 0 ||
        matchedCategories.length > 0 ||
        shops.length > 0;
    const trimmed = query.trim();
    const browsing = !normalized && !issue;
    const browseProducts =
        recentProducts.length > 0 ? recentProducts : (suggested ?? []);
    const categoryPages = Math.max(
        1,
        Math.ceil(categories.length / CATEGORY_TILES),
    );
    const visibleCategories = categories.slice(
        tilePage * CATEGORY_TILES,
        tilePage * CATEGORY_TILES + CATEGORY_TILES,
    );

    const flat: FlatItem[] = browsing
        ? [
              ...browseProducts.map((p) => ({
                  key: `p-${p.id}`,
                  href: `/shop/${p.slug}`,
              })),
              ...visibleCategories.map((c) => ({
                  key: `c-${c.id}`,
                  href: categoryShopHref(c.slug),
              })),
          ]
        : [
              ...products.map((p) => ({
                  key: `p-${p.id}`,
                  href: `/shop/${p.slug}`,
              })),
              ...matchedCategories.map((c) => ({
                  key: `c-${c.id}`,
                  href: categoryShopHref(c.slug),
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

    function openImagePicker() {
        ignoreOutsideRef.current = true;
        setOpen(true);
        setImageError(null);
        fileRef.current?.click();
    }

    async function onImageChosen(file: File | undefined) {
        setOpen(true);
        setImageError(null);
        const checked = await validateSearchImage(file);
        if (!checked.ok) {
            replacePreview(null);
            setImageError(checked.code);
            return;
        }
        replacePreview(file ? URL.createObjectURL(file) : null);
        const fromName = normalizeSearchQuery(
            queryFromImageFileName(file?.name ?? "") ?? "",
        );
        if (fromName) setQuery(fromName);
        inputRef.current?.focus();
    }

    function clearImage() {
        replacePreview(null);
        setImageError(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    const itemClass = (key: string) =>
        `block w-full truncate rounded px-1 py-1 text-left text-sm transition-colors ${
            activeKey === key
                ? "bg-bg-subtle text-brand-primary"
                : "text-text-secondary hover:text-brand-primary"
        }`;

    const isDesktop = variant === "desktop";
    const queryIssue =
        issue === "short"
            ? t.search.typeMore
            : issue === "unsafe"
              ? t.search.unsafe
              : null;

    const discoverLabel =
        recentProducts.length > 0 ? t.search.recentProducts : t.search.discover;

    const panel =
        open && mounted
            ? createPortal(
                  <div
                      ref={(node) => {
                          panelRef.current = node;
                          placeUnderSearch(node, rootRef.current);
                      }}
                      role="dialog"
                      aria-label={t.search.placeholderLong}
                      data-lenis-prevent
                      className="fixed left-[10vw] z-[80] flex max-h-[70vh] w-[80vw] flex-col overflow-hidden rounded-md border border-border-default bg-bg-base shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  >
                      <div className="flex items-start justify-between gap-3 px-5 pt-4">
                          <h2 className="text-sm font-semibold text-text-primary">
                              {browsing && recentSearches.length > 0
                                  ? t.search.history
                                  : browsing
                                    ? discoverLabel
                                    : null}
                          </h2>
                          <div className="flex shrink-0 items-center gap-3">
                              {browsing && recentSearches.length > 0 ? (
                                  <button
                                      type="button"
                                      onClick={() => {
                                          clearRecentSearches();
                                          setRecentSearches([]);
                                      }}
                                      className="cursor-pointer text-sm text-brand-primary"
                                  >
                                      {t.search.clearAll}
                                  </button>
                              ) : null}
                              <button
                                  type="button"
                                  onClick={close}
                                  aria-label={t.search.close}
                                  className="cursor-pointer text-lg leading-none text-text-secondary hover:text-text-primary"
                              >
                                  ×
                              </button>
                          </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                          {browsing && recentSearches.length > 0 ? (
                              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                  {recentSearches.map((item) => (
                                      <li
                                          key={item}
                                          className="flex items-center gap-1"
                                      >
                                          <button
                                              type="button"
                                              onClick={() => setQuery(item)}
                                              className="cursor-pointer text-sm text-text-secondary hover:text-brand-primary"
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
                                                      removeRecentSearch(item),
                                                  )
                                              }
                                              className="cursor-pointer text-text-secondary hover:text-text-primary"
                                          >
                                              ×
                                          </button>
                                      </li>
                                  ))}
                              </ul>
                          ) : null}

                          {imagePreview ? (
                              <div className="mt-3 flex items-center gap-3 rounded-md border border-border-default p-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                      src={imagePreview}
                                      alt=""
                                      className="size-14 rounded-md bg-bg-subtle object-contain"
                                  />
                                  <p className="min-w-0 flex-1 text-sm text-text-secondary">
                                      {live ? trimmed : t.search.imageReady}
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
                              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                  {t.search.imageErrors[imageError]}
                              </p>
                          ) : null}

                          {queryIssue ? (
                              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                  {queryIssue}
                              </p>
                          ) : null}

                          {browsing ? (
                              <div className="mt-4 flex flex-col gap-5 sm:flex-row">
                                  <section
                                      aria-label={discoverLabel}
                                      className="w-full shrink-0 sm:w-52 sm:border-r sm:border-border-default sm:pr-4"
                                  >
                                      {recentSearches.length > 0 ? (
                                          <h3 className="mb-2 text-sm font-semibold text-text-primary">
                                              {discoverLabel}
                                          </h3>
                                      ) : null}
                                      {suggested === null &&
                                      recentProducts.length === 0 ? (
                                          <p className="text-sm text-text-secondary">
                                              {t.search.searching}
                                          </p>
                                      ) : (
                                          <ul
                                              id={listboxId}
                                              role="listbox"
                                              className="max-h-72 space-y-0.5 overflow-y-auto"
                                          >
                                              {browseProducts.map((product) => {
                                                  const key = `p-${product.id}`;
                                                  return (
                                                      <li key={key}>
                                                          <Link
                                                              id={`${listboxId}-${key}`}
                                                              role="option"
                                                              aria-selected={
                                                                  activeKey ===
                                                                  key
                                                              }
                                                              href={`/shop/${product.slug}`}
                                                              onMouseEnter={() =>
                                                                  setActiveIndex(
                                                                      indexOf(
                                                                          key,
                                                                      ),
                                                                  )
                                                              }
                                                              onClick={() =>
                                                                  visitProduct(
                                                                      product,
                                                                  )
                                                              }
                                                              className={itemClass(
                                                                  key,
                                                              )}
                                                          >
                                                              {product.name}
                                                          </Link>
                                                      </li>
                                                  );
                                              })}
                                          </ul>
                                      )}
                                  </section>

                                  <section
                                      aria-label={t.search.categories}
                                      className="min-w-0 flex-1"
                                  >
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                          <h3 className="text-sm font-semibold text-text-primary">
                                              {t.search.categories}
                                          </h3>
                                          {categories.length > CATEGORY_TILES ? (
                                              <button
                                                  type="button"
                                                  onClick={() =>
                                                      setTilePage(
                                                          (page) =>
                                                              (page + 1) %
                                                              categoryPages,
                                                      )
                                                  }
                                                  className="cursor-pointer text-sm text-brand-primary"
                                              >
                                                  {t.search.other}
                                              </button>
                                          ) : (
                                              <Link
                                                  href="/shop"
                                                  onClick={close}
                                                  className="text-sm text-brand-primary"
                                              >
                                                  {t.search.other}
                                              </Link>
                                          )}
                                      </div>
                                      {visibleCategories.length === 0 ? (
                                          <p className="text-sm text-text-secondary">
                                              {t.search.searching}
                                          </p>
                                      ) : (
                                          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                                              {visibleCategories.map(
                                                  (category) => {
                                                      const key = `c-${category.id}`;
                                                      const name = categoryName(
                                                          category,
                                                          locale,
                                                      );
                                                      return (
                                                          <li key={key}>
                                                              <Link
                                                                  id={`${listboxId}-${key}`}
                                                                  role="option"
                                                                  aria-selected={
                                                                      activeKey ===
                                                                      key
                                                                  }
                                                                  href={categoryShopHref(
                                                                      category.slug,
                                                                  )}
                                                                  onMouseEnter={() =>
                                                                      setActiveIndex(
                                                                          indexOf(
                                                                              key,
                                                                          ),
                                                                      )
                                                                  }
                                                                  onClick={close}
                                                                  className={`flex flex-col items-center gap-2 rounded-md px-1 py-1 text-center ${
                                                                      activeKey ===
                                                                      key
                                                                          ? "bg-bg-subtle"
                                                                          : "hover:bg-bg-subtle"
                                                                  }`}
                                                              >
                                                                  <Thumb
                                                                      src={
                                                                          category
                                                                              .image
                                                                              ?.path ??
                                                                          covers[
                                                                              category
                                                                                  .slug
                                                                          ] ??
                                                                          null
                                                                      }
                                                                      label={
                                                                          name
                                                                      }
                                                                      large
                                                                  />
                                                                  <span className="line-clamp-2 text-xs text-text-primary">
                                                                      {name}
                                                                  </span>
                                                              </Link>
                                                          </li>
                                                      );
                                                  },
                                              )}
                                          </ul>
                                      )}
                                  </section>
                              </div>
                          ) : null}

                          {!browsing && error !== null ? (
                              <p className="mt-3 text-sm text-red-600">
                                  {error || t.search.failed}
                              </p>
                          ) : null}
                          {!browsing && loading && !data ? (
                              <p className="mt-3 text-sm text-text-secondary">
                                  {t.search.searching}
                              </p>
                          ) : null}
                          {!browsing && !hasResults && data && !queryIssue ? (
                              <p className="mt-3 text-sm text-text-secondary">
                                  {format(t.search.noResults, {
                                      query: trimmed,
                                  })}
                              </p>
                          ) : null}

                          {!browsing && hasResults ? (
                              <div
                                  id={listboxId}
                                  role="listbox"
                                  className="mt-4 flex flex-col gap-5 sm:flex-row"
                              >
                                  {matchedCategories.length > 0 ||
                                  shops.length > 0 ? (
                                      <div className="w-full shrink-0 space-y-4 sm:w-52 sm:border-r sm:border-border-default sm:pr-4">
                                          {matchedCategories.length > 0 ? (
                                              <section
                                                  aria-label={
                                                      t.search.categories
                                                  }
                                              >
                                                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                                                      {t.search.categories}
                                                  </h3>
                                                  <ul className="space-y-0.5">
                                                      {matchedCategories.map(
                                                          (category) => {
                                                              const key = `c-${category.id}`;
                                                              return (
                                                                  <li key={key}>
                                                                      <Link
                                                                          id={`${listboxId}-${key}`}
                                                                          role="option"
                                                                          aria-selected={
                                                                              activeKey ===
                                                                              key
                                                                          }
                                                                          href={categoryShopHref(
                                                                              category.slug,
                                                                          )}
                                                                          onMouseEnter={() =>
                                                                              setActiveIndex(
                                                                                  indexOf(
                                                                                      key,
                                                                                  ),
                                                                              )
                                                                          }
                                                                          onClick={
                                                                              close
                                                                          }
                                                                          className={itemClass(
                                                                              key,
                                                                          )}
                                                                      >
                                                                          <Highlight
                                                                              text={
                                                                                  category.name
                                                                              }
                                                                              query={
                                                                                  trimmed
                                                                              }
                                                                          />
                                                                      </Link>
                                                                  </li>
                                                              );
                                                          },
                                                      )}
                                                  </ul>
                                              </section>
                                          ) : null}
                                          {shops.length > 0 ? (
                                              <section
                                                  aria-label={t.search.shops}
                                              >
                                                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                                                      {t.search.shops}
                                                  </h3>
                                                  <ul className="space-y-0.5">
                                                      {shops.map((shop) => {
                                                          const key = `s-${shop.id}`;
                                                          return (
                                                              <li key={key}>
                                                                  <Link
                                                                      id={`${listboxId}-${key}`}
                                                                      role="option"
                                                                      aria-selected={
                                                                          activeKey ===
                                                                          key
                                                                      }
                                                                      href={`/stores/${shop.slug}`}
                                                                      onMouseEnter={() =>
                                                                          setActiveIndex(
                                                                              indexOf(
                                                                                  key,
                                                                              ),
                                                                          )
                                                                      }
                                                                      onClick={
                                                                          close
                                                                      }
                                                                      className={itemClass(
                                                                          key,
                                                                      )}
                                                                  >
                                                                      <Highlight
                                                                          text={
                                                                              shop.name
                                                                          }
                                                                          query={
                                                                              trimmed
                                                                          }
                                                                      />
                                                                  </Link>
                                                              </li>
                                                          );
                                                      })}
                                                  </ul>
                                              </section>
                                          ) : null}
                                      </div>
                                  ) : null}

                                  {products.length > 0 ? (
                                      <section
                                          aria-label={t.search.products}
                                          className="min-w-0 flex-1"
                                      >
                                          <div className="mb-3 flex items-center justify-between gap-3">
                                              <h3 className="text-sm font-semibold text-text-primary">
                                                  {t.search.products}
                                              </h3>
                                              {data && data.product_total > 0 ? (
                                                  <button
                                                      type="button"
                                                      onClick={goToAllResults}
                                                      className="cursor-pointer text-sm text-brand-primary"
                                                  >
                                                      {format(t.search.seeAll, {
                                                          count: data.product_total,
                                                          query: trimmed,
                                                      })}
                                                  </button>
                                              ) : null}
                                          </div>
                                          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                              {products.map((product) => {
                                                  const key = `p-${product.id}`;
                                                  return (
                                                      <li key={key}>
                                                          <Link
                                                              id={`${listboxId}-${key}`}
                                                              role="option"
                                                              aria-selected={
                                                                  activeKey ===
                                                                  key
                                                              }
                                                              href={`/shop/${product.slug}`}
                                                              onMouseEnter={() =>
                                                                  setActiveIndex(
                                                                      indexOf(
                                                                          key,
                                                                      ),
                                                                  )
                                                              }
                                                              onClick={() =>
                                                                  visitProduct(
                                                                      product,
                                                                  )
                                                              }
                                                              className={`flex flex-col items-center gap-2 rounded-md px-1 py-1 text-center ${
                                                                  activeKey ===
                                                                  key
                                                                      ? "bg-bg-subtle"
                                                                      : "hover:bg-bg-subtle"
                                                              }`}
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
                                                              <span className="line-clamp-2 text-xs text-text-primary">
                                                                  <Highlight
                                                                      text={
                                                                          product.name
                                                                      }
                                                                      query={
                                                                          trimmed
                                                                      }
                                                                  />
                                                              </span>
                                                              <span className="text-xs font-semibold text-brand-primary">
                                                                  {formatPrice(
                                                                      product.price,
                                                                  )}
                                                              </span>
                                                          </Link>
                                                      </li>
                                                  );
                                              })}
                                          </ul>
                                      </section>
                                  ) : null}
                              </div>
                          ) : null}
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
                    aria-activedescendant={
                        activeKey ? `${listboxId}-${activeKey}` : undefined
                    }
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
                    onClick={openImagePicker}
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
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={t.search.imageSearch}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        void onImageChosen(file);
                    }}
                />
            </form>
            {panel}
        </div>
    );
}
