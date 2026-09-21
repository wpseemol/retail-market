"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { hydrateAuth, setSessionUser } from "@/store/authSlice";
import { getSessionAction } from "@/app/actions/auth";

export default function AuthHydrator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      dispatch(hydrateAuth());
      try {
        const data = await getSessionAction();
        if (cancelled) return;
        dispatch(setSessionUser(data.user));
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
