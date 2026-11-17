import { useEffect, useState } from "react";
import { apiDownload } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    void (async () => {
      try {
        const { blob } = await apiDownload(fileUrl, { token });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, token]);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
        Could not load
      </div>
    );
  }
  if (!src) return <Skeleton className="aspect-[4/3] w-full rounded-none" />;
  return (
    <img src={src} alt={alt} className="aspect-[4/3] w-full bg-muted object-cover" />
  );
}
