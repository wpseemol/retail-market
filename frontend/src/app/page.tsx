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
import { getSiteSettings } from "@/lib/siteSettings";
import type { ReactNode } from "react";

const HOME_SECTION_MAP: Record<string, ReactNode> = {
  welcome_modal: <HomeWelcomeModal />,
  hero: <HeroBanner />,
  featured: <FeaturedSection />,
  deals_banner: <DealsBannerSection />,
  product_groups: <ProductGroupsSection />,
  promo_slider: <PromoBannerSlider />,
  best_sellers: <BestSellerSection />,
  latest_products: <LatestProductsSection />,
  deals_of_day: <DealsOfTheDaySection />,
  laptop_repair: <LaptopRepairBanner />,
  top_brands: <TopBrandsSection />,
};

const DEFAULT_ORDER = Object.keys(HOME_SECTION_MAP);

export default async function Home() {
  const settings = await getSiteSettings();
  const sections =
    settings.home_sections?.filter((s) => s.is_enabled).sort(
      (a, b) => a.position - b.position,
    ) ?? DEFAULT_ORDER.map((key, position) => ({
      id: key,
      key,
      label: key,
      position,
      is_enabled: true,
    }));

  return (
    <main>
      {sections.map((section) => {
        const node = HOME_SECTION_MAP[section.key];
        if (!node) return null;
        return <div key={section.id || section.key}>{node}</div>;
      })}
    </main>
  );
}
