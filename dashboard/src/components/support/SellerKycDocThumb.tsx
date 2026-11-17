import { useEffect, useState } from "react";
import { apiDownload } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type ThumbState = {
  forUrl: string;
  src: string;
  failed: boolean;
};

/** Loads a private KYC image with the staff Bearer token (img src cannot send Auth). */
export function SellerKycDocThumb({
  fileUrl,
  token,
  alt,
}: {
  fileUrl: string;
  token: string;
  alt: string;
}) {
  const [state, setState] = useState<ThumbState>({
    forUrl: fileUrl,
    src: "",
    failed: false,
  });

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    void (async () => {
      try {
        const { blob } = await apiDownload(fileUrl, { token });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ forUrl: fileUrl, src: objectUrl, failed: false });
      } catch {
        if (!cancelled) {
          setState({ forUrl: fileUrl, src: "", failed: true });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, token]);

  const ready = state.forUrl === fileUrl;
  const failed = ready && state.failed;
  const src = ready ? state.src : "";

  if (failed) {
    return (
      <div className="flex aspect-4/3 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
        Could not load
      </div>
    );
  }
  if (!src) return <Skeleton className="aspect-4/3 w-full rounded-none" />;
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-4/3 w-full bg-muted object-cover"
    />
  );
}
