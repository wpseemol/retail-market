import type { ReactNode } from "react";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { ShowcaseHeroStyle, ShowcaseMedia } from "@/lib/showcase";

type HeroProps = {
    style: ShowcaseHeroStyle;
    kicker: string;
    name: string;
    tagline: string | null;
    description: string | null;
    logo: ShowcaseMedia;
    banner: ShowcaseMedia;
    rating?: { average: number; count: number; label: string; countLabel: string } | null;
    /** Small facts under the title (product count, "Sold by" …). */
    meta?: ReactNode;
    actions?: ReactNode;
};

function Logo({ logo, name, className }: { logo: ShowcaseMedia; name: string; className: string }) {
    return (
        <div className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold shadow-lg ${className}`}>
            {logo?.path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.path} alt={logo.alt_text ?? name} className="size-full object-contain" />
            ) : (
                <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}

function Rating({ rating, tone }: { rating: NonNullable<HeroProps["rating"]>; tone: "light" | "dark" }) {
    if (rating.count === 0) return null;
    return (
        <span className="inline-flex items-center gap-2 text-sm">
            <ReviewStars rating={rating.average} label={rating.label} size={15} />
            <span className={tone === "light" ? "text-white/85" : "text-text-secondary"}>
                <strong className={tone === "light" ? "text-white" : "text-text-primary"}>{rating.average.toFixed(1)}</strong>{" "}
                · {rating.countLabel}
            </span>
        </span>
    );
}

function BannerHero(props: HeroProps) {
    const { kicker, name, tagline, description, logo, banner, rating, meta, actions } = props;
    return (
        <section className="relative overflow-hidden border-b border-border-default">
            <div className="relative min-h-[260px] w-full bg-gradient-to-br from-sc-accent-deep via-sc-accent-deep to-sc-accent sm:min-h-[320px]">
                {banner?.path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.path} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5" />
                <div className="container relative mx-auto flex min-h-[260px] items-end px-4 pb-7 pt-16 sm:min-h-[320px] sm:px-6 sm:pb-9">
                    <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-end">
                        <Logo
                            logo={logo}
                            name={name}
                            className="size-20 rounded-2xl border border-white/30 bg-white text-2xl text-[#19191D] sm:size-24"
                        />
                        <div className="min-w-0 flex-1 text-white">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{kicker}</p>
                            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
                            {tagline ? <p className="mt-2 max-w-2xl text-[15px] text-white/90">{tagline}</p> : null}
                            {!tagline && description ? (
                                <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/80">{description}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
                                {rating ? <Rating rating={rating} tone="light" /> : null}
                                {meta}
                            </div>
                        </div>
                        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
                    </div>
                </div>
            </div>
        </section>
    );
}

function SplitHero(props: HeroProps) {
    const { kicker, name, tagline, description, logo, banner, rating, meta, actions } = props;
    return (
        <section className="border-b border-border-default bg-bg-subtle/50">
            <div className="container mx-auto grid gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-12 lg:py-14">
                <div className="min-w-0">
                    <div className="flex items-center gap-4">
                        <Logo
                            logo={logo}
                            name={name}
                            className="size-16 rounded-xl border border-border-default bg-bg-surface text-xl text-sc-accent-text"
                        />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sc-accent-text">{kicker}</p>
                    </div>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-text-primary sm:text-[40px] sm:leading-tight">
                        {name}
                    </h1>
                    {tagline ? <p className="mt-3 text-lg text-text-primary/85">{tagline}</p> : null}
                    {description ? (
                        <p className="mt-3 line-clamp-4 max-w-xl text-[15px] leading-relaxed text-text-secondary">{description}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
                        {rating ? <Rating rating={rating} tone="dark" /> : null}
                        {meta}
                    </div>
                    {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
                </div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-sc-accent-deep to-sc-accent">
                    {banner?.path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner.path} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-7xl font-semibold text-sc-on-accent/80" aria-hidden="true">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function MinimalHero(props: HeroProps) {
    const { kicker, name, tagline, description, logo, rating, meta, actions } = props;
    return (
        <section className="border-b border-border-default">
            <div className="h-1.5 w-full bg-sc-accent" />
            <div className="container mx-auto flex flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
                <Logo
                    logo={logo}
                    name={name}
                    className="size-16 rounded-full border border-border-default bg-bg-surface text-xl text-sc-accent-text shadow-none"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sc-accent-text">{kicker}</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">{name}</h1>
                    {tagline || description ? (
                        <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-text-secondary">{tagline || description}</p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
                        {rating ? <Rating rating={rating} tone="dark" /> : null}
                        {meta}
                    </div>
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
            </div>
        </section>
    );
}

export function ShowcaseHero(props: HeroProps) {
    if (props.style === "split") return <SplitHero {...props} />;
    if (props.style === "minimal") return <MinimalHero {...props} />;
    return <BannerHero {...props} />;
}
