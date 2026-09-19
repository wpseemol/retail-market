import type { Metadata } from "next";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Checkout",
    description:
        "Enter billing details, choose a payment method, and place your order.",
    path: "/checkout",
    noIndex: true,
});

export default function CheckoutPage() {
    return (
        <main>
            <CheckoutPageContent />
        </main>
    );
}
