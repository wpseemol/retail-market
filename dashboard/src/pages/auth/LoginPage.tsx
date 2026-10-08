import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, apiFetch, type StaffRole, type StaffUser } from "@/lib/api";
import { useLoginBranding } from "@/lib/siteBranding";
import { staffLoginSchema, type StaffLoginValues } from "@/lib/validators/auth";
import { useAuthStore } from "@/store/auth";
import { FadeUp, MotionProvider } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
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

function LogoTile({ src, alt }: { src: string; alt: string }) {
    return (
        <span className="inline-flex h-11 items-center self-start rounded-lg bg-brand-primary px-3.5">
            <img src={src} alt={alt} className="h-7 w-auto" />
        </span>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { token, refreshToken, user, setSession } = useAuthStore();
    const { logoUrl, siteName } = useLoginBranding();
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<StaffLoginValues>({
        resolver: zodResolver(staffLoginSchema),
        defaultValues: { identifier: "", password: "" },
    });
    const submitting = form.formState.isSubmitting;

    const sessionNotice = useMemo(() => {
        const reason = searchParams.get("reason");
        if (reason === "session_expired") {
            return "You were signed out because your session expired. Sign in again to pick up where you left off.";
        }
        return null;
    }, [searchParams]);

    // Require both access + refresh for a valid staff session.
    if (token && refreshToken && user) {
        return <Navigate to={ROLE_HOME[user.role]} replace />;
    }

    async function onSubmit(values: StaffLoginValues) {
        setError(null);
        try {
            const data = await apiFetch<{
                accessToken?: string;
                refreshToken?: string;
                token: string;
                home: string;
                user: StaffUser;
            }>("/api/dashboard/auth/login", {
                body: {
                    identifier: values.identifier.trim(),
                    password: values.password,
                },
                skipRefresh: true,
            });

            const accessToken = data.accessToken ?? data.token;
            if (!accessToken || !data.refreshToken) {
                throw new ApiError(
                    "Login did not return a secure session. Please try again.",
                    500,
                );
            }

            setSession(accessToken, data.user, data.refreshToken);
            navigate(data.home);
        } catch (err) {
            if (err instanceof ApiError && err.status === 403) {
                setError(
                    `${err.message} Customers should use ${STOREFRONT_URL}/login`,
                );
            } else {
                setError(
                    err instanceof ApiError ? err.message : "Login failed",
                );
            }
            form.resetField("password");
            form.setFocus("password");
        }
    }

    const year = new Date().getFullYear();

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
                            Orders, stores, products and reviews for {siteName}{" "}
                            — managed from one place.
                        </p>
                        <p className="mt-4 text-sm leading-relaxed text-white/60">
                            Admins, moderators and store owners sign in here.
                            Your role decides what you can see after you log in.
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
                                Sign in
                            </h1>
                            <p className="mt-1.5 text-sm text-text-secondary">
                                Use your username, email or phone number.
                            </p>

                            {sessionNotice ? (
                                <p
                                    className="mt-6 border-l-2 border-warning bg-warning/10 px-3 py-2.5 text-sm leading-relaxed text-text-primary"
                                    role="status"
                                >
                                    {sessionNotice}
                                </p>
                            ) : null}

                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="mt-8 space-y-5"
                                    noValidate
                                >
                                    <FormField
                                        control={form.control}
                                        name="identifier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Username, email or phone
                                                </FormLabel>
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
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type={
                                                                showPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            autoComplete="current-password"
                                                            className="h-11 pr-11"
                                                            disabled={
                                                                submitting
                                                            }
                                                        />
                                                    </FormControl>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (v) => !v,
                                                            )
                                                        }
                                                        aria-label={
                                                            showPassword
                                                                ? "Hide password"
                                                                : "Show password"
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
