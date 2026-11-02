"use client";

import { useEffect } from "react";

const BOOT_BAR_ID = "rm-boot-bar";

/**
 * Finishes the SSR reload bar (real DOM in layout — no `<script>`).
 * Client navigations use `NavigationProgress` / nextjs-toploader instead.
 */
export default function BootProgress() {
  useEffect(() => {
    const bar = document.getElementById(BOOT_BAR_ID);
    if (!bar) return;

    bar.classList.add("rm-boot-bar--done");
    const hide = window.setTimeout(() => {
      bar.classList.add("rm-boot-bar--hide");
      window.setTimeout(() => bar.remove(), 200);
    }, 180);

    return () => window.clearTimeout(hide);
  }, []);

  return null;
}

export { BOOT_BAR_ID };
