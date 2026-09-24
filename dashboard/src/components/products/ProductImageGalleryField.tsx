import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/lib/products";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  validateProductImageFile,
} from "@/lib/validators/product";

export type LocalProductImage = {
  key: string;
  file: File;
  preview: string;
};

type ProductImageGalleryFieldProps = {
  /** Remote gallery images (edit mode). */
  images?: ProductMedia[];
  primaryId?: string | null;
  /** Local files pending upload (create mode, or staged adds). */
  localImages: LocalProductImage[];
  localPrimaryKey?: string | null;
  onLocalImagesChange: (images: LocalProductImage[]) => void;
  onLocalPrimaryChange?: (key: string) => void;
  onRemoveRemote?: (mediaId: string) => void;
  onSetPrimaryRemote?: (mediaId: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  maxImages?: number;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ProductImageGalleryField({
  images = [],
  primaryId = null,
  localImages,
  localPrimaryKey = null,
  onLocalImagesChange,
  onLocalPrimaryChange,
  onRemoveRemote,
  onSetPrimaryRemote,
  onError,
  disabled = false,
  maxImages = PRODUCT_IMAGE_MAX_COUNT,
}: ProductImageGalleryFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const totalCount = images.length + localImages.length;
  const remaining = Math.max(0, maxImages - totalCount);
  const maxMb = Math.floor(PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024));

  useEffect(() => {
    return () => {
      for (const img of localImages) URL.revokeObjectURL(img.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList || disabled || remaining <= 0) return;
    const incoming = Array.from(fileList).slice(0, remaining);
    const accepted: File[] = [];

    for (const file of incoming) {
      const checked = validateProductImageFile(file);
      if (!checked.ok) {
        onError?.(checked.message);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    const next = [
      ...localImages,
      ...accepted.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ];
    onLocalImagesChange(next);
    if (!localPrimaryKey && images.length === 0 && next[0]) {
      onLocalPrimaryChange?.(next[0].key);
    }
  }

  function removeLocal(key: string) {
    const target = localImages.find((i) => i.key === key);
    if (target) URL.revokeObjectURL(target.preview);
    const next = localImages.filter((i) => i.key !== key);
    onLocalImagesChange(next);
    if (localPrimaryKey === key) {
      onLocalPrimaryChange?.(next[0]?.key ?? "");
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Label>Product images</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF · max {maxMb} MB each · up to {maxImages}{" "}
            files · always resized on the server
          </p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {totalCount}/{maxImages}
        </span>
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && remaining > 0) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed bg-gradient-to-br from-muted/50 via-background to-brand-tint/30 p-4 transition-colors",
          dragging && "border-brand-primary bg-brand-tint/40",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center sm:py-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
            <Upload className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drag & drop product photos
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Max {maxMb} MB · always resized on the server
            </p>
          </div>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            disabled={disabled || remaining <= 0}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={disabled || remaining <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Choose images
          </Button>
        </div>
      </div>

      {totalCount > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => {
            const isPrimary = primaryId === img.id;
            return (
              <li
                key={img.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl border bg-muted",
                  isPrimary && "ring-2 ring-brand-primary ring-offset-2",
                )}
              >
                <img
                  src={img.path}
                  alt=""
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7"
                    title="Set as primary"
                    disabled={disabled || isPrimary}
                    onClick={() => onSetPrimaryRemote?.(img.id)}
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        isPrimary && "fill-brand-primary text-brand-primary",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7 text-destructive"
                    title="Remove"
                    disabled={disabled}
                    onClick={() => onRemoveRemote?.(img.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {isPrimary ? (
                  <span className="absolute left-2 top-2 rounded-md bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Primary
                  </span>
                ) : null}
              </li>
            );
          })}

          {localImages.map((img) => {
            const isPrimary = localPrimaryKey === img.key;
            return (
              <li
                key={img.key}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl border bg-muted",
                  isPrimary && "ring-2 ring-brand-primary ring-offset-2",
                )}
              >
                <img
                  src={img.preview}
                  alt=""
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7"
                    title="Set as primary"
                    disabled={disabled || isPrimary}
                    onClick={() => onLocalPrimaryChange?.(img.key)}
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        isPrimary && "fill-brand-primary text-brand-primary",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7 text-destructive"
                    title="Remove"
                    disabled={disabled}
                    onClick={() => removeLocal(img.key)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {isPrimary ? (
                  <span className="absolute left-2 top-2 rounded-md bg-brand-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Primary
                  </span>
                ) : (
                  <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    New
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
