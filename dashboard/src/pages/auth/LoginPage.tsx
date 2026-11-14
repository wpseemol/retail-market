import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ApiError, apiFetch, type StaffRole, type StaffUser } from "@/lib/api";
import { useLoginBranding } from "@/lib/siteBranding";
import { staffLoginSchema, type StaffLoginValues } from "@/lib/validators/auth";
import {
  recoveryCodeSchema,
  totpCodeSchema,
  type RecoveryCodeValues,
  type TotpCodeValues,
} from "@/lib/validators/twoFactor";
import { useAuthStore } from "@/store/auth";
import { FadeUp, MotionProvider } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

type LoginStep = "password" | "challenge" | "setup" | "recovery_codes";

type SetupPayload = {
  secret: string;
  otpauth_url: string;
  setupToken: string;
};

function LogoTile({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex h-11 items-center self-start rounded-lg bg-brand-primary px-3.5">
      <img src={src} alt={alt} className="h-7 w-auto" />
    </span>
  );
}

function applySession(
  setSession: (
    token: string,
    user: StaffUser,
    refreshToken?: string | null,
  ) => void,
  data: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
    user: StaffUser;
    home: string;
  },
) {
  const accessToken = data.accessToken ?? data.token;
  if (!accessToken || !data.refreshToken) {
    throw new ApiError(
      "Login did not return a secure session. Please try again.",
      500,
    );
  }
  setSession(accessToken, data.user, data.refreshToken);
  return data.home;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, refreshToken, user, setSession } = useAuthStore();
  const { logoUrl, siteName } = useLoginBranding();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>("password");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [pendingHome, setPendingHome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordForm = useForm<StaffLoginValues>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const totpForm = useForm<TotpCodeValues>({
    resolver: zodResolver(totpCodeSchema),
    defaultValues: { code: "" },
  });
  const recoveryForm = useForm<RecoveryCodeValues>({
    resolver: zodResolver(recoveryCodeSchema),
    defaultValues: { code: "" },
  });

  const sessionNotice = useMemo(() => {
    const reason = searchParams.get("reason");
    if (reason === "idle_timeout") {
      return "You were signed out after 1 hour of inactivity (secure staff session). Sign in again to continue.";
    }
    if (reason === "session_expired") {
      return "You were signed out because your session expired. Sign in again to pick up where you left off.";
    }
    return null;
  }, [searchParams]);

  if (token && refreshToken && user && step === "password") {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  function resetToPassword() {
    setStep("password");
    setChallengeToken(null);
    setSetup(null);
    setUseRecovery(false);
    setError(null);
    totpForm.reset({ code: "" });
    recoveryForm.reset({ code: "" });
    passwordForm.resetField("password");
  }

  async function onPasswordSubmit(values: StaffLoginValues) {
    setError(null);
    try {
      const data = await apiFetch<{
        accessToken?: string;
        refreshToken?: string;
        token?: string;
        home?: string;
        user?: StaffUser;
        code?: string;
        challengeToken?: string;
        setupToken?: string;
        message?: string;
      }>("/api/dashboard/auth/login", {
        body: {
          identifier: values.identifier.trim(),
          password: values.password,
        },
        skipRefresh: true,
      });

      if (data.code === "TWO_FACTOR_REQUIRED" && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setUseRecovery(false);
        setStep("challenge");
        totpForm.reset({ code: "" });
        return;
      }

      if (data.code === "TWO_FACTOR_SETUP_REQUIRED" && data.setupToken) {
        setBusy(true);
        try {
          const setupData = await apiFetch<SetupPayload>(
            "/api/dashboard/auth/2fa/setup",
            {
              body: { setupToken: data.setupToken },
              skipRefresh: true,
            },
          );
          setSetup(setupData);
          setStep("setup");
          totpForm.reset({ code: "" });
        } finally {
          setBusy(false);
        }
        return;
      }

      if (!data.user || !data.home) {
        throw new ApiError("Unexpected login response", 500);
      }
      const home = applySession(setSession, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        token: data.token,
        user: data.user,
        home: data.home,
      });
      navigate(home);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          `${err.message} Customers should use ${STOREFRONT_URL}/login`,
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Login failed");
      }
      passwordForm.resetField("password");
      passwordForm.setFocus("password");
    }
  }

  async function onChallengeSubmit(values: TotpCodeValues | RecoveryCodeValues) {
    if (!challengeToken) return;
    setError(null);
    try {
      const data = await apiFetch<{
        accessToken?: string;
        refreshToken?: string;
        token?: string;
        home: string;
        user: StaffUser;
      }>("/api/dashboard/auth/login/2fa", {
        body: {
          challengeToken,
          code: values.code.trim(),
          recovery: useRecovery || undefined,
        },
        skipRefresh: true,
      });
      const home = applySession(setSession, data);
      navigate(home);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Verification failed",
      );
      if (useRecovery) {
        recoveryForm.reset({ code: "" });
        recoveryForm.setFocus("code");
      } else {
        totpForm.reset({ code: "" });
        totpForm.setFocus("code");
      }
    }
  }

  async function onSetupConfirm(values: TotpCodeValues) {
    if (!setup) return;
    setError(null);
    try {
      const data = await apiFetch<{
        accessToken?: string;
        refreshToken?: string;
        token?: string;
        home: string;
        user: StaffUser;
        recovery_codes: string[];
      }>("/api/dashboard/auth/2fa/confirm", {
        body: {
          setupToken: setup.setupToken,
          code: values.code.trim(),
        },
        skipRefresh: true,
      });
      const home = applySession(setSession, data);
      setRecoveryCodes(data.recovery_codes ?? []);
      setPendingHome(home);
      setStep("recovery_codes");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not confirm authenticator",
      );
      totpForm.reset({ code: "" });
      totpForm.setFocus("code");
    }
  }

  async function copySecret() {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
    } catch {
      /* ignore */
    }
  }

  const year = new Date().getFullYear();
  const submitting =
    passwordForm.formState.isSubmitting ||
    totpForm.formState.isSubmitting ||
    recoveryForm.formState.isSubmitting ||
    busy;

  const title =
    step === "challenge"
      ? useRecovery
        ? "Recovery code"
        : "Authenticator code"
      : step === "setup"
        ? "Set up authenticator"
        : step === "recovery_codes"
          ? "Save recovery codes"
          : "Sign in";

  const subtitle =
    step === "challenge"
      ? useRecovery
        ? "Enter one of your single-use recovery codes."
        : "Open your authenticator app and enter the 6-digit code."
      : step === "setup"
        ? "Admins must enable an authenticator app before accessing the dashboard."
        : step === "recovery_codes"
          ? "Store these codes somewhere safe. Each can be used once if you lose your phone."
          : "Use your username, email or phone number.";

  return (
    <MotionProvider>
      <main className="grid min-h-screen bg-bg-base lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b2e10] px-12 py-10 text-white lg:flex">
          <LogoTile src={logoUrl} alt={siteName} />

          <div className="max-w-sm">
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-white/50">
              Staff dashboard
            </p>
            <p className="mt-4 text-[26px] font-medium leading-snug text-white/95">
              Orders, stores, products and reviews for {siteName} — managed from
              one place.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Admins, moderators and store owners sign in here. Your role
              decides what you can see after you log in.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/45">
            <span>
              © {year} {siteName}
            </span>
            <span>Need an account? Ask your admin.</span>
          </div>
        </aside>

        <section className="flex flex-col px-6 py-10 sm:px-10">
          <div className="lg:hidden">
            <LogoTile src={logoUrl} alt={siteName} />
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <FadeUp className="w-full max-w-95">
              <h1 className="text-[26px] font-semibold tracking-tight text-text-primary">
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>

              {sessionNotice && step === "password" ? (
                <p
                  className="mt-6 border-l-2 border-warning bg-warning/10 px-3 py-2.5 text-sm leading-relaxed text-text-primary"
                  role="status"
                >
                  {sessionNotice}
                </p>
              ) : null}

              {step === "password" ? (
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="mt-8 space-y-5"
                    noValidate
                  >
                    <FormField
                      control={passwordForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username, email or phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              autoComplete="username"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="e.g. rahim or +8801…"
                              className="h-11"
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                className="h-11 pr-11"
                                disabled={submitting}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              {showPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {error ? (
                      <p
                        className="rounded-md border border-error/30 bg-error/5 px-3 py-2.5 text-sm leading-relaxed text-error"
                        role="alert"
                      >
                        {error}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="h-11 w-full text-[15px]"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </form>
                </Form>
              ) : null}

              {step === "challenge" ? (
                <div className="mt-8 space-y-5">
                  {useRecovery ? (
                    <Form {...recoveryForm}>
                      <form
                        onSubmit={recoveryForm.handleSubmit(onChallengeSubmit)}
                        className="space-y-5"
                        noValidate
                      >
                        <FormField
                          control={recoveryForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recovery code</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  autoComplete="one-time-code"
                                  className="h-11 font-mono uppercase"
                                  placeholder="XXXX-XXXX-XXXX"
                                  disabled={submitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {error ? (
                          <p
                            className="rounded-md border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error"
                            role="alert"
                          >
                            {error}
                          </p>
                        ) : null}
                        <Button
                          type="submit"
                          className="h-11 w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Verifying…
                            </>
                          ) : (
                            "Verify recovery code"
                          )}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...totpForm}>
                      <form
                        onSubmit={totpForm.handleSubmit(onChallengeSubmit)}
                        className="space-y-5"
                        noValidate
                      >
                        <FormField
                          control={totpForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>6-digit code</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="h-11 tracking-[0.3em]"
                                  placeholder="000000"
                                  maxLength={6}
                                  disabled={submitting}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {error ? (
                          <p
                            className="rounded-md border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error"
                            role="alert"
                          >
                            {error}
                          </p>
                        ) : null}
                        <Button
                          type="submit"
                          className="h-11 w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Verifying…
                            </>
                          ) : (
                            "Verify and continue"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-text-secondary underline decoration-border underline-offset-4 hover:text-text-primary"
                      onClick={() => {
                        setUseRecovery((v) => !v);
                        setError(null);
                        totpForm.reset({ code: "" });
                        recoveryForm.reset({ code: "" });
                      }}
                    >
                      {useRecovery
                        ? "Use authenticator code"
                        : "Use a recovery code"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
                      onClick={resetToPassword}
                    >
                      <ArrowLeft className="size-3.5" />
                      Back
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "setup" && setup ? (
                <div className="mt-8 space-y-5">
                  <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-5">
                    <QRCodeSVG
                      value={setup.otpauth_url}
                      size={168}
                      level="M"
                      includeMargin={false}
                    />
                    <div className="w-full space-y-1.5 text-center">
                      <p className="text-xs text-text-secondary">
                        Or enter this key manually
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all rounded-md bg-muted px-2.5 py-2 text-left text-xs font-medium tracking-wide">
                          {setup.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => void copySecret()}
                          aria-label="Copy secret"
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Form {...totpForm}>
                    <form
                      onSubmit={totpForm.handleSubmit(onSetupConfirm)}
                      className="space-y-5"
                      noValidate
                    >
                      <FormField
                        control={totpForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm with a code</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                className="h-11 tracking-[0.3em]"
                                placeholder="000000"
                                maxLength={6}
                                disabled={submitting}
                              />
                            </FormControl>
                            <FormDescription>
                              Google Authenticator, Authy, or any TOTP app.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {error ? (
                        <p
                          className="rounded-md border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error"
                          role="alert"
                        >
                          {error}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        className="h-11 w-full"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Enabling…
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-4" />
                            Enable and sign in
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                    onClick={resetToPassword}
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to password
                  </button>
                </div>
              ) : null}

              {step === "recovery_codes" && recoveryCodes ? (
                <div className="mt-8 space-y-5">
                  <ul className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm sm:grid-cols-2">
                    {recoveryCodes.map((code) => (
                      <li
                        key={code}
                        className="rounded-md bg-muted px-2.5 py-1.5 tracking-wide"
                      >
                        {code}
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="h-11 w-full"
                    onClick={() => navigate(pendingHome ?? "/")}
                  >
                    I saved my codes — continue
                  </Button>
                </div>
              ) : null}

              {step === "password" ? (
                <p className="mt-10 border-t border-border pt-5 text-sm text-text-secondary">
                  Shopping on {siteName}?{" "}
                  <a
                    href={`${STOREFRONT_URL}/login`}
                    className="inline-flex items-center gap-0.5 font-medium text-text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-brand-primary"
                  >
                    Customer sign-in
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </p>
              ) : null}
            </FadeUp>
          </div>

          <p className="text-xs text-text-secondary lg:hidden">
            © {year} {siteName}
          </p>
        </section>
      </main>
    </MotionProvider>
  );
}
