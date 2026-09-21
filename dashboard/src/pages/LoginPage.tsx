import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, apiFetch, type StaffUser } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { ApiHealthBadge } from "../components/ApiHealthBadge";

const ROLE_HOME = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
} as const;

export function LoginPage() {
  const navigate = useNavigate();
  const { token, user, setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const data = await apiFetch<{
        token: string;
        home: string;
        user: StaffUser;
      }>("/api/dashboard/auth/login", {
        body: { email, password },
      });
      setSession(data.token, data.user);
      navigate(data.home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Staff login
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Super Admin, Admin, Moderator, and Vendor only.
            </p>
          </div>
          <ApiHealthBadge />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              className="h-11 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-3"
              placeholder="admin@niyenin.local"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              className="h-11 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-3"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 rounded-md bg-[var(--brand-primary)] text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
