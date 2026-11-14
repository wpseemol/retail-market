import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSection({
    title,
    description,
    icon: Icon,
    children,
    collapsible = false,
    defaultOpen = true,
}: {
    title: string;
    description: string;
    icon?: LucideIcon;
    children: ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <FadeUp>
            <section className="overflow-clip rounded-2xl border border-border/80 bg-card shadow-sm">
                <div
                    className={cn(
                        "flex items-start gap-3 border-b border-border/70 bg-linear-to-r from-brand-tint/40 via-background to-background px-5 py-4",
                        collapsible && "cursor-pointer select-none",
                    )}
                    onClick={collapsible ? () => setOpen((v) => !v) : undefined}
                    onKeyDown={
                        collapsible
                            ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setOpen((v) => !v);
                                  }
                              }
                            : undefined
                    }
                    role={collapsible ? "button" : undefined}
                    tabIndex={collapsible ? 0 : undefined}
                    aria-expanded={collapsible ? open : undefined}
                >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
                        {Icon ? <Icon className="size-4" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {collapsible ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen((v) => !v);
                            }}
                            aria-label={open ? "Collapse section" : "Expand section"}
                        >
                            {open ? "Hide" : "Show"}
                        </Button>
                    ) : null}
                </div>
                {(!collapsible || open) && (
                    <div className="space-y-4 p-5">{children}</div>
                )}
            </section>
        </FadeUp>
    );
}

/** Inner card matching Social login provider rows. */
export function SettingsCard({
    title,
    description,
    icon: Icon,
    badge,
    actions,
    children,
    highlighted = false,
    className,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    badge?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    highlighted?: boolean;
    className?: string;
}) {
    return (
        <section
            className={cn(
                "rounded-xl border border-border/80 bg-background p-4 sm:p-5",
                highlighted && "border-brand-primary/40 shadow-sm",
                className,
            )}
        >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    {Icon ? (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card">
                            <Icon className="size-5 text-brand-primary" />
                        </span>
                    ) : null}
                    <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                            {title}
                            {badge}
                        </h3>
                        {description ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
            {children}
        </section>
    );
}

/** Inline error/success line used by panels that save on their own. */
export function SettingsStatusLine({
    error,
    success,
}: {
    error: string | null;
    success: string | null;
}) {
    if (!error && !success) return null;
    return (
        <p
            className={error ? "text-sm text-destructive" : "text-sm text-brand-primary"}
            role={error ? "alert" : "status"}
        >
            {error ?? success}
        </p>
    );
}
