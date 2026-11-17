"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { Loader2, Package } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import ShopProductCard from "./ShopProductCard";
import {
  VIEW_MODE_GRID_CLASS,
  type ShopProduct,
  type ShopViewMode,
} from "./types";

type AnimPhase = "idle" | "out" | "in";

const OUT_MS = 180;
const IN_CLEAR_MS = 520;

function ProductLoadMoreStatus({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <Package className="size-6 text-brand-primary/80" aria-hidden="true" />
        <Loader2
          className="absolute -right-1 -bottom-1 size-5 animate-spin text-brand-primary"
          aria-hidden="true"
        />
      </div>
      <p className="m-0 text-sm text-text-secondary">{label}</p>
      <div
        className="grid w-full max-w-3xl grid-cols-2 gap-2.5 opacity-70 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-border-default bg-bg-surface"
          >
            <div className="aspect-square animate-pulse bg-bg-subtle" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-bg-subtle" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function canStartViewTransition() {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  );
}

export default function ShopProductGrid({
  products,
  viewMode,
  onQuickView,
  onNearEnd,
  restoreScrollY,
  loadingMore,
  error,
  onRetry,
  hasMore,
  showStatus,
}: {
  products: ShopProduct[];
  viewMode: ShopViewMode;
  onQuickView: (product: ShopProduct) => void;
  onNearEnd?: () => void;
  restoreScrollY?: number | null;
  loadingMore?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasMore?: boolean;
  showStatus?: boolean;
}) {
  const { t } = useI18n();
  const copy = t.shopPage;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const [renderMode, setRenderMode] = useState(viewMode);
  const [anim, setAnim] = useState<AnimPhase>("idle");
  const [vtActive, setVtActive] = useState(false);
  const renderModeRef = useRef(viewMode);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (viewMode === renderModeRef.current) {
      setAnim("idle");
      setVtActive(false);
      return;
    }

    let cancelled = false;
    let outTimer = 0;
    let inTimer = 0;

    const commitMode = (mode: ShopViewMode) => {
      renderModeRef.current = mode;
      flushSync(() => setRenderMode(mode));
    };

    if (reduceMotionRef.current) {
      commitMode(viewMode);
      setAnim("idle");
      setVtActive(false);
      return;
    }

    const from = renderModeRef.current;
    const bothGrid = from !== "list" && viewMode !== "list";

    // 2 ↔ 3 ↔ 4 columns: morph each card to its new cell (View Transitions API).
    if (bothGrid && canStartViewTransition()) {
      flushSync(() => setVtActive(true));
      const vt = document.startViewTransition(() => {
        if (!cancelled) commitMode(viewMode);
      });
      void vt.finished.finally(() => {
        if (cancelled) return;
        setVtActive(false);
        setAnim("idle");
      });
      return () => {
        cancelled = true;
        commitMode(viewMode);
        setVtActive(false);
        setAnim("idle");
      };
    }

    // List ↔ grid (or no VT support): fade out → swap → staggered rise-in.
    setAnim("out");
    outTimer = window.setTimeout(() => {
      if (cancelled) return;
      commitMode(viewMode);
      setAnim("in");
      inTimer = window.setTimeout(() => {
        if (!cancelled) setAnim("idle");
      }, IN_CLEAR_MS);
    }, OUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(outTimer);
      window.clearTimeout(inTimer);
      commitMode(viewMode);
      setAnim("idle");
      setVtActive(false);
    };
  }, [viewMode]);

  useEffect(() => {
    if (restoreScrollY == null || restoreScrollY <= 0) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScrollY });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [restoreScrollY]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !onNearEnd || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onNearEndRef.current?.();
        }
      },
      { rootMargin: "720px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onNearEnd, products.length]);

  return (
    <div>
      {/* Extra space under the last row so the hover buy panel is not covered by the footer. */}
      <div className={showStatus ? "pb-24" : undefined}>
        <div
          key={renderMode}
          className={
            renderMode === "list"
              ? "flex flex-col gap-4 overflow-visible"
              : `${VIEW_MODE_GRID_CLASS[renderMode]} overflow-visible`
          }
        >
          {products.map((product, index) => {
            const style: CSSProperties = {};
            if (anim === "in") {
              (style as Record<string, string | number>)["--shop-stagger"] =
                Math.min(index, 18) * 28;
            }
            // VT names only while morphing — persistent names clip the hover buy tray.
            style.viewTransitionName = vtActive
              ? `shop-p-${product.id}`
              : "none";

            return (
              <div
                key={product.id}
                data-shop-card-anim={
                  anim === "out" || anim === "in" ? anim : undefined
                }
                className={cn("relative h-full overflow-visible")}
                style={style}
              >
                <ShopProductCard
                  product={product}
                  viewMode={renderMode}
                  onQuickView={onQuickView}
                />
              </div>
            );
          })}
        </div>
        {showStatus ? (
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
        ) : null}
      </div>
      {showStatus && loadingMore ? (
        <ProductLoadMoreStatus label={copy.loadingMore} />
      ) : null}
      {error ? (
        <p
          className={`py-4 text-center text-sm ${error === "offline" ? "text-text-secondary" : "text-error"}`}
        >
          {error === "offline" ? (
            copy.offlineList
          ) : (
            <>
              {copy.loadFailed}{" "}
              <button
                type="button"
                onClick={onRetry}
                className="font-semibold text-brand-primary"
              >
                {copy.retry}
              </button>
            </>
          )}
        </p>
      ) : null}
      {showStatus && !hasMore && products.length > 0 && !loadingMore ? (
        <p className="py-4 text-center text-sm text-text-secondary">
          {copy.endOfList}
        </p>
      ) : null}
    </div>
  );
}
