"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import RecaptchaField from "./RecaptchaField";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon, UserIcon } from "./icons";
import { useSocialLogin } from "@/hooks/useSocialLogin";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import { messageForAuthCode } from "@/lib/authErrors";
import { clearCsrfCache, fetchCsrfToken } from "@/lib/csrf";
import {
  executeRecaptchaV3,
  fetchCaptchaConfig,
  type PublicCaptchaConfig,
} from "@/lib/recaptcha";
import {
  findUnsafeInputReason,
  registerSchema,
} from "@/lib/validators/customerAuth";
import type { ApiUser } from "@/lib/api";
import { authSwitchHref, safeNextPath } from "@/lib/authRedirect";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const signUpFormSchema = registerSchema
  .extend({
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const unsafe = findUnsafeInputReason(data.confirmPassword);
    if (unsafe) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: unsafe,
      });
      return;
    }
    if (!data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Confirm your password",
      });
      return;
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

type SignUpValues = z.infer<typeof signUpFormSchema>;

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = safeNextPath(rawNext);
  const dispatch = useAppDispatch();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [captchaConfig, setCaptchaConfig] = useState<PublicCaptchaConfig | null>(
    null,
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const onCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await fetchCsrfToken();
        const config = await fetchCaptchaConfig();
        if (!cancelled) setCaptchaConfig(config);
      } catch {
        /* submit will refresh CSRF */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishAuth = (user: ApiUser) => {
    if (user.role !== "customer") {
      setError("Storefront registration creates customer accounts only.");
      return;
    }
    dispatch(setCredentials({ user }));
    window.location.assign(nextPath);
  };

  const social = useSocialLogin(finishAuth);

  const onSubmit = (values: SignUpValues) => {
    setError(null);
    if (!agreed) {
      setError("Please agree to the terms");
      return;
    }

    startTransition(async () => {
      try {
        const csrfToken = await fetchCsrfToken();
        let nextCaptcha = captchaToken;
        if (
          captchaConfig?.enabled &&
          captchaConfig.version === "v3" &&
          captchaConfig.site_key
        ) {
          nextCaptcha = await executeRecaptchaV3(
            captchaConfig.site_key,
            "register",
          );
        }
        if (captchaConfig?.enabled && !nextCaptcha) {
          setError("Please complete the captcha and try again.");
          return;
        }

        const result = await signIn("register", {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          password: values.password,
          csrfToken,
          captchaToken: nextCaptcha ?? "",
          redirect: false,
        });
        if (result?.error) {
          clearCsrfCache();
          setCaptchaToken(null);
          setCaptchaResetKey((k) => k + 1);
          void fetchCsrfToken(true).catch(() => undefined);
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
        clearCsrfCache();
        setCaptchaResetKey((k) => k + 1);
        setError("Sign up failed");
      }
    });
  };

  const displayError = error ?? social.error;
  const loading = isPending || social.loadingProvider !== null;

  return (
    <section className="w-full" aria-labelledby="signup-heading">
      <h1
        id="signup-heading"
        className="text-7 sm:text-8 font-semibold text-text-primary leading-tight mb-2"
      >
        Sign up
      </h1>
      <p className="mb-5 text-sm text-text-secondary">
        Create a shopper account to buy products and manage your profile.
      </p>

      {social.hasAny ? (
        <>
          <SocialAuthButtons
            enabled={social.enabled}
            onSelect={(provider) => {
              setError(null);
              social.start(provider);
            }}
            loadingProvider={social.loadingProvider}
            disabled={loading}
          />
          <OrDivider />
        </>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthInput
                      {...field}
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="Ex. Max"
                      leadingIcon={<UserIcon />}
                      error={form.formState.errors.first_name?.message}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AuthInput
                      {...field}
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="Ex. Maguire"
                      leadingIcon={<UserIcon />}
                      error={form.formState.errors.last_name?.message}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <AuthInput
                    {...field}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Ex. Maguire@FlexUI.com"
                    leadingIcon={<EnvelopeIcon />}
                    error={form.formState.errors.email?.message}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage className="sr-only" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <AuthInput
                    {...field}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    leadingIcon={<LockIcon />}
                    showPasswordToggle
                    error={form.formState.errors.password?.message}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage className="sr-only" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <AuthInput
                    {...field}
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    leadingIcon={<LockIcon />}
                    showPasswordToggle
                    error={form.formState.errors.confirmPassword?.message}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage className="sr-only" />
              </FormItem>
            )}
          />

          <label className="flex items-start gap-2.5 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
            />
            <span className="text-sm text-text-secondary leading-snug">
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-brand-primary font-medium hover:underline"
              >
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="text-brand-primary font-medium hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <RecaptchaField
            config={captchaConfig}
            onToken={onCaptchaToken}
            resetKey={captchaResetKey}
          />

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
      </Form>

      <p className="mt-6 mb-0 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href={authSwitchHref("/login", rawNext)}
          scroll={false}
          className="font-semibold text-brand-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </section>
  );
}
