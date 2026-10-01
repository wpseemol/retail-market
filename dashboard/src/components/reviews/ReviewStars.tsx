import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}
