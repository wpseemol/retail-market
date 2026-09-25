import Image from "next/image";
import type { FeaturedContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_FEATURED } from "@/lib/homeBlockDefaults";
import { RevealItem } from "@/components/motion/RevealOnScroll";

export default function FeaturedSection({
  content = DEFAULT_FEATURED,
}: {
  content?: FeaturedContent;
}) {
  const items = content.items?.length ? content.items : DEFAULT_FEATURED.items;

  return (
    <section
      aria-label="Core Services and Guarantees"
      className="w-full py-6 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 sm:p-8 bg-bg-surface border border-brand-primary rounded-xl shadow-xs list-none m-0">
          {items.map((feature, index) => (
            <li key={`${feature.title}-${index}`}>
              <RevealItem
                index={index}
                className="flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                  <Image
                    src={feature.icon || "/icons/featured_delivery-truck 1.svg"}
                    alt={feature.alt || feature.title}
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-brand-primary text-[16px] font-bold leading-snug tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary text-[13px] font-normal leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </RevealItem>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
