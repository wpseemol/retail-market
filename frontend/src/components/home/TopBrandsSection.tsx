import Link from "next/link";
import type { TopBrandsContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_TOP_BRANDS } from "@/lib/homeBlockDefaults";
import { RevealItem } from "@/components/motion/RevealOnScroll";

function BrandMark({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("microsoft")) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="grid grid-cols-2 gap-1 w-5 h-5 shrink-0">
          <span className="bg-[#F25022] w-2 h-2" />
          <span className="bg-[#7FBA00] w-2 h-2" />
          <span className="bg-[#00A4EF] w-2 h-2" />
          <span className="bg-[#FFB900] w-2 h-2" />
        </div>
        <span className="text-[20px] font-semibold text-neutral-700 dark:text-neutral-200 tracking-tight font-sans">
          Microsoft
        </span>
      </div>
    );
  }
  if (n === "hp") {
    return (
      <svg
        className="h-10 w-10 text-[#0096D6]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        />
        <text
          x="48"
          y="62"
          textAnchor="middle"
          fontSize="46"
          fontStyle="italic"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          hp
        </text>
      </svg>
    );
  }
  if (n === "asus") {
    return (
      <span className="text-[24px] font-black tracking-widest text-[#00539B] dark:text-[#388bfd] font-sans">
        ASUS
      </span>
    );
  }
  if (n === "dell") {
    return (
      <div className="w-10 h-10 rounded-full border-[3px] border-[#007DB8] flex items-center justify-center">
        <span className="text-[12px] font-extrabold text-[#007DB8] tracking-widest font-sans">
          DELL
        </span>
      </div>
    );
  }
  if (n === "lenovo") {
    return (
      <span className="text-[24px] font-bold text-[#E2231A] tracking-tighter font-sans">
        Lenovo
      </span>
    );
  }
  if (n === "acer") {
    return (
      <span className="text-[24px] font-bold text-[#83B81A] tracking-tight font-sans lowercase">
        acer
      </span>
    );
  }
  return (
    <span className="text-lg font-bold text-text-primary tracking-tight">
      {name}
    </span>
  );
}

export default function TopBrandsSection({
  content = DEFAULT_TOP_BRANDS,
}: {
  content?: TopBrandsContent;
}) {
  const c = {
    ...DEFAULT_TOP_BRANDS,
    ...content,
    brands: content.brands?.length
      ? content.brands
      : DEFAULT_TOP_BRANDS.brands,
  };

  return (
    <section
      aria-label="Top Brands Showcase"
      className="w-full py-8 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-between border-b border-text-primary pb-0 mb-6">
          <div className="relative">
            <div className="relative z-10 bg-text-primary text-bg-base text-sm sm:text-base font-bold uppercase tracking-wider px-6 py-2.5 [clip-path:polygon(0_0,calc(100%-16px)_0,100%_100%,0_100%)] pr-10">
              {c.title}
            </div>
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-text-primary" />
          </div>

          <Link
            href={c.see_all_href || "/brands"}
            className="text-text-secondary hover:text-brand-primary text-xs sm:text-sm font-medium transition-colors"
          >
            {c.see_all_label}
          </Link>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 sm:gap-8 items-center justify-items-center py-4 list-none m-0 p-0">
          {c.brands.map((brand, index) => (
            <li
              key={`${brand.name}-${index}`}
              className="w-full flex items-center justify-center"
            >
              <RevealItem index={index} className="flex w-full justify-center">
                <Link
                  href={brand.href || "/shop"}
                  aria-label={`View products by ${brand.name}`}
                  className="group flex items-center justify-center py-2 px-3 transition-transform duration-200 hover:-translate-y-1 focus:outline-none"
                >
                  {brand.image ? (
                    <div className="relative w-28 h-9 flex items-center justify-center dark:brightness-0 dark:invert transition-all">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brand.image}
                        alt={brand.name}
                        className="object-contain max-h-8 w-auto"
                      />
                    </div>
                  ) : (
                    <div className="transition-opacity group-hover:opacity-85 flex items-center justify-center">
                      <BrandMark name={brand.name} />
                    </div>
                  )}
                </Link>
              </RevealItem>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
