import Image from "next/image";
import Link from "next/link";
import type { LaptopRepairContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_LAPTOP_REPAIR } from "@/lib/homeBlockDefaults";

function isRemoteSrc(src: string) {
  return /^https?:\/\//i.test(src) || src.startsWith("/uploads/");
}

function CoverImg({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (isRemoteSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`absolute inset-0 size-full ${className ?? "object-cover"}`} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 1280px) 100vw, 1280px"
      priority={priority}
      className={className}
    />
  );
}

export default function LaptopRepairBanner({
  content = DEFAULT_LAPTOP_REPAIR,
}: {
  content?: LaptopRepairContent;
}) {
  const c = { ...DEFAULT_LAPTOP_REPAIR, ...content };

  return (
    <section
      aria-label="Laptop Repair Expert Service Promotion"
      className="w-full py-6 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <div className="relative w-full overflow-hidden rounded-xl bg-[#111315] border border-border-default min-h-70 sm:min-h-75 md:min-h-82.5 flex items-center justify-between gap-3 px-5 py-7 sm:px-10 lg:px-14 shadow-sm">
          <div className="absolute inset-0 pointer-events-none z-0">
            <CoverImg
              src={c.bg_image}
              alt=""
              className="object-cover object-center"
              priority
            />
          </div>

          <div
            className="absolute top-5 right-4 sm:top-8 sm:right-auto sm:left-[41%] lg:left-[43%] w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-lg z-20"
            aria-label={`${c.offer_percent} percent ${c.offer_label}`}
          >
            <span className="text-[13px] sm:text-[15px] font-black leading-none tracking-tight">
              {c.offer_percent}%
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
              {c.offer_label}
            </span>
          </div>

          <div className="relative z-10 flex flex-col items-start max-w-[55%] sm:max-w-md lg:max-w-lg">
            <span className="bg-brand-primary text-white text-xs font-semibold px-3 py-1 rounded mb-3 inline-block">
              {c.badge_label}
            </span>

            <h2 className="text-white text-xl sm:text-3xl lg:text-[34px] font-bold uppercase leading-[1.2] tracking-tight mb-3">
              <span>{c.headline_line1}</span>
              <br />
              <span>{c.headline_line2}</span>
            </h2>

            {c.subtext ? (
              <p className="text-neutral-400 text-xs sm:text-sm font-normal mb-6">
                {c.subtext}
              </p>
            ) : null}

            <Link
              href={c.cta_href || "/contact"}
              className="inline-flex items-center gap-2 text-white hover:text-brand-primary text-xs sm:text-[13px] font-bold uppercase tracking-wider transition-colors group"
            >
              <span>{c.cta_label}</span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
          </div>

          <div className="relative z-10 w-36 h-32 sm:w-90 sm:h-67.5 lg:w-120 lg:h-77.5 shrink-0 flex items-center justify-center">
            <CoverImg
              src={c.product_image}
              alt="Laptop repair promotion"
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
