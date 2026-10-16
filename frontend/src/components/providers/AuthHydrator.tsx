"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/store/hooks";
import { hydrateAuth, setSessionUser } from "@/store/authSlice";

/** Sync Auth.js session → Redux (UI only; tokens stay in httpOnly cookie). */
export default function AuthHydrator() {
  const dispatch = useAppDispatch();
  const { data, status } = useSession();
  const backendUser = data?.backendUser;
  const userKey = backendUser
    ? `${backendUser.id}|${backendUser.email_verified_at ?? ""}|${backendUser.phone_verified_at ?? ""}|${backendUser.avatar_id ?? ""}`
    : "";

  useEffect(() => {
    if (status === "loading") return;

    dispatch(hydrateAuth());
    if (status === "authenticated" && backendUser) {
      dispatch(setSessionUser(backendUser));
    } else {
      dispatch(setSessionUser(null));
    }
    // userKey tracks meaningful profile fields; avoid depending on session object identity.
  }, [dispatch, status, userKey]); // eslint-disable-line react-hooks/exhaustive-deps -- backendUser via userKey

  return null;
}
