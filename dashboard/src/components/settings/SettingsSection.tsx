import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
                    {Icon ? <Icon className="size-3.5" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold tracking-tight">
                        {title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
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
