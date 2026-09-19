import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Shop",
    description: `Browse electronics, gadgets, and more at ${siteConfig.name}. Filter by price, brand, color, and category.`,
    path: "/shop",
});

export default function ShopPage() {
    return (
        <main>
            <ShopPageContent />
        </main>
    );
}
