import type { Metadata } from "next";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";

export const metadata: Metadata = {
    title: "Checkout | Retail Market",
    description:
        "Enter billing details, choose a payment method, and place your order.",
};

export default function CheckoutPage() {
    return (
        <main>
            <CheckoutPageContent />
        </main>
    );
}
