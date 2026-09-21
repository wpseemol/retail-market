"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { hydrateAuth, setSessionUser } from "@/store/authSlice";
import type { SessionResponse } from "@/lib/api";

export default function AuthHydrator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      dispatch(hydrateAuth());
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (!res.ok) {
          dispatch(setSessionUser(null));
          return;
        }
        const data = (await res.json()) as SessionResponse;
        dispatch(setSessionUser(data.user ?? null));
      } catch {
        if (!cancelled) dispatch(setSessionUser(null));
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}
