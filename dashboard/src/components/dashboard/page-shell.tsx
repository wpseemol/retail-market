import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8",
          className,
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
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
