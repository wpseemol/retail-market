import type { Metadata } from "next";
import CartPageContent from "@/components/cart/CartPageContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Shopping Cart",
    description:
        "Review your cart items, update quantities, apply coupons, and proceed to checkout.",
    path: "/cart",
    noIndex: true,
});

export default function CartPage() {
    return (
        <main>
            <CartPageContent />
        </main>
    );
}
