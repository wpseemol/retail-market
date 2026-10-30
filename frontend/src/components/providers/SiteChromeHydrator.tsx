"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  hydrateSiteChrome,
  type SiteChromeHydratePayload,
} from "@/store/siteChromeSlice";
import { writeSiteChromeCache } from "@/store/siteChromeCache";

/**
 * Refreshes Redux chrome from the layout server payload and caches it in
 * localStorage so the next full reload can seed the store before first paint.
 * First paint already uses StoreProvider preloadedState (server + cache).
 */
export function SiteChromeHydrator({
  payload,
}: {
  payload: SiteChromeHydratePayload;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateSiteChrome(payload));
    writeSiteChromeCache(payload);
  }, [dispatch, payload]);

  return null;
}
