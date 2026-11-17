"use client";

import { useEffect, useState } from "react";

type ThumbState = {
  /** `fileUrl` this state belongs to — mismatch means a newer URL is loading. */
  forUrl: string;
  src: string;
  failed: boolean;
};

/** Loads a private KYC image through the storefront BFF (cookie session). */
export function SellerKycDocThumb({
  fileUrl,
  alt,
}: {
  /** API path e.g. `/api/seller-applications/me/documents/1/file` */
  fileUrl: string;
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
        // setState only in the async callback — not synchronously in the effect body.
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
  }, [fileUrl]);

  const ready = state.forUrl === fileUrl;
  const failed = ready && state.failed;
  const src = ready ? state.src : "";

  if (failed) {
    return (
      <div className="mt-2 flex aspect-4/3 w-full items-center justify-center rounded-lg bg-bg-muted text-xs text-text-secondary">
        Could not load
      </div>
    );
  }
  if (!src) {
    return (
      <div className="mt-2 aspect-4/3 w-full animate-pulse rounded-lg bg-bg-muted" />
    );
  }
  return (
    // Blob object URL from the BFF — plain <img>, not next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="mt-2 aspect-4/3 w-full rounded-lg bg-bg-muted object-cover"
    />
  );
}
