import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { ApiError, API_URL, apiUpload } from "@/lib/api";
import {
  checkImageDimensions,
  homeBlockImagePreset,
  imageUploadHint,
} from "@/lib/imagePresets";
import { ImageSizeBadge } from "@/components/dashboard/image-size-badge";
import { ImageFieldError } from "@/components/dashboard/image-field-error";
import { cn } from "@/lib/utils";
import {
  HOME_BLOCK_IMAGE_MAX_BYTES,
  validateHomeBlockImageFile,
} from "@/lib/validators/homeBlocks";
import { Button } from "@/components/ui/button";

const STOREFRONT_URL = (
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined) ??
  "http://localhost:3000"
).replace(/\/$/, "");

/** Resolve storefront `/images`·`/icons` paths and API uploads for dashboard previews. */
export function resolveHomeImagePreview(src: string | null | undefined): string {
  const raw = (src ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/uploads/")) {
    try {
      return new URL(raw, `${API_URL}/`).href;
    } catch {
      return `${API_URL}${raw}`;
    }
  }
  try {
    return new URL(raw.startsWith("/") ? raw : `/${raw}`, `${STOREFRONT_URL}/`)
      .href;
  } catch {
    return `${STOREFRONT_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
}

type UploadResponse = {
  message?: string;
  path: string;
  field: string;
  content?: Record<string, unknown>;
};

type Props = {
  label: string;
  description?: string;
  value: string | null | undefined;
  blockKey: string;
  fieldPath: string;
  token: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  onUploaded: (path: string) => void;
  onSuccess?: (message: string) => void;
};

export function HomeImageField({
  label,
  description,
  value,
  blockKey,
  fieldPath,
  token,
  disabled,
  allowEmpty,
  onUploaded,
  onSuccess,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stored = (value ?? "").trim();
  const preview = resolveHomeImagePreview(stored);
  const hasImage = Boolean(preview) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [preview]);

  async function onFile(file: File | null) {
    if (!file) return;
    setError(null);
    const typeCheck = validateHomeBlockImageFile(file);
    const checked = typeCheck.ok
      ? await checkImageDimensions(file, homeBlockImagePreset(blockKey, fieldPath))
      : typeCheck;
    if (!checked.ok) {
      setError(checked.message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const data = await apiUpload<UploadResponse>(
        `/api/dashboard/home-blocks/${blockKey}/images?field=${encodeURIComponent(fieldPath)}`,
        fd,
        { token },
      );
      setBroken(false);
      onUploaded(data.path);
      onSuccess?.(data.message ?? "Image updated — live on the storefront");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3 transition-colors",
        error ? "border-destructive/60" : "border-border",
      )}
    >
      <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/60">
        {hasImage ? (
          <img
            key={preview}
            src={preview}
            alt=""
            className="size-full object-contain p-1.5 animate-in fade-in zoom-in-95 duration-300"
            onError={() => setBroken(true)}
            onLoad={() => setBroken(false)}
          />
        ) : (
          <div className="flex flex-col items-center gap-0.5 px-1 text-center text-muted-foreground">
            <ImagePlus className="size-5 opacity-50" />
            <span className="text-[9px] leading-tight">
              {allowEmpty && !stored ? "Optional" : "Missing"}
            </span>
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-[10px] font-medium">
            …
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            {label}
            <ImageSizeBadge preset={homeBlockImagePreset(blockKey, fieldPath)} />
          </p>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
            {imageUploadHint(
              homeBlockImagePreset(blockKey, fieldPath),
              Math.floor(HOME_BLOCK_IMAGE_MAX_BYTES / (1024 * 1024)),
            )}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              {stored ? (
                <Upload className="size-3.5" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              {stored ? "Change image" : "Upload image"}
            </>
          )}
        </Button>
        <ImageFieldError message={error} />
      </div>
    </div>
  );
}
