import { formatPrice } from "@/lib/money";
import type { ShippingQuote } from "@/hooks/useShippingQuote";

export function ShippingSummaryValue({
    quote,
    loading,
    error,
    subtotal,
}: {
    quote: ShippingQuote | null;
    loading: boolean;
    error: boolean;
    subtotal: number;
}) {
    if (loading) {
        return (
            <p className="text-[14px] text-text-secondary m-0">Calculating…</p>
        );
    }
    if (error || !quote) {
        return (
            <p className="text-[13px] text-text-secondary m-0">
                Calculated when you place the order
            </p>
        );
    }
    const remaining =
        quote.free_threshold != null && !quote.free_shipping_applied
            ? quote.free_threshold - subtotal
            : 0;
    return (
        <>
            <p className="text-[14px] font-medium text-text-primary m-0 tabular-nums">
                {quote.shipping_fee > 0
                    ? formatPrice(quote.shipping_fee)
                    : "Free Shipping"}
            </p>
            {remaining > 0 && (
                <p className="mt-1 text-[12px] text-text-secondary m-0">
                    Add {formatPrice(remaining)} more for free shipping
                </p>
            )}
        </>
    );
}
