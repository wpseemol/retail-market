import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";

export const metadata: Metadata = {
    title: "Shop | Retail Market",
    description:
        "Browse electronics, gadgets, and more at Retail Market. Filter by price, brand, color, and category.",
};

export default function ShopPage() {
    return (
        <main>
            <ShopPageContent />
        </main>
    );
}
