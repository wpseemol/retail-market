"use client";

import { type FormEvent, useCallback, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon } from "./icons";
import {
  type LoginField,
  validateLoginField,
  validateLoginForm,
} from "@/lib/validators/customerAuth";
import { useGoogleIdToken } from "@/hooks/useGoogleIdToken";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import { dashboardLoginUrl } from "@/config/site";
import type { ApiUser } from "@/lib/api";

const DASHBOARD_LOGIN_URL = dashboardLoginUrl();

const STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "moderator",
  "vendor",
]);

type FieldErrors = Partial<Record<LoginField, string>>;

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  if (raw === "/login" || raw === "/register" || raw.startsWith("/auth/")) {
    return "/account";
  }
  return raw;
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const dispatch = useAppDispatch();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = useCallback(
    (user: ApiUser) => {
      if (STAFF_ROLES.has(user.role)) {
        setError(
          `Staff accounts cannot sign in here. Use the dashboard: ${DASHBOARD_LOGIN_URL}`,
        );
        return;
      }

      if (user.role !== "customer") {
        setError("Only customer accounts can sign in on the storefront.");
        return;
      }

      dispatch(setCredentials({ user }));
      void rememberMe;
      // Full navigation so middleware + Auth.js cookie are in sync
      window.location.assign(nextPath);
    },
    [dispatch, rememberMe, nextPath],
  );

  const handleGoogleCredential = useCallback(
    (payload: { accessToken: string }) => {
      setError(null);
      setGoogleLoading(true);
      startTransition(async () => {
        try {
          const result = await signIn("google-backend", {
            accessToken: payload.accessToken,
            redirect: false,
          });
          if (result?.error) {
            setError("Google sign-in failed");
            return;
          }
          const session = await getSession();
          if (!session?.backendUser) {
            setError("Google sign-in failed");
            return;
          }
          finishAuth(session.backendUser);
        } catch {
          setError("Google sign-in failed");
        } finally {
          setGoogleLoading(false);
        }
      });
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTouched({ email: true, password: true });

    const validated = validateLoginForm({ email, password });
    if (!validated.success) {
      setFieldErrors(validated.errors);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      try {
        // Client signIn sets the httpOnly cookie; avoid Server Action auth() race.
        const result = await signIn("credentials", {
          email: validated.data.email,
          password: validated.data.password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
          return;
        }

        const session = await getSession();
        if (!session?.backendUser) {
          setError("Login failed");
          return;
        }

        finishAuth(session.backendUser);
      } catch {
        setError("Login failed");
      }
    });
  };

  const displayError = error ?? google.error;
  const loading = isPending || googleLoading;

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
          disabled={loading}
          className="mt-1 w-full h-11 rounded bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>
    </section>
  );
}
