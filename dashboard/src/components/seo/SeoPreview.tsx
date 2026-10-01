import { Globe, ImageIcon } from "lucide-react";
import { STOREFRONT_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** "42 / 60" counter that turns amber past the ideal length and red past the max. */
export function CharCounter({ value, ideal, max }: { value: string; ideal: number; max: number }) {
  const n = value.trim().length;
  return (
    <span
      className={cn(
        "tabular-nums text-[11px]",
        n > max ? "text-destructive" : n > ideal ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {n} / {ideal}
    </span>
  );
}

function truncate(text: string, max: number) {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Approximation of a Google desktop result. */
export function SearchPreview({
  title,
  description,
  path,
  siteName,
  faviconUrl,
  noIndex,
}: {
  title: string;
  description: string;
  path: string;
  siteName: string;
  faviconUrl?: string | null;
  noIndex?: boolean;
}) {
  const host = STOREFRONT_URL.replace(/^https?:\/\//, "");
  const crumbs = [host, ...path.split("/").filter(Boolean)].join(" › ");

  return (
    <div className="rounded-xl border border-border/80 bg-white p-4 text-left shadow-sm dark:bg-zinc-950">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Google preview</p>
      {noIndex ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Hidden from search engines (noindex) — this page won&apos;t appear in results.
        </p>
      ) : (
        <div className="font-[arial,sans-serif]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className="size-4 object-contain" />
              ) : (
                <Globe className="size-3.5 text-zinc-500" />
              )}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] text-zinc-800 dark:text-zinc-200">{siteName}</span>
              <span className="block truncate text-[12px] text-zinc-600 dark:text-zinc-400">{crumbs}</span>
            </span>
          </div>
          <p className="mt-1.5 line-clamp-1 text-[19px] leading-snug text-[#1a0dab] dark:text-[#99c3ff]">
            {truncate(title || "Page title", 65)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
            {truncate(description || "Add a meta description so search engines show a helpful summary.", 165)}
          </p>
        </div>
      )}
    </div>
  );
}

/** Facebook / WhatsApp / X large card. */
export function SharePreview({
  title,
  description,
  imageUrl,
}: {
  title: string;
  description: string;
  imageUrl?: string | null;
}) {
  const host = STOREFRONT_URL.replace(/^https?:\/\//, "").toUpperCase();
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-sm">
      <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Share card</p>
      <div className="mt-2 aspect-[1.91/1] w-full bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="size-6" />
            <span className="text-[11px]">No share image — the site default is used</span>
          </div>
        )}
      </div>
      <div className="border-t border-border/70 bg-muted/40 px-4 py-3">
        <p className="truncate text-[11px] text-muted-foreground">{host}</p>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold">{title || "Title"}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
