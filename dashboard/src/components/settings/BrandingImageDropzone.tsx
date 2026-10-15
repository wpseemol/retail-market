import type { RefObject } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImagePresetKey } from "@/lib/imagePresets";
import { ImageSizeBadge } from "@/components/dashboard/image-size-badge";
import { ImageFieldError } from "@/components/dashboard/image-field-error";

export function BrandingImageDropzone({
    title,
    preset,
    description,
    emptyLabel,
    previewUrl,
    fallbackUrl,
    previewClassName,
    imgClassName,
    uploading,
    disabled,
    onPick,
    inputRef,
    onFile,
    error,
}: {
    title: string;
    preset?: ImagePresetKey;
    description: string;
    emptyLabel: string;
    previewUrl?: string | null;
    /** Shown when no uploaded media yet (current site default). */
    fallbackUrl?: string | null;
    previewClassName?: string;
    imgClassName?: string;
    uploading?: boolean;
    disabled?: boolean;
    onPick: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
    onFile: (file: File | null) => void;
    error?: string | null;
}) {
    const displayUrl = previewUrl || fallbackUrl || null;
    const hasCustomUpload = Boolean(previewUrl);

    return (
        <div
            className={cn(
                "overflow-hidden rounded-xl border border-dashed bg-linear-to-br from-muted/40 via-background to-brand-tint/20 transition-colors",
                error ? "border-destructive/60" : "border-border",
            )}
        >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div
                    className={cn(
                        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm",
                        previewClassName,
                    )}
                >
                    {displayUrl ? (
                        <img
                            key={displayUrl}
                            src={displayUrl}
                            alt={`${title} preview`}
                            className={cn("size-full object-contain p-2 animate-in fade-in zoom-in-95 duration-300", imgClassName)}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ImagePlus className="size-6" />
                            <span className="text-[10px] font-medium uppercase tracking-wide">
                                {emptyLabel}
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div>
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {title}
                            {preset ? <ImageSizeBadge preset={preset} /> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                        {displayUrl && !hasCustomUpload ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Showing current site logo. Upload to replace it.
                            </p>
                        ) : null}
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || uploading}
                        onClick={onPick}
                    >
                        <Upload className="size-3.5" />
                        {uploading
                            ? "Uploading…"
                            : hasCustomUpload
                              ? "Replace image"
                              : "Upload image"}
                    </Button>
                    <ImageFieldError message={error} />
                </div>
            </div>
        </div>
    );
}
