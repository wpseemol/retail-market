import type { Metadata } from "next";
import CartPageContent from "@/components/cart/CartPageContent";

export const metadata: Metadata = {
    title: "Shopping Cart | Retail Market",
    description:
        "Review your cart items, update quantities, apply coupons, and proceed to checkout.",
};

export default function CartPage() {
    return (
        <main>
            <CartPageContent />
        </main>
    );
}
