import Image from "next/image";
import Link from "next/link";
import { getHeroBanner } from "@/lib/homeHero";

function isRemoteSrc(src: string) {
  return /^https?:\/\//i.test(src) || src.startsWith("/uploads/");
}

function HeroBg({
  src,
  sizes,
  priority,
}: {
  src: string;
  sizes: string;
  priority?: boolean;
}) {
  if (isRemoteSrc(src)) {
    return (
      // Remote upload URLs may not be in next.config remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      aria-hidden="true"
    />
  );
}

function HeroProduct({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (isRemoteSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-contain"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-contain"
    />
  );
}

export default async function HeroBanner() {
  const hero = await getHeroBanner();
  const mainBg = hero.main.bg_image?.path ?? "/images/hero_bg_06 1.png";
  const mainProduct =
    hero.main.product_image?.path ?? "/images/camera.png";
  const mainProductAlt =
    hero.main.product_image?.alt_text ?? hero.main.headline;
  const sideBg = hero.side.bg_image?.path ?? "/images/hero_bg_06 1.png";
  const sideProduct =
    hero.side.product_image?.path ?? "/images/img_57 1.png";
  const sideProductAlt =
    hero.side.product_image?.alt_text ?? hero.side.headline;

  return (
    <section
      aria-label="Featured Promotions"
      className="w-full py-6 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <article className="lg:col-span-8 relative overflow-hidden rounded-2xl bg-bg-surface border border-border-default flex flex-col md:flex-row items-center justify-between p-6 sm:p-12 lg:p-14 min-h-90 sm:min-h-105">
          <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-10 z-0">
            <HeroBg
              src={mainBg}
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority
            />
          </div>

          <div className="relative z-10 flex flex-col items-start max-w-85 sm:max-w-95">
            <div className="relative w-full mb-3">
              <span className="text-brand-primary text-[13px] sm:text-sm font-medium tracking-wide">
                {hero.main.eyebrow}
              </span>
              <Image
                src="/icons/hero_Polygon 1.svg"
                alt=""
                width={16}
                height={16}
                className="absolute right-0 -top-1"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-text-primary text-2xl sm:text-3xl lg:text-[32px] font-extrabold leading-[1.15] tracking-tight uppercase mb-3">
              {hero.main.headline}
            </h1>

            {hero.main.subtext ? (
              <p className="text-text-secondary text-xs sm:text-sm font-normal mb-5 leading-relaxed">
                {hero.main.subtext}
              </p>
            ) : null}

            <div className="flex items-center gap-6 mb-7">
              {hero.main.discount_percent != null ? (
                <div className="flex items-baseline text-brand-primary">
                  <span className="flex flex-col text-[11px] font-bold uppercase leading-none mr-1.5 self-center">
                    <span>Up</span>
                    <span>To</span>
                  </span>
                  <span className="text-4xl sm:text-5xl font-black leading-none">
                    {hero.main.discount_percent}
                  </span>
                  <span className="text-lg font-bold ml-0.5">%</span>
                </div>
              ) : null}
              {hero.main.price_label ? (
                <span className="text-brand-primary text-xl sm:text-2xl font-bold">
                  {hero.main.price_label}
                </span>
              ) : null}
            </div>

            <Link
              href={hero.main.cta_href || "/shop"}
              className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-primary dark:hover:bg-brand-primary dark:hover:text-white text-xs sm:text-[13px] font-bold uppercase tracking-wider px-7 py-3.5 rounded-full transition-all duration-200 group shadow-sm"
            >
              <span>{hero.main.cta_label}</span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
          </div>

          <div className="relative z-10 mt-8 md:mt-0 w-full md:w-1/2 flex justify-center items-center">
            <div className="relative w-75 h-62.5 sm:w-95 sm:h-77.5 lg:w-110 lg:h-87.5">
              <HeroProduct
                src={mainProduct}
                alt={mainProductAlt}
                sizes="(max-width: 640px) 300px, (max-width: 1024px) 380px, 440px"
                priority
              />
            </div>
          </div>
        </article>

        <aside className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-bg-surface border border-border-default flex flex-col justify-between p-6 sm:p-8 min-h-90 sm:min-h-105">
          <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10 z-0">
            <HeroBg
              src={sideBg}
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
          </div>

          {hero.side.offer_percent != null ? (
            <div
              className="absolute top-20 right-4 sm:top-24 sm:right-7 w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-lg z-20"
              aria-label={`${hero.side.offer_percent} percent ${hero.side.offer_label ?? "offer"}`}
            >
              <span className="text-sm sm:text-lg font-black leading-none tracking-tight">
                {hero.side.offer_percent}%
              </span>
              {hero.side.offer_label ? (
                <span className="text-[10px] sm:text-sm font-semibold leading-tight">
                  {hero.side.offer_label}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="relative z-10 flex flex-col items-start pr-16 sm:pr-20">
            {hero.side.badge_label ? (
              <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded mb-3.5 inline-block">
                {hero.side.badge_label}
              </span>
            ) : null}

            <h2 className="text-text-primary text-lg sm:text-xl font-bold uppercase leading-snug mb-2.5">
              {hero.side.headline}
            </h2>

            {hero.side.discount_percent != null ? (
              <div className="flex items-baseline text-brand-primary mb-5">
                <span className="flex flex-col text-[10px] font-bold uppercase leading-none mr-1.5 self-center">
                  <span>Up</span>
                  <span>To</span>
                </span>
                <span className="text-3xl sm:text-4xl font-black leading-none">
                  {hero.side.discount_percent}
                </span>
                <span className="text-sm font-bold ml-0.5">%</span>
              </div>
            ) : null}

            <Link
              href={hero.side.cta_href || "/shop"}
              className="inline-flex items-center gap-2 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white text-xs sm:text-[13px] font-bold uppercase px-5 py-2 rounded-full transition-all duration-200 group bg-bg-surface"
            >
              <span>{hero.side.cta_label}</span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
          </div>

          <div className="relative z-10 mt-4 w-full flex justify-center items-end">
            <div className="relative w-47.5 h-52.5 sm:w-55 sm:h-60">
              <HeroProduct
                src={sideProduct}
                alt={sideProductAlt}
                sizes="(max-width: 640px) 190px, 220px"
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
