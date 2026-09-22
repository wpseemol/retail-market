import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { ApiError, apiFetch, type StaffRole, type StaffUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function LoginPage() {
  const navigate = useNavigate();
  const { token, user, setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (token && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("identifier") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const data = await apiFetch<{
        accessToken?: string;
        refreshToken?: string;
        token: string;
        home: string;
        user: StaffUser;
      }>("/api/dashboard/auth/login", {
        body: { identifier, password },
      });

      const accessToken = data.accessToken ?? data.token;
      setSession(accessToken, data.user, data.refreshToken ?? null);
      navigate(data.home);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          `${err.message} Customers should use ${STOREFRONT_URL}/login`,
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-full items-center justify-center rounded-md bg-brand-primary px-4">
            <img
              src="/logo/niyenin-white.png"
              alt="Niyenin"
              className="h-8 w-auto"
            />
          </div>
          <p className="text-sm font-medium text-text-secondary">Dashboard</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
              Sign in
            </h1>
            <p className="text-sm text-text-secondary">
              Use your username, email, or phone with your password.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Username, email, or phone</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="superadmin, email, or +8801…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Looking to shop?{" "}
          <a
            href={`${STOREFRONT_URL}/login`}
            className="font-medium text-brand-primary hover:underline"
          >
            Customer login
          </a>
        </p>
      </div>
    </main>
  );
}
