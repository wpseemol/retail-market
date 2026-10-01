import type { ReactNode } from "react";
import type { ContentHero as Hero } from "@/lib/contentPages";
import { ShowcaseBreadcrumb, type Crumb } from "@/components/showcase/ShowcaseBreadcrumb";

/** Breadcrumb + green gradient hero shared by the FAQ and Terms pages (same look as /stores and /brands). */
export function ContentHero({
    hero,
    crumbs,
    breadcrumbLabel,
    meta,
    children,
}: {
    hero: Hero;
    crumbs: Crumb[];
    breadcrumbLabel: string;
    meta?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <>
            <ShowcaseBreadcrumb label={breadcrumbLabel} items={crumbs} />
            <section className="relative overflow-hidden border-b border-border-default bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary text-white dark:from-[#0b2a0e] dark:via-[#0f3a13] dark:to-[#167a1b]">
                <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-black/10 blur-3xl" />
                <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
                    {hero.eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{hero.eyebrow}</p>
                    ) : null}
                    <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{hero.title}</h1>
                    {hero.subtitle ? (
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">{hero.subtitle}</p>
                    ) : null}
                    {meta ? <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px]">{meta}</div> : null}
                    {children}
                </div>
            </section>
        </>
    );
}

export function HeroPill({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-white/90 backdrop-blur-sm">
            {children}
        </span>
    );
}
