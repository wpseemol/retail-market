import Link from "next/link";
import type { ContactCta } from "@/lib/contentPages";

function isInternal(href: string) {
    return href.startsWith("/") && !href.startsWith("//");
}

/** "Still need help?" box at the bottom of the FAQ / Terms pages. */
export function HelpCta({ cta }: { cta: ContactCta }) {
    if (!cta.enabled || !cta.title) return null;
    const hasButton = Boolean(cta.button_label && cta.button_href);
    const buttonClass =
        "inline-flex h-11 shrink-0 items-center justify-center rounded bg-brand-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover";

    return (
        <aside className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-brand-primary/20 bg-gradient-to-br from-brand-tint/70 via-bg-surface to-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 dark:from-brand-primary/10">
            <div className="flex items-start gap-4">
                <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white"
                >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
                        <path d="M9 10h.01M12 10h.01M15 10h.01" strokeLinecap="round" />
                    </svg>
                </span>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-text-primary">{cta.title}</h2>
                    {cta.text ? <p className="mt-1 max-w-xl text-sm text-text-secondary">{cta.text}</p> : null}
                </div>
            </div>
            {hasButton ? (
                isInternal(cta.button_href) ? (
                    <Link href={cta.button_href} className={buttonClass}>
                        {cta.button_label}
                    </Link>
                ) : (
                    <a
                        href={cta.button_href}
                        className={buttonClass}
                        {...(cta.button_href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                        {cta.button_label}
                    </a>
                )
            ) : null}
        </aside>
    );
}
