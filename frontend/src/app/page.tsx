import DealsBannerSection from "@/components/home/DealsBannerSection";
import FeaturedSection from "@/components/home/FeaturedSection";
import HeroBanner from "@/components/home/HeroBanner";
import ProductGroupsSection from "@/components/home/ProductGroupsSection";
import PromoBannerSlider from "@/components/home/PromoBannerSlider";

export default function Home() {
    return (
        <main>
            <HeroBanner />
            <FeaturedSection />
            <DealsBannerSection />
            <ProductGroupsSection />
            <PromoBannerSlider />
        </main>
    );
}
