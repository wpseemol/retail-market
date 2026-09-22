"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/store/hooks";
import { hydrateAuth, setSessionUser } from "@/store/authSlice";

/** Sync Auth.js session → Redux (UI only; tokens stay in httpOnly cookie). */
export default function AuthHydrator() {
  const dispatch = useAppDispatch();
  const { data, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    dispatch(hydrateAuth());
    if (status === "authenticated" && data?.backendUser) {
      dispatch(setSessionUser(data.backendUser));
    } else {
      dispatch(setSessionUser(null));
    }
  }, [dispatch, data, status]);

  return null;
}
