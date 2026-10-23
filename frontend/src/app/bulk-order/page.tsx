import type { Metadata } from "next";
import BulkOrderPageContent from "@/components/bulk/BulkOrderPageContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Wholesale order",
    description:
        "Place a wholesale order for many products at once. Everyday shopping stays in the cart.",
    path: "/bulk-order",
});

export default function BulkOrderPage() {
    return (
        <main>
            <BulkOrderPageContent />
        </main>
    );
}
