"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import RecaptchaField from "./RecaptchaField";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon } from "./icons";
import { loginSchema, type LoginInput } from "@/lib/validators/customerAuth";
import { messageForAuthCode } from "@/lib/authErrors";
import { clearCsrfCache, fetchCsrfToken } from "@/lib/csrf";
import {
  executeRecaptchaV3,
  fetchCaptchaConfig,
  type PublicCaptchaConfig,
} from "@/lib/recaptcha";
import { useSocialLogin } from "@/hooks/useSocialLogin";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import type { ApiUser } from "@/lib/api";
import { authSwitchHref, safeNextPath } from "@/lib/authRedirect";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const STAFF_ROLES = new Set([
  "super_admin",
  "admin",
  "moderator",
  "vendor",
]);

export default function LoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = safeNextPath(rawNext);
  const dispatch = useAppDispatch();
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [captchaConfig, setCaptchaConfig] = useState<PublicCaptchaConfig | null>(
    null,
  );
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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

  const finishAuth = useCallback(
    (user: ApiUser) => {
      if (STAFF_ROLES.has(user.role) || user.role !== "customer") {
        setError("Invalid email or password");
        return;
      }

      dispatch(setCredentials({ user }));
      void rememberMe;
      window.location.assign(nextPath);
    },
    [dispatch, rememberMe, nextPath],
  );

  const social = useSocialLogin(finishAuth);

  const onSubmit = (values: LoginInput) => {
    setError(null);
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
            "login",
          );
        }
        if (captchaConfig?.enabled && !nextCaptcha) {
          setError("Please complete the captcha and try again.");
          return;
        }

        const result = await signIn("credentials", {
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
            messageForAuthCode(result.code, "Invalid email or password"),
          );
          return;
        }

        const session = await getSession();
        if (!session?.backendUser) {
          setError("Login failed");
          return;
        }

        finishAuth(session.backendUser);
      } catch {
        clearCsrfCache();
        setCaptchaResetKey((k) => k + 1);
        setError("Login failed");
      }
    });
  };

  const displayError = error ?? social.error;
  const loading = isPending || social.loadingProvider !== null;

  return (
    <section className="w-full" aria-labelledby="login-heading">
      <h1
        id="login-heading"
        className="text-7 sm:text-8 font-semibold text-text-primary leading-tight mb-2"
      >
        Welcome
      </h1>
      <p className="mb-5 text-sm text-text-secondary">
        Sign in to your account
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
                    autoComplete="current-password"
                    placeholder="Enter your password"
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

          <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
            />
            <span className="text-sm text-text-secondary">Remember Me?</span>
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
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </Form>

      <p className="mt-6 mb-0 text-center text-sm text-text-secondary">
        New here?{" "}
        <Link
          href={authSwitchHref("/register", rawNext)}
          scroll={false}
          className="font-semibold text-brand-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
