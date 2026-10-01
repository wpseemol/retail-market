"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatPrice } from "@/lib/money";
import {
  fetchSearchSuggestions,
  normalizeSearchQuery,
  SEARCH_MAX_CHARS,
  type SearchSuggestPayload,
} from "@/lib/search";
import { useI18n } from "@/components/providers/LocaleProvider";
import { format } from "@/i18n/config";

type Variant = "desktop" | "mobile";

type FlatItem = { key: string; href: string };

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

function Thumb({ src, label }: { src: string | null; label: string }) {
  if (!src) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bg-subtle text-xs font-semibold uppercase text-text-secondary">
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
      className="size-10 shrink-0 rounded-md border border-border-default bg-white object-contain p-0.5"
    />
  );
}

export default function HeaderSearch({ variant }: { variant: Variant }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const [result, setResult] = useState<{
    q: string;
    data: SearchSuggestPayload | null;
    error: string | null;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounced = useDebouncedValue(query, 300);
  const normalized = normalizeSearchQuery(debounced);

  // Closes automatically after navigation because the path no longer matches.
  const open = openOnPath === pathname;
  const setOpen = (value: boolean) => setOpenOnPath(value ? pathname : null);

  const current = normalized && result?.q === normalized ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const loading = Boolean(normalized) && !current;

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
          // Empty string → generic localized message at render time.
          error: err instanceof Error ? err.message : "",
        });
      });
    return () => controller.abort();
  }, [normalized]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenOnPath(null);
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
  const showPanel = open && trimmed.length >= 2;

  const flat: FlatItem[] = [
    ...products.map((p) => ({ key: `p-${p.id}`, href: `/shop/${p.slug}` })),
    ...categories.map((c) => ({
      key: `c-${c.id}`,
      href: `/shop?category=${encodeURIComponent(c.slug)}`,
    })),
    ...shops.map((s) => ({ key: `s-${s.id}`, href: `/stores/${s.slug}` })),
  ];
  const indexOf = (key: string) => flat.findIndex((f) => f.key === key);
  const activeKey = activeIndex >= 0 ? flat[activeIndex]?.key : undefined;

  function goToAllResults() {
    const q = normalizeSearchQuery(query);
    if (!q) return;
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showPanel || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const target = flat[activeIndex];
      if (target) {
        setOpen(false);
        router.push(target.href);
      }
    }
  }

  const itemClass = (key: string) =>
    `flex items-center gap-3 px-3 py-2 text-left transition-colors ${
      activeKey === key ? "bg-bg-subtle" : "hover:bg-bg-subtle"
    }`;

  const isDesktop = variant === "desktop";

  return (
    <div
      ref={rootRef}
      className={isDesktop ? "relative w-48 xl:w-64" : "relative w-full"}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex >= 0 && flat[activeIndex]) {
            setOpen(false);
            router.push(flat[activeIndex].href);
            return;
          }
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
            isDesktop ? t.search.placeholderShort : t.search.placeholderLong
          }
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeKey ? `${listboxId}-${activeKey}` : undefined}
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
      </form>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          data-lenis-prevent
          className={`absolute top-full z-60 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border-default bg-bg-base shadow-[0_12px_32px_rgba(0,0,0,0.14)] ${
            isDesktop ? "right-0 w-[26rem]" : "left-0 right-0"
          }`}
        >
          {error !== null ? (
            <p className="px-4 py-3 text-sm text-red-600">
              {error || t.search.failed}
            </p>
          ) : loading && !data ? (
            <p className="px-4 py-3 text-sm text-text-secondary">
              {t.search.searching}
            </p>
          ) : !hasResults && data ? (
            <p className="px-4 py-3 text-sm text-text-secondary">
              {format(t.search.noResults, { query: trimmed })}
            </p>
          ) : null}

          {products.length > 0 ? (
            <section aria-label={t.search.products} className="py-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {t.search.products}
              </p>
              {products.map((p) => {
                const key = `p-${p.id}`;
                return (
                  <Link
                    key={key}
                    id={`${listboxId}-${key}`}
                    role="option"
                    aria-selected={activeKey === key}
                    href={`/shop/${p.slug}`}
                    onMouseEnter={() => setActiveIndex(indexOf(key))}
                    onClick={() => setOpen(false)}
                    className={itemClass(key)}
                  >
                    <Thumb src={p.thumbnail} label={p.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-primary">
                        <Highlight text={p.name} query={trimmed} />
                      </span>
                      <span className="block truncate text-[11px] text-text-secondary">
                        {[p.category, p.shop].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-brand-primary">
                      {formatPrice(p.price)}
                    </span>
                  </Link>
                );
              })}
            </section>
          ) : null}

          {categories.length > 0 ? (
            <section
              aria-label={t.search.categories}
              className="border-t border-border-default py-1"
            >
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {t.search.categories}
              </p>
              {categories.map((c) => {
                const key = `c-${c.id}`;
                return (
                  <Link
                    key={key}
                    id={`${listboxId}-${key}`}
                    role="option"
                    aria-selected={activeKey === key}
                    href={`/shop?category=${encodeURIComponent(c.slug)}`}
                    onMouseEnter={() => setActiveIndex(indexOf(key))}
                    onClick={() => setOpen(false)}
                    className={itemClass(key)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-primary">
                        <Highlight text={c.name} query={trimmed} />
                      </span>
                      {c.parent ? (
                        <span className="block truncate text-[11px] text-text-secondary">
                          {format(t.search.inParent, { parent: c.parent })}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] text-text-secondary">
                      {format(t.search.itemsCount, { count: c.products_count })}
                    </span>
                  </Link>
                );
              })}
            </section>
          ) : null}

          {shops.length > 0 ? (
            <section
              aria-label={t.search.shops}
              className="border-t border-border-default py-1"
            >
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {t.search.shops}
              </p>
              {shops.map((s) => {
                const key = `s-${s.id}`;
                return (
                  <Link
                    key={key}
                    id={`${listboxId}-${key}`}
                    role="option"
                    aria-selected={activeKey === key}
                    href={`/stores/${s.slug}`}
                    onMouseEnter={() => setActiveIndex(indexOf(key))}
                    onClick={() => setOpen(false)}
                    className={itemClass(key)}
                  >
                    <Thumb src={s.logo} label={s.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-primary">
                        <Highlight text={s.name} query={trimmed} />
                      </span>
                      <span className="block truncate text-[11px] text-text-secondary">
                        {format(t.search.productsCount, { count: s.products_count })}
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
              className="block w-full border-t border-border-default px-3 py-2.5 text-center text-sm font-medium text-brand-primary hover:bg-bg-subtle"
            >
              {format(t.search.seeAll, { count: data.product_total, query: trimmed })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
