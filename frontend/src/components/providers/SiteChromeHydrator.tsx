"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  hydrateSiteChrome,
  type SiteChromeHydratePayload,
} from "@/store/siteChromeSlice";

export function SiteChromeHydrator({
  payload,
}: {
  payload: SiteChromeHydratePayload;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateSiteChrome(payload));
  }, [dispatch, payload]);

  return null;
}
