import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Flat list/analytics header — title + muted subtitle + right actions.
 * Prefer this over PageHero on Overview, Orders, Users, Stores, Products.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <FadeUp>
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-3",
          className,
        )}
      >
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </FadeUp>
  );
}

/** Bordered pill group for range filters and similar toggles. */
export function SegmentedControl({
  "aria-label": ariaLabel,
  children,
  className,
}: {
  "aria-label": string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SegmentedControlItem({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

/** Green banner hero for create/edit flows and role workspaces — not list pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <FadeUp>
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-black/5 bg-[#14361c] px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8",
          className,
        )}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-xl">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </section>
    </FadeUp>
  );
}

export function FormSection({
  step,
  title,
  description,
  children,
  tone = "default",
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <FadeUp>
      <section
        className={cn(
          "overflow-hidden rounded-2xl border bg-card shadow-sm",
          tone === "danger" ? "border-destructive/30" : "border-border/80",
        )}
      >
        <div
          className={cn(
            "flex items-start gap-3 border-b px-5 py-4",
            tone === "danger"
              ? "border-destructive/20 bg-gradient-to-r from-destructive/10 via-background to-background"
              : "border-border/70 bg-gradient-to-r from-brand-tint/50 via-background to-background",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white",
              tone === "danger" ? "bg-destructive" : "bg-brand-primary",
            )}
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </section>
    </FadeUp>
  );
}

export function FormPageHeader({
  backTo,
  backLabel,
  title,
  subtitle,
  badge,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <FadeUp>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to={backTo}>
              <ArrowLeft />
              {backLabel}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge}
      </div>
    </FadeUp>
  );
}

export function FormStatusMessage({
  error,
  success,
  idle,
}: {
  error?: string | null;
  success?: string | null;
  idle?: ReactNode;
}) {
  if (error) {
    return (
      <p className="text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="text-brand-primary" role="status">
        {success}
      </p>
    );
  }
  return idle ? <p className="text-muted-foreground">{idle}</p> : null;
}

export function StickyFormActions({
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
