"use client";

import { type FormEvent, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon } from "./icons";
import { apiFetch, ApiError, type SessionResponse } from "@/lib/api";
import {
  type LoginField,
  validateLoginField,
  validateLoginForm,
} from "@/lib/validators/customerAuth";
import { useGoogleIdToken } from "@/hooks/useGoogleIdToken";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import { dashboardLoginUrl } from "@/config/site";

const DASHBOARD_LOGIN_URL = dashboardLoginUrl();

const STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "moderator",
  "vendor",
]);

type FieldErrors = Partial<Record<LoginField, string>>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/account";
  const dispatch = useAppDispatch();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = useCallback(
    (data: SessionResponse) => {
      if (!data.user) {
        setError("Login succeeded but no user was returned");
        return;
      }

      if (STAFF_ROLES.has(data.user.role)) {
        setError(
          `Staff accounts cannot sign in here. Use the dashboard: ${DASHBOARD_LOGIN_URL}`,
        );
        return;
      }

      if (data.user.role !== "customer") {
        setError("Only customer accounts can sign in on the storefront.");
        return;
      }

      dispatch(setCredentials({ user: data.user }));
      void rememberMe;
      router.push(nextPath.startsWith("/") ? nextPath : "/account");
    },
    [dispatch, rememberMe, router, nextPath],
  );

  const handleGoogleCredential = useCallback(
    async (payload: { accessToken: string }) => {
      setError(null);
      setGoogleLoading(true);
      try {
        const data = await apiFetch<SessionResponse>(
          "/api/auth/session/google",
          { body: { accessToken: payload.accessToken } },
        );
        finishAuth(data);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Google sign-in failed",
        );
      } finally {
        setGoogleLoading(false);
      }
    },
    [finishAuth],
  );

  const google = useGoogleIdToken(handleGoogleCredential);

  const setFieldValue = (field: LoginField, value: string) => {
    if (field === "email") setEmail(value);
    else setPassword(value);

    if (touched[field] || fieldErrors[field]) {
      const message = validateLoginField(field, value);
      setFieldErrors((prev) => {
        if (!message) {
          if (!(field in prev)) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        }
        if (prev[field] === message) return prev;
        return { ...prev, [field]: message };
      });
    }
  };

  const handleBlur = (field: LoginField, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const message = validateLoginField(field, value);
    setFieldErrors((prev) => {
      if (!message) {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTouched({ email: true, password: true });

    const result = validateLoginForm({ email, password });
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const data = await apiFetch<SessionResponse>("/api/auth/session/login", {
        body: result.data,
      });
      finishAuth(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "USE_GOOGLE") {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 403) {
        setError(
          `${err.message} Open ${DASHBOARD_LOGIN_URL} for staff access.`,
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const displayError = error ?? google.error;

  return (
    <section className="w-full" aria-labelledby="login-heading">
      <h2
        id="login-heading"
        className="text-[28px] sm:text-[32px] font-semibold text-text-primary leading-tight mb-2"
      >
        Customer login
      </h2>
      <p className="mb-5 text-sm text-text-secondary">
        For shoppers only. Super Admin, Admin, Moderator, and Vendor must use
        the{" "}
        <a
          href={DASHBOARD_LOGIN_URL}
          className="font-medium text-brand-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          dashboard login
        </a>
        .
      </p>

      <SocialAuthButtons
        onGoogleClick={() => {
          setError(null);
          google.clearError();
          google.promptGoogleSignIn();
        }}
        googleLoading={googleLoading}
        disabled={loading}
      />
      <OrDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <AuthInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Ex. Maguire@FlexUI.com"
          leadingIcon={<EnvelopeIcon />}
          value={email}
          onChange={(e) => setFieldValue("email", e.target.value)}
          onBlur={(e) => handleBlur("email", e.target.value)}
          error={fieldErrors.email}
        />

        <AuthInput
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          value={password}
          onChange={(e) => setFieldValue("password", e.target.value)}
          onBlur={(e) => handleBlur("password", e.target.value)}
          error={fieldErrors.password}
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

        {displayError ? (
          <p className="text-sm text-rose-600" role="alert">
            {displayError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="mt-1 w-full h-11 rounded bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </section>
  );
}
