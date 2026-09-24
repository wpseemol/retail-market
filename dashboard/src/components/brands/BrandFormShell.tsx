import type { ReactNode, RefObject } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Tag,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BrandFormSection({
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

export function BrandFormHeader({
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
          <Link to="/brands">
            <ArrowLeft />
            Brands
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge}
    </div>
  );
}

type BrandImageDropzoneProps = {
  previewUrl?: string | null;
  uploading?: boolean;
  disabled?: boolean;
  onPick: () => void;
  onClear?: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
};

export function BrandImageDropzone({
  previewUrl,
  uploading,
  disabled,
  onPick,
  onClear,
  inputRef,
  onFile,
}: BrandImageDropzoneProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-muted/40 via-background to-brand-tint/20">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlus className="size-6" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                Logo
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Brand image</p>
            <p className="text-xs text-muted-foreground">
              Optional. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on
              the server.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={onPick}
            >
              <Upload className="size-3.5" />
              {uploading
                ? "Uploading…"
                : previewUrl
                  ? "Replace image"
                  : "Upload image"}
            </Button>
            {previewUrl && onClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={onClear}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandLivePreview({
  name,
  slug,
  description,
  isActive,
  sortOrder,
  productsCount = 0,
  imageUrl,
  mode,
}: {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number | string;
  productsCount?: number;
  imageUrl?: string | null;
  mode: "create" | "edit";
}) {
  const displayName = name.trim() || "Brand name";
  const displaySlug = slug.trim() || "brand-slug";
  const initial = displayName.charAt(0).toUpperCase();

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
            className={cn(
              "border-white/25 bg-white/10 capitalize text-white",
              !isActive && "opacity-70",
            )}
          >
            {isActive ? "active" : "inactive"}
          </Badge>
        </div>
        <div className="relative mt-6 flex items-end gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-2xl font-semibold shadow-lg backdrop-blur-sm">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 pb-0.5">
            <h3 className="truncate text-xl font-semibold tracking-tight">
              {displayName}
            </h3>
            <p className="mt-0.5 truncate text-sm text-white/70">
              /{displaySlug}
            </p>
          </div>
        </div>
      </div>

      <div className="-mt-5 space-y-4 px-5 pb-5">
        <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-brand-primary/15 bg-gradient-to-br from-brand-tint to-background text-brand-deep">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <Tag className="size-5" strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {description.trim() ||
                  "Short brand description for the product catalog."}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Sort</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {sortOrder || 0}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
              <dt className="text-muted-foreground">Products</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {productsCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-brand-primary/15 bg-brand-tint/40 px-3 py-2.5 text-xs text-brand-deep">
          {mode === "edit" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <Layers3 className="mt-0.5 size-3.5 shrink-0" />
          )}
          <p>
            {mode === "edit"
              ? "Saving updates the shared brand used on every product."
              : "Create the brand before assigning it on product forms."}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function BrandStickyActions({
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
