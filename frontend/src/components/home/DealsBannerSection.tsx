import Image from "next/image";
import Link from "next/link";
import type { DealsBannerContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_DEALS_BANNER } from "@/lib/homeBlockDefaults";
import { RevealItem } from "@/components/motion/RevealOnScroll";

function isRemoteSrc(src: string) {
  return /^https?:\/\//i.test(src) || src.startsWith("/uploads/");
}

export default function DealsBannerSection({
  content = DEFAULT_DEALS_BANNER,
}: {
  content?: DealsBannerContent;
}) {
  const cards = content.cards?.length
    ? content.cards
    : DEFAULT_DEALS_BANNER.cards;

  return (
    <section
      aria-label="Promotional Deals"
      className="w-full py-6 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {cards.map((item, index) => (
            <RevealItem key={`${item.href}-${index}`} index={index}>
              <article className="relative overflow-hidden rounded-xl bg-bg-surface border border-border-default p-3.5 sm:p-4 flex items-center justify-between min-h-32 sm:min-h-35 transition-all duration-200 hover:shadow-md hover:border-brand-primary group">
                <div className="relative w-26.25 h-23.75 sm:w-28.75 sm:h-25 shrink-0 flex items-center justify-center">
                  {isRemoteSrc(item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.alt}
                      className="absolute inset-0 size-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 640px) 105px, 115px"
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>

                <div className="flex flex-col items-start pl-2">
                  <h3 className="text-text-primary text-[13px] sm:text-[14px] font-bold tracking-tight uppercase leading-[1.2]">
                    <span>{item.title_top}</span>
                    <br />
                    <span>{item.title_bottom}</span>
                  </h3>

                  <div className="flex items-baseline my-1">
                    <span className="flex flex-col text-[9px] font-bold uppercase leading-none text-brand-primary mr-1 self-center">
                      <span>Up</span>
                      <span>To</span>
                    </span>
                    <span className="text-[28px] sm:text-[32px] font-black leading-none text-brand-primary">
                      {item.discount_percent}
                    </span>
                    <span className="text-[13px] font-bold text-brand-primary ml-0.5">
                      %
                    </span>
                  </div>

                  <Link
                    href={item.href || "/shop"}
                    className="inline-flex items-center gap-1.5 text-text-primary text-[12px] sm:text-[13px] font-medium transition-colors group-hover:text-brand-primary"
                  >
                    <span>{item.cta_label || "Shop Now"}</span>
                    <span className="w-4 h-4 rounded-full bg-brand-primary text-white flex items-center justify-center text-[9px] leading-none shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
                      &#10148;
                    </span>
                  </Link>
                </div>
              </article>
            </RevealItem>
          ))}
        </div>
      </div>
    </section>
  );
}
