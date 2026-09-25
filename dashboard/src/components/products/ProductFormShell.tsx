import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Layers3,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductFormSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/50 via-background to-background px-5 py-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-[11px] font-bold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function ProductFormHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/products">
            <ArrowLeft />
            Products
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge}
    </div>
  );
}

export function ProductLivePreview({
  name,
  slug,
  shortDescription,
  status,
  type,
  price,
  stockQty,
  imageUrl,
  categoryName,
  brandName,
  shopName,
  mode,
}: {
  name: string;
  slug: string;
  shortDescription: string;
  status: string;
  type: string;
  price: number | string;
  stockQty: number | string;
  imageUrl?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  shopName?: string | null;
  mode: "create" | "edit";
}) {
  const displayName = name.trim() || "Product name";
  const displaySlug = slug.trim() || "product-slug";

  return (
    <aside className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm lg:sticky lg:top-4">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary px-5 pb-10 pt-5 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Live preview
          </p>
          <Badge
            variant="outline"
            className="border-white/25 bg-white/10 capitalize text-white"
          >
            {status === "active" ? "publish" : status}
          </Badge>
        </div>
        <div className="relative mt-5 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
          <div className="aspect-[4/3] w-full bg-black/20">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-white/70">
                <ImageIcon className="size-8" />
                <span className="text-xs">No image yet</span>
              </div>
            )}
          </div>
        </div>
        <div className="relative mt-4 min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight">
            {displayName}
          </h3>
          <p className="mt-0.5 truncate text-sm text-white/70">/{displaySlug}</p>
        </div>
      </div>

      <div className="-mt-5 space-y-4 px-5 pb-5">
        <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {shortDescription.trim() ||
              "Short description appears on catalog cards."}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="mt-0.5 font-medium capitalize">{type}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Price</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{price || 0}</dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Stock</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {stockQty || 0}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Brand</dt>
              <dd className="mt-0.5 truncate font-medium">
                {brandName || "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Category:</span>{" "}
              {categoryName || "—"}
            </p>
            {shopName ? (
              <p>
                <span className="font-medium text-foreground">Store:</span>{" "}
                {shopName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-brand-primary/15 bg-brand-tint/40 px-3 py-2.5 text-xs text-brand-deep">
          {mode === "edit" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <Layers3 className="mt-0.5 size-3.5 shrink-0" />
          )}
          <p>
            {mode === "edit"
              ? "Saving updates this product for every storefront listing."
              : "Create under a store, then assign category, brand, and photos."}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function ProductStickyActions({
  children,
  message,
}: {
  children: ReactNode;
  message?: ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">{message}</div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function ProductEmptyIcon() {
  return (
    <div className="flex size-12 items-center justify-center rounded-xl border border-brand-primary/15 bg-gradient-to-br from-brand-tint to-background text-brand-deep">
      <Package className="size-5" strokeWidth={1.75} />
    </div>
  );
}

export function productStatusTone(status: string) {
  return cn(
    "capitalize",
    status === "active" &&
      "border-brand-primary/30 bg-brand-tint/50 text-brand-deep",
  );
}
