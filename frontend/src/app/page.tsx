import BestSellerSection from "@/components/home/BestSellerSection";
import DealsBannerSection from "@/components/home/DealsBannerSection";
import DealsOfTheDaySection from "@/components/home/DealsOfTheDay/DealsOfTheDaySection";
import FeaturedSection from "@/components/home/FeaturedSection";
import HeroBanner from "@/components/home/HeroBanner";
import LaptopRepairBanner from "@/components/home/LaptopRepairBanner";
import LatestProductsSection from "@/components/home/LatestProducts/LatestProductsSection";
import ProductGroupsSection from "@/components/home/ProductGroupsSection";
import PromoBannerSlider from "@/components/home/PromoBannerSlider";
import TopBrandsSection from "@/components/home/TopBrandsSection";

export default function Home() {
    return (
        <main>
            <HeroBanner />
            <FeaturedSection />
            <DealsBannerSection />
            <ProductGroupsSection />
            <PromoBannerSlider />
            <BestSellerSection />
            <LatestProductsSection />
            <DealsOfTheDaySection />
            <LaptopRepairBanner />
            <TopBrandsSection />
        </main>
    );
}
