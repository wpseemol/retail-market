import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type AuthSessionGuardProps = {
  children: ReactNode;
};

/**
 * Soft session check for dashboard staff.
 * - Requires access + refresh tokens
 * - Quietly re-validates `/me` on mount (and debounced tab focus)
 * - Does NOT logout on network blips or tab switches
 * - True expiry is handled by apiFetch → forceLogout("session_expired")
 */
export function AuthSessionGuard({ children }: AuthSessionGuardProps) {
  const location = useLocation();
  const { token, refreshToken, user, setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function validate() {
      if (inFlight) return;
      const state = useAuthStore.getState();
      if (!state.token || !state.refreshToken || !state.user) {
        if (!cancelled) setReady(true);
        return;
      }

      inFlight = true;
      try {
        const data = await apiFetch<{ user: NonNullable<typeof state.user> }>(
          "/api/dashboard/auth/me",
        );
        if (cancelled) return;
        if (data.user) setUser(data.user);
      } catch (err) {
        // apiFetch already force-logs out on real session expiry (401 after refresh fail).
        // Network / 5xx must not clear a still-valid tab session.
        if (
          err instanceof ApiError &&
          err.status === 401 &&
          (err.code === "SESSION_EXPIRED" || err.code === "SESSION_REVOKED")
        ) {
          return;
        }
      } finally {
        inFlight = false;
        if (!cancelled) setReady(true);
      }
    }

    void validate();

    let focusTimer: number | undefined;
    function onFocus() {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        void validate();
      }, 800);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onFocus();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, setUser]);

  if (!token || !refreshToken || !user) {
    return (
      <Navigate to="/login" replace state={{ from: location }} />
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  }

  return <>{children}</>;
}
