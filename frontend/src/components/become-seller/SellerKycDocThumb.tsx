"use client";

import { useEffect, useState } from "react";

/** Loads a private KYC image through the storefront BFF (cookie session). */
export function SellerKycDocThumb({
  fileUrl,
  alt,
}: {
  /** API path e.g. `/api/seller-applications/me/documents/1/file` */
  fileUrl: string;
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    const url = fileUrl.startsWith("/api/backend/")
      ? fileUrl
      : fileUrl.startsWith("/api/")
        ? `/api/backend/${fileUrl.slice("/api/".length)}`
        : fileUrl;

    void (async () => {
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
          headers: { Accept: "image/*,application/octet-stream" },
        });
        if (!response.ok) throw new Error("fetch failed");
        const blob = await response.blob();
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
  }, [fileUrl]);

  if (failed) {
    return (
      <div className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-bg-muted text-xs text-text-secondary">
        Could not load
      </div>
    );
  }
  if (!src) {
    return (
      <div className="mt-2 aspect-[4/3] w-full animate-pulse rounded-lg bg-bg-muted" />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="mt-2 aspect-[4/3] w-full rounded-lg bg-bg-muted object-cover"
    />
  );
}
