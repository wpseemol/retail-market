"use client";

import { type FormEvent, useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon, UserIcon } from "./icons";
import { useGoogleIdToken } from "@/hooks/useGoogleIdToken";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import { messageForAuthCode } from "@/lib/authErrors";
import {
  type RegisterField,
  validateRegisterField,
  validateRegisterForm,
} from "@/lib/validators/customerAuth";
import type { ApiUser } from "@/lib/api";

type FieldErrors = Partial<Record<RegisterField, string>>;

export default function SignUpForm() {
  const dispatch = useAppDispatch();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const finishAuth = useCallback(
    (user: ApiUser) => {
      if (user.role !== "customer") {
        setError("Storefront registration creates customer accounts only.");
        return;
      }
      dispatch(setCredentials({ user }));
      window.location.assign("/account");
    },
    [dispatch],
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
            setError(
              messageForAuthCode(result.code, "Google sign-in failed"),
            );
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

  const setFieldValue = (field: RegisterField, value: string) => {
    if (field === "first_name") setFirstName(value);
    else if (field === "last_name") setLastName(value);
    else if (field === "email") setEmail(value);
    else if (field === "password") setPassword(value);
    else setConfirmPassword(value);

    if (touched[field] || fieldErrors[field]) {
      let message: string | undefined;
      if (field === "confirmPassword") {
        if (!value) message = "Confirm your password";
        else if (value !== password) message = "Passwords do not match";
      } else {
        message = validateRegisterField(field, value);
      }

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

  const handleBlur = (field: RegisterField, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    let message: string | undefined;
    if (field === "confirmPassword") {
      if (!value) message = "Confirm your password";
      else if (value !== password) message = "Passwords do not match";
    } else {
      message = validateRegisterField(field, value);
    }
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
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const validated = validateRegisterForm({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      confirmPassword,
    });

    if (!validated.success) {
      setFieldErrors(validated.errors);
      return;
    }

    if (!agreed) {
      setError("Please agree to the terms");
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      try {
        const result = await signIn("register", {
          first_name: validated.data.first_name,
          last_name: validated.data.last_name,
          email: validated.data.email,
          password: validated.data.password,
          redirect: false,
        });
        if (result?.error) {
          setError(
            messageForAuthCode(result.code, "Registration failed"),
          );
          return;
        }
        const session = await getSession();
        if (!session?.backendUser) {
          setError("Registration failed");
          return;
        }
        finishAuth(session.backendUser);
      } catch {
        setError("Sign up failed");
      }
    });
  };

  const displayError = error ?? google.error;
  const loading = isPending || googleLoading;

  return (
    <section className="w-full" aria-labelledby="signup-heading">
      <h1
        id="signup-heading"
        className="text-[28px] sm:text-[32px] font-semibold text-text-primary leading-tight mb-2"
      >
        Customer sign up
      </h1>
      <p className="mb-5 text-sm text-text-secondary">
        Create a shopper account to buy products and manage your profile.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthInput
            name="firstName"
            autoComplete="given-name"
            placeholder="Ex. Max"
            leadingIcon={<UserIcon />}
            value={firstName}
            onChange={(e) => setFieldValue("first_name", e.target.value)}
            onBlur={(e) => handleBlur("first_name", e.target.value)}
            error={fieldErrors.first_name}
          />
          <AuthInput
            name="lastName"
            autoComplete="family-name"
            placeholder="Ex. Maguire"
            leadingIcon={<UserIcon />}
            value={lastName}
            onChange={(e) => setFieldValue("last_name", e.target.value)}
            onBlur={(e) => handleBlur("last_name", e.target.value)}
            error={fieldErrors.last_name}
          />
        </div>

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
          autoComplete="new-password"
          placeholder="Create a password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          value={password}
          onChange={(e) => setFieldValue("password", e.target.value)}
          onBlur={(e) => handleBlur("password", e.target.value)}
          error={fieldErrors.password}
        />

        <AuthInput
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          value={confirmPassword}
          onChange={(e) => setFieldValue("confirmPassword", e.target.value)}
          onBlur={(e) => handleBlur("confirmPassword", e.target.value)}
          error={fieldErrors.confirmPassword}
        />

        <label className="flex items-start gap-2.5 cursor-pointer select-none mt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
          />
          <span className="text-sm text-text-secondary leading-snug">
            I agree to all{" "}
            <Link
              href="/terms"
              className="text-brand-primary font-medium hover:underline"
            >
              Terms &amp; Condition
            </Link>{" "}
            and feeds
          </span>
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
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>
    </section>
  );
}
