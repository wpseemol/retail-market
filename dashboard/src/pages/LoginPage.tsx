import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, apiFetch, type StaffRole, type StaffUser } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { ApiHealthBadge } from "../components/ApiHealthBadge";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

const STOREFRONT_URL =
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000";

const ROLE_OPTIONS: Array<{ value: StaffRole | "any"; label: string }> = [
  { value: "any", label: "Auto-detect from account" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "vendor", label: "Seller" },
];

const ROLE_COPY: Record<
  StaffRole | "any",
  { title: string; description: string }
> = {
  any: {
    title: "Staff login",
    description:
      "Super Admin, Admin, Moderator, and Seller only. Customers use the storefront.",
  },
  super_admin: {
    title: "Super Admin login",
    description: "Sign in to the Super Admin dashboard.",
  },
  admin: {
    title: "Admin login",
    description: "Sign in to the Admin dashboard.",
  },
  moderator: {
    title: "Moderator login",
    description: "Sign in to the Moderator dashboard.",
  },
  vendor: {
    title: "Seller login",
    description: "Sign in to your seller dashboard to manage listings and orders.",
  },
};

function parseRoleParam(value: string | null): StaffRole | "any" {
  if (value === "seller") return "vendor";
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "moderator" ||
    value === "vendor"
  ) {
    return value;
  }
  return "any";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user, setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expectedRole, setExpectedRole] = useState<StaffRole | "any">(() =>
    parseRoleParam(searchParams.get("role")),
  );
  const [showPassword, setShowPassword] = useState(false);
  const copy = ROLE_COPY[expectedRole];

  function onRoleChange(role: StaffRole | "any") {
    setExpectedRole(role);
    const next = new URLSearchParams(searchParams);
    if (role === "any") {
      next.delete("role");
    } else {
      next.set("role", role);
    }
    setSearchParams(next, { replace: true });
  }

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

      if (
        expectedRole !== "any" &&
        data.user.role !== expectedRole &&
        data.user.role !== "super_admin"
      ) {
        setError(
          `This account is ${data.user.role.replace("_", " ")}, not ${expectedRole.replace("_", " ")}.`,
        );
        return;
      }

      setSession(data.token, data.user);
      navigate(data.home);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          `${err.message} Customers should use ${STOREFRONT_URL}/auth/login`,
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg-base">
      <div className="border-b border-border-default bg-bg-subtle/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo/niyenin-dark.png"
              alt="Niyenin"
              className="h-8 w-auto"
            />
            <span className="text-sm font-medium text-text-secondary">
              Staff Dashboard
            </span>
          </div>
          <ApiHealthBadge />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-2 text-[28px] font-semibold leading-tight text-text-primary sm:text-[32px]">
          {copy.title}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">{copy.description}</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Workspace
            </span>
            <select
              value={expectedRole}
              onChange={(e) =>
                onRoleChange(e.target.value as StaffRole | "any")
              }
              className="h-11 rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-primary"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@niyenin.local"
              className="h-11 rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">
              Password
            </span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-11 w-full rounded border border-border-default bg-bg-surface px-3.5 pr-11 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-11 w-full rounded bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Looking to shop?{" "}
          <a
            href={`${STOREFRONT_URL}/auth/login`}
            className="font-medium text-brand-primary hover:underline"
          >
            Customer login
          </a>
        </p>
      </div>
    </main>
  );
}
