import { Ruler } from "lucide-react";
import { imageSizeLabel, isFreeFormPreset, type ImagePresetKey } from "@/lib/imagePresets";
import { cn } from "@/lib/utils";

/** Required upload size shown beside an image field label, e.g. "1200 × 1200 px · 1:1". */
export function ImageSizeBadge({
  preset,
  className,
}: {
  preset: ImagePresetKey;
  className?: string;
}) {
  const strict = !isFreeFormPreset(preset);
  return (
    <span
      title={strict ? "Required minimum size and shape" : "Recommended size"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 align-middle text-[11px] font-medium whitespace-nowrap tabular-nums",
        strict
          ? "border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Ruler className="size-3" />
      {imageSizeLabel(preset)}
    </span>
  );
}
