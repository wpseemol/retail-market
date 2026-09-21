"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import ApiHealthBadge from "@/components/ApiHealthBadge";
import { apiFetch, ApiError, type ApiUser } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, setUser } from "@/store/authSlice";

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
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-text-secondary">
        Loading account…
      </div>
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
      setSuccess("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My account</h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
        <ApiHealthBadge />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          name="first_name"
          label="First name"
          defaultValue={user.first_name}
          required
        />
        <AuthInput
          name="last_name"
          label="Last name"
          defaultValue={user.last_name}
          required
        />
        <AuthInput
          name="phone"
          label="Phone"
          defaultValue={user.phone ?? ""}
          maxLength={30}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary" htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={user.gender ?? ""}
            className="h-11 rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary"
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

        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-600" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save details"}
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(logout());
              router.push("/auth/login");
            }}
            className="h-11 rounded border border-border-default px-5 text-sm font-semibold text-text-primary"
          >
            Log out
          </button>
        </div>
      </form>
    </div>
  );
}
