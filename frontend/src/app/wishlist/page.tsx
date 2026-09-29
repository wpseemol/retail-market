import type { Metadata } from "next";
import WishlistPageContent from "@/components/wishlist/WishlistPageContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "My Wishlist",
    description: "Products you saved for later.",
    path: "/wishlist",
    noIndex: true,
});

export default function WishlistPage() {
    return (
        <main>
            <WishlistPageContent />
        </main>
    );
}
