import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutResultContent from "@/components/checkout/CheckoutResultContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Payment status",
    description: "The result of your online payment.",
    path: "/checkout/result",
    noIndex: true,
});

export default function CheckoutResultPage() {
    return (
        <main>
            <Suspense fallback={null}>
                <CheckoutResultContent />
            </Suspense>
        </main>
    );
}
