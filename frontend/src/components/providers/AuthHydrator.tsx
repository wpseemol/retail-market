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
  const sessionError = data?.error;
  const userKey = backendUser
    ? `${backendUser.id}|${backendUser.email_verified_at ?? ""}|${backendUser.phone_verified_at ?? ""}|${backendUser.avatar_id ?? ""}|${backendUser.avatar?.path ?? ""}|${backendUser.avatar_preset ?? ""}|${backendUser.has_password ? "1" : "0"}|${sessionError ?? ""}`
    : "";

  useEffect(() => {
    // Keep SSR-seeded Redux user while Auth.js is still resolving — wiping here
    // made the header flip to Login on product pages before the session settled.
    if (status === "loading") return;

    if (
      status === "authenticated" &&
      backendUser &&
      sessionError !== "RefreshTokenError"
    ) {
      dispatch(setSessionUser(backendUser));
      return;
    }

    if (status === "unauthenticated" || sessionError === "RefreshTokenError") {
      dispatch(setSessionUser(null));
      return;
    }

    // Authenticated shell without a customer profile — treat as guest.
    dispatch(hydrateAuth());
    if (!backendUser) dispatch(setSessionUser(null));
    // userKey tracks meaningful profile fields; avoid depending on session object identity.
  }, [dispatch, status, userKey, sessionError, backendUser]);

  return null;
}
