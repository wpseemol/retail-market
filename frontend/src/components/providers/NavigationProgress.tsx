"use client";

import NextTopLoader from "nextjs-toploader";

/** Brand green bar for client-side page changes. Reload uses the boot script. */
export default function NavigationProgress() {
  return (
    <NextTopLoader
      color="#00B207"
      height={3}
      showSpinner={false}
      showForHashAnchor={false}
      shadow="0 0 10px #00B207,0 0 5px #00B207"
      zIndex={100000}
      crawl
      speed={200}
    />
  );
}
