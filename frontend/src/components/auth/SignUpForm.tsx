"use client";

import { type FormEvent, useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon, UserIcon } from "./icons";
import { useGoogleIdToken } from "@/hooks/useGoogleIdToken";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import {
  googleLoginAction,
  registerAction,
} from "@/app/actions/auth";
import type { ApiUser } from "@/lib/api";

export default function SignUpForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [agreed, setAgreed] = useState(false);
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
      router.push("/account");
      router.refresh();
    },
    [dispatch, router],
  );

  const handleGoogleCredential = useCallback(
    (payload: { accessToken: string }) => {
      setError(null);
      setGoogleLoading(true);
      startTransition(async () => {
        try {
          const result = await googleLoginAction({
            accessToken: payload.accessToken,
          });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          finishAuth(result.user);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const first_name = String(form.get("firstName") ?? "");
    const last_name = String(form.get("lastName") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreed) {
      setError("Please agree to the terms");
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerAction({
          first_name,
          last_name,
          email,
          password,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        finishAuth(result.user);
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthInput
            name="firstName"
            autoComplete="given-name"
            placeholder="Ex. Max"
            leadingIcon={<UserIcon />}
            required
          />
          <AuthInput
            name="lastName"
            autoComplete="family-name"
            placeholder="Ex. Maguire"
            leadingIcon={<UserIcon />}
            required
          />
        </div>

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
          autoComplete="new-password"
          placeholder="Create a password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          required
          minLength={8}
        />

        <AuthInput
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          required
          minLength={8}
        />

        <label className="flex items-start gap-2.5 cursor-pointer select-none mt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
            required
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
