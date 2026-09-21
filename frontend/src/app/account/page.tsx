"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthInput from "@/components/auth/AuthInput";
import ApiHealthBadge from "@/components/ApiHealthBadge";
import { apiFetch, ApiError, type ApiUser } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import { logoutSession } from "@/lib/logoutSession";

function initials(user: ApiUser) {
  const a = user.first_name?.trim()?.[0] ?? "";
  const b = user.last_name?.trim()?.[0] ?? "";
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 2).toUpperCase();
}

function providerLabel(provider?: string | null) {
  if (!provider) return "Email account";
  if (provider === "google") return "Google account";
  return `${provider} account`;
}

export default function AccountPageContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, user, hydrated } = useAppSelector((state) => state.auth);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/auth/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !user || !token) {
    return (
      <main className="flex-1 bg-bg-base">
        <div className="container mx-auto px-4 sm:px-6 py-16 text-sm text-text-secondary">
          Loading account…
        </div>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const body = {
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      phone: String(form.get("phone") ?? "") || null,
      gender: (String(form.get("gender") ?? "") || null) as
        | "male"
        | "female"
        | "other"
        | null,
      date_of_birth: String(form.get("date_of_birth") ?? "") || null,
    };

    try {
      const data = await apiFetch<{ user: ApiUser }>("/api/auth/me", {
        method: "PATCH",
        token,
        body,
      });
      dispatch(setUser(data.user));
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const fullName = `${user.first_name} ${user.last_name}`.trim();

  return (
    <main className="flex-1 bg-bg-base">
      <div className="border-b border-border-default bg-bg-subtle/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex items-center gap-2 text-text-secondary">
              <li>
                <Link
                  href="/"
                  className="hover:text-brand-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-text-secondary/60">
                &gt;
              </li>
              <li className="text-text-primary font-medium">My account</li>
            </ol>
          </nav>
          <ApiHealthBadge />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mx-auto max-w-3xl"
        >
          {/* Profile strip */}
          <section
            aria-labelledby="account-heading"
            className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface"
          >
            <div
              className="absolute inset-x-0 top-0 h-24 sm:h-28 bg-linear-to-br from-brand-primary/20 via-brand-primary/5 to-transparent"
              aria-hidden
            />
            <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-7 flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div
                  className="size-16 sm:size-20 shrink-0 rounded-full bg-brand-primary text-white flex items-center justify-center text-xl sm:text-2xl font-bold shadow-sm ring-4 ring-bg-surface"
                  aria-hidden
                >
                  {user.avatar?.path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar.path}
                      alt=""
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    initials(user)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-primary mb-1">
                    Customer profile
                  </p>
                  <h1
                    id="account-heading"
                    className="text-2xl sm:text-[28px] font-semibold text-text-primary leading-tight truncate"
                  >
                    {fullName || "My account"}
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary truncate">
                    {user.email}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-border-default bg-bg-base px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                      {providerLabel(user.provider_name)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span
                        className="size-1.5 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void logoutSession(dispatch).then(() => {
                    router.push("/auth/login");
                  });
                }}
                className="self-start sm:self-auto h-10 shrink-0 rounded-md border border-border-default bg-bg-base px-4 text-sm font-semibold text-text-primary hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </section>

          {/* Profile form */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            aria-labelledby="details-heading"
            className="mt-6 rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8"
          >
            <div className="mb-6">
              <h2
                id="details-heading"
                className="relative inline-block text-lg sm:text-xl font-semibold text-text-primary pb-2"
              >
                Personal details
                <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Keep your shopper profile up to date for orders and delivery.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                  name="first_name"
                  label="First name"
                  defaultValue={user.first_name}
                  autoComplete="given-name"
                  required
                />
                <AuthInput
                  name="last_name"
                  label="Last name"
                  defaultValue={user.last_name}
                  autoComplete="family-name"
                  required
                />
              </div>

              <AuthInput
                name="phone"
                label="Phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                maxLength={30}
                placeholder="Optional"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium text-text-primary"
                    htmlFor="gender"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    defaultValue={user.gender ?? ""}
                    className="h-11 rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-primary"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <AuthInput
                  name="date_of_birth"
                  label="Date of birth"
                  type="date"
                  defaultValue={
                    user.date_of_birth ? user.date_of_birth.slice(0, 10) : ""
                  }
                />
              </div>

              {error ? (
                <p
                  className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {success ? (
                <p
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                  role="status"
                >
                  {success}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 rounded-md bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Save details"}
                </button>
                <Link
                  href="/"
                  className="h-11 inline-flex items-center rounded-md px-4 text-sm font-medium text-text-secondary hover:text-brand-primary transition-colors"
                >
                  Back to shop
                </Link>
              </div>
            </form>
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}
