import { BadgeCheck, Flag } from "lucide-react";
import { REVIEW_STATUS_META, type ReviewStatus } from "@/lib/reviews";
import { cn } from "@/lib/utils";

export function ReviewStatusPill({ status, className }: { status: ReviewStatus; className?: string }) {
  const meta = REVIEW_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        meta.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function VerifiedPurchasePill({ verified }: { verified: boolean }) {
  if (!verified) {
    return <span className="text-xs text-muted-foreground">Unverified</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-primary/30 bg-brand-tint/60 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-brand-deep">
      <BadgeCheck className="size-3" />
      Verified purchase
    </span>
  );
}

export function FlaggedChip({ reason }: { reason: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
      title={reason ?? "Flagged for review"}
    >
      <Flag className="size-2.5" />
      Flagged
    </span>
  );
}
