"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon } from "./icons";
import { apiFetch, ApiError, type ApiUser } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const data = await apiFetch<{ token: string; user: ApiUser }>(
        "/api/auth/login",
        { body: { email, password } },
      );
      dispatch(setCredentials(data));
      if (!rememberMe) {
        // token still in localStorage for this session; remember flag reserved for cookie later
      }
      router.push("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full" aria-labelledby="login-heading">
      <h2
        id="login-heading"
        className="text-[28px] sm:text-[32px] font-semibold text-text-primary leading-tight mb-5"
      >
        Login here
      </h2>

      <SocialAuthButtons />
      <OrDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Ex. Maguire@FlexUI.com"
          leadingIcon={<EnvelopeIcon />}
          required
        />

        <AuthInput
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          required
        />

        <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
          />
          <span className="text-sm text-text-secondary">Remember Me?</span>
        </label>

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full h-11 rounded bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </section>
  );
}
