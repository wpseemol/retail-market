import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type AuthSessionGuardProps = {
  children: ReactNode;
};

/**
 * Secure dashboard session guard:
 * - Requires access + refresh tokens
 * - Re-validates `/me` on mount, tab focus, and every 60s
 * - If refresh is expired/revoked, apiFetch force-logs the user out
 */
export function AuthSessionGuard({ children }: AuthSessionGuardProps) {
  const location = useLocation();
  const { token, refreshToken, user, setSession, logout } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const state = useAuthStore.getState();
      if (!state.token || !state.refreshToken || !state.user) {
        if (!cancelled) {
          setValid(false);
          setReady(true);
        }
        return;
      }

      try {
        const data = await apiFetch<{ user: NonNullable<typeof state.user> }>(
          "/api/dashboard/auth/me",
        );
        if (cancelled) return;

        const latest = useAuthStore.getState();
        if (data.user && latest.token) {
          setSession(latest.token, data.user, latest.refreshToken);
        }
        setValid(true);
      } catch {
        if (cancelled) return;
        logout();
        setValid(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void validate();

    function onFocus() {
      void validate();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onFocus();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(onFocus, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [token, refreshToken, user?.id, setSession, logout]);

  if (!token || !refreshToken || !user) {
    return (
      <Navigate
        to="/login?reason=session_expired"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking secure session…
      </div>
    );
  }

  if (!valid) {
    return <Navigate to="/login?reason=session_expired" replace />;
  }

  return <>{children}</>;
}
