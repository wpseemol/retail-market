import { useRef } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImagePresetKey } from "@/lib/imagePresets";
import { ImageSizeBadge } from "@/components/dashboard/image-size-badge";
import { ImageFieldError } from "@/components/dashboard/image-field-error";

/** One upload slot (logo / banner / share image) with optional remove. */
export function ShowcaseImageField({
  title,
  preset,
  description,
  previewUrl,
  previewClassName,
  imgClassName,
  busy,
  disabled,
  onFile,
  onRemove,
  error,
}: {
  title: string;
  preset?: ImagePresetKey;
  description: string;
  previewUrl?: string | null;
  previewClassName?: string;
  imgClassName?: string;
  busy?: "upload" | "remove" | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRemove?: () => void;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-dashed bg-linear-to-br from-muted/40 via-background to-brand-tint/20 p-4 transition-colors sm:flex-row sm:items-center",
        error ? "border-destructive/60" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm",
          previewClassName ?? "size-20",
        )}
      >
        {previewUrl ? (
          <img
            key={previewUrl}
            src={previewUrl}
            alt={`${title} preview`}
            className={cn("size-full object-contain animate-in fade-in zoom-in-95 duration-300", imgClassName)}
          />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {title}
            {preset ? <ImageSizeBadge preset={preset} /> : null}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || Boolean(busy)}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {busy === "upload" ? "Uploading…" : previewUrl ? "Replace" : "Upload"}
          </Button>
          {onRemove && previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={disabled || Boolean(busy)}
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
              {busy === "remove" ? "Removing…" : "Remove"}
            </Button>
          ) : null}
        </div>
        <ImageFieldError message={error} />
      </div>
    </div>
  );
}
