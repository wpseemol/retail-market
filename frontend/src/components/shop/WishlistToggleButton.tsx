"use client";

import { useWishlist } from "@/hooks/useWishlist";

export default function WishlistToggleButton({ productId }: { productId: number }) {
    const { isWishlisted, isPending, toggle, error, isLoggedIn } = useWishlist();
    const saved = isWishlisted(productId);
    const pending = isPending(productId);
    const label = saved
        ? "Remove from wishlist"
        : isLoggedIn
          ? "Add to wishlist"
          : "Log in to add to wishlist";

    return (
        <div className="relative">
            <button
                type="button"
                aria-label={label}
                aria-pressed={saved}
                aria-busy={pending || undefined}
                title={label}
                onClick={() => void toggle(productId)}
                disabled={pending}
                className={`h-11 w-11 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-70 ${
                    saved
                        ? "border-brand-primary bg-brand-primary text-white hover:bg-brand-hover hover:border-brand-hover"
                        : "border-border-default bg-bg-subtle text-text-secondary hover:text-brand-primary hover:border-brand-primary"
                }`}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={saved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            </button>
            {error ? (
                <p
                    role="alert"
                    className="absolute right-0 top-full mt-1.5 w-56 m-0 rounded-md border border-error/30 bg-bg-surface px-2.5 py-1.5 text-[12px] text-error shadow-sm z-10"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}
