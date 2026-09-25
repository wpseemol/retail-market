import { Suspense } from "react";
import BestSellerSection from "@/components/home/BestSellerSection";
import DealsBannerSection from "@/components/home/DealsBannerSection";
import DealsOfTheDaySection from "@/components/home/DealsOfTheDay/DealsOfTheDaySection";
import FeaturedSection from "@/components/home/FeaturedSection";
import HeroBanner from "@/components/home/HeroBanner";
import HomeWelcomeModal from "@/components/home/HomeWelcomeModal";
import LaptopRepairBanner from "@/components/home/LaptopRepairBanner";
import LatestProductsSection from "@/components/home/LatestProducts/LatestProductsSection";
import ProductGroupsSection from "@/components/home/ProductGroupsSection";
import PromoBannerSlider from "@/components/home/PromoBannerSlider";
import TopBrandsSection from "@/components/home/TopBrandsSection";
import { HomeSectionSkeleton } from "@/components/home/HomeSectionSkeleton";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { getBlock, getHomePageContent } from "@/lib/homeBlocks";
import { getSiteSettings } from "@/lib/siteSettings";
import {
  DEFAULT_DEALS_BANNER,
  DEFAULT_FEATURED,
  DEFAULT_LAPTOP_REPAIR,
  DEFAULT_TOP_BRANDS,
  DEFAULT_WELCOME_MODAL,
  DEFAULT_PROMO_SLIDER,
  DEFAULT_BEST_SELLERS,
  DEFAULT_LATEST_PRODUCTS,
  DEFAULT_DEALS_OF_DAY,
  DEFAULT_PRODUCT_GROUPS,
} from "@/lib/homeBlockDefaults";

const DEFAULT_ORDER = [
  "welcome_modal",
  "hero",
  "featured",
  "deals_banner",
  "product_groups",
  "promo_slider",
  "best_sellers",
  "latest_products",
  "deals_of_day",
  "laptop_repair",
  "top_brands",
] as const;

const SKELETON_HEIGHT: Record<string, string> = {
  welcome_modal: "h-0",
  hero: "h-90 sm:h-105",
  featured: "h-28",
  deals_banner: "h-36",
  product_groups: "h-80",
  promo_slider: "h-85",
  best_sellers: "h-96",
  latest_products: "h-96",
  deals_of_day: "h-96",
  laptop_repair: "h-75",
  top_brands: "h-40",
};

/** Async section — shares one cached `/api/home/blocks` fetch via Next dedupe. */
async function HomeSection({ sectionKey }: { sectionKey: string }) {
  const home = await getHomePageContent();

  switch (sectionKey) {
    case "welcome_modal":
      return (
        <HomeWelcomeModal
          content={getBlock(home.blocks, "welcome_modal", DEFAULT_WELCOME_MODAL)}
        />
      );
    case "hero":
      return <HeroBanner data={home.hero} />;
    case "featured":
      return (
        <FeaturedSection
          content={getBlock(home.blocks, "featured", DEFAULT_FEATURED)}
        />
      );
    case "deals_banner":
      return (
        <DealsBannerSection
          content={getBlock(home.blocks, "deals_banner", DEFAULT_DEALS_BANNER)}
        />
      );
    case "product_groups":
      return (
        <ProductGroupsSection
          content={getBlock(
            home.blocks,
            "product_groups",
            DEFAULT_PRODUCT_GROUPS,
          )}
        />
      );
    case "promo_slider":
      return (
        <PromoBannerSlider
          content={getBlock(home.blocks, "promo_slider", DEFAULT_PROMO_SLIDER)}
        />
      );
    case "best_sellers":
      return (
        <BestSellerSection
          content={getBlock(home.blocks, "best_sellers", DEFAULT_BEST_SELLERS)}
        />
      );
    case "latest_products":
      return (
        <LatestProductsSection
          content={getBlock(
            home.blocks,
            "latest_products",
            DEFAULT_LATEST_PRODUCTS,
          )}
        />
      );
    case "deals_of_day":
      return (
        <DealsOfTheDaySection
          content={getBlock(home.blocks, "deals_of_day", DEFAULT_DEALS_OF_DAY)}
        />
      );
    case "laptop_repair":
      return (
        <LaptopRepairBanner
          content={getBlock(home.blocks, "laptop_repair", DEFAULT_LAPTOP_REPAIR)}
        />
      );
    case "top_brands":
      return (
        <TopBrandsSection
          content={getBlock(home.blocks, "top_brands", DEFAULT_TOP_BRANDS)}
        />
      );
    default:
      return null;
  }
}

function AnimatedSection({
  sectionKey,
  index,
}: {
  sectionKey: string;
  index: number;
}) {
  if (sectionKey === "welcome_modal") {
    return <HomeSection sectionKey={sectionKey} />;
  }

  const isHero = sectionKey === "hero";

  return (
    <RevealOnScroll
      distance={isHero ? 36 : 64}
      delay={isHero ? 0.08 : Math.min(index * 0.06, 0.28)}
    >
      <HomeSection sectionKey={sectionKey} />
    </RevealOnScroll>
  );
}

export default async function Home() {
  const settings = await getSiteSettings();
  const sections =
    settings.home_sections
      ?.filter((s) => s.is_enabled)
      .sort((a, b) => a.position - b.position) ??
    DEFAULT_ORDER.map((key, position) => ({
      id: key,
      key,
      label: key,
      position,
      is_enabled: true,
    }));

  return (
    <main>
      {sections.map((section, index) => {
        if (section.key === "welcome_modal") {
          return (
            <Suspense key={section.id || section.key} fallback={null}>
              <AnimatedSection sectionKey={section.key} index={index} />
            </Suspense>
          );
        }
        return (
          <Suspense
            key={section.id || section.key}
            fallback={
              <HomeSectionSkeleton
                className={SKELETON_HEIGHT[section.key] ?? "h-48"}
              />
            }
          >
            <AnimatedSection sectionKey={section.key} index={index} />
          </Suspense>
        );
      })}
    </main>
  );
}
