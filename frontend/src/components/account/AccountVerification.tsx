"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, ApiError, type ApiUser } from "@/lib/api";
import {
  normalizePhone,
  phoneSchema,
  verificationCodeSchema,
} from "@/lib/validators/checkout";

type Channel = "email" | "phone";

type VerificationStatus = {
  email: string;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  pending_guest_orders: { email: number; phone: number };
};

type ConfirmResponse = { message: string; user: ApiUser; claimed_orders: number };

const BD_PREFIX = "+88";
const BD_LOCAL_MOBILE = /^01[3-9]\d{8}$/;

/** `+8801712345678` → `01712345678` so the input only holds the local part. */
function toLocalMobile(phone: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("88") ? digits.slice(2) : digits;
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const field = err.errors ? Object.values(err.errors).flat().find(Boolean) : undefined;
    return field ?? err.message;
  }
  return fallback;
}

function useCountdown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
      Not verified
    </span>
  );
}

function VerifyRow({
  channel,
  label,
  value,
  verified,
  pendingOrders,
  onVerified,
}: {
  channel: Channel;
  label: string;
  value: string | null;
  verified: boolean;
  pendingOrders: number;
  onVerified: (res: ConfirmResponse) => Promise<void>;
}) {
  const [phoneInput, setPhoneInput] = useState(toLocalMobile(value));
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useCountdown();

  useEffect(() => setPhoneInput(toLocalMobile(value)), [value]);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    let body: { phone?: string } | undefined;
    if (channel === "phone") {
      if (!BD_LOCAL_MOBILE.test(phoneInput)) {
        setError("Enter an 11-digit mobile number starting with 01 (e.g. 01712345678)");
        return;
      }
      const full = `${BD_PREFIX}${phoneInput}`;
      const parsed = phoneSchema.safeParse(full);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid number");
        return;
      }
      body = { phone: normalizePhone(full) ?? full };
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ message: string; resend_in: number }>(
        `/api/auth/me/verify/${channel}/send`,
        { method: "POST", body: body ?? {} },
      );
      setCodeSent(true);
      setInfo(res.message);
      setResendIn(res.resend_in);
    } catch (err) {
      if (err instanceof ApiError && err.code === "RESEND_TOO_SOON") setCodeSent(true);
      setError(errorMessage(err, "Could not send the code"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = verificationCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<ConfirmResponse>(`/api/auth/me/verify/${channel}/confirm`, {
        method: "POST",
        body: parsed.data,
      });
      setCodeSent(false);
      setCode("");
      setInfo(
        res.claimed_orders > 0
          ? `${res.message}. ${res.claimed_orders} guest order${res.claimed_orders > 1 ? "s were" : " was"} added to My Orders.`
          : res.message,
      );
      await onVerified(res);
    } catch (err) {
      setError(errorMessage(err, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border-default bg-bg-base p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-medium text-text-secondary">{label}</p>
          <p className="m-0 mt-0.5 truncate text-[15px] font-semibold text-text-primary">
            {value || "Not added"}
          </p>
        </div>
        <VerifiedBadge verified={verified} />
      </div>

      {!verified && pendingOrders > 0 ? (
        <p className="m-0 mt-3 rounded-md bg-brand-primary/5 px-3 py-2 text-[12.5px] text-text-primary">
          {pendingOrders} guest order{pendingOrders > 1 ? "s" : ""} placed with this {channel === "email" ? "email" : "number"} will be added to your account once verified.
        </p>
      ) : null}

      {!verified ? (
        <div className="mt-4 flex flex-col gap-3">
          {channel === "phone" && !codeSent ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">Mobile number</span>
              <div className="flex h-11 overflow-hidden rounded-md border border-border-default bg-bg-surface focus-within:border-brand-primary">
                <span className="flex items-center border-r border-border-default bg-bg-base px-3 text-[14px] font-medium text-text-secondary select-none">
                  {BD_PREFIX}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={11}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="01712345678"
                  aria-describedby="mobile-hint"
                  className="min-w-0 flex-1 bg-transparent px-3.5 text-[14px] text-text-primary outline-none"
                />
              </div>
              <span id="mobile-hint" className="text-[12px] text-text-secondary">
                Bangladesh number, 11 digits starting with 01
              </span>
            </label>
          ) : null}

          {codeSent ? (
            <form onSubmit={confirm} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[13px] font-medium text-text-primary">6-digit code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="h-11 rounded-md border border-border-default bg-bg-surface px-3.5 text-[18px] tracking-[0.4em] text-text-primary outline-none focus:border-brand-primary"
                />
              </label>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="h-11 rounded-md bg-brand-primary px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 cursor-pointer"
              >
                {busy ? "Checking…" : "Verify"}
              </button>
            </form>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              className="h-10 rounded-md border border-brand-primary/60 bg-brand-primary/5 px-4 text-[13px] font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white disabled:opacity-60 disabled:hover:bg-brand-primary/5 disabled:hover:text-brand-primary cursor-pointer"
            >
              {resendIn > 0
                ? `Resend in ${resendIn}s`
                : codeSent
                  ? "Resend code"
                  : channel === "email"
                    ? "Send code to email"
                    : "Send SMS code"}
            </button>
            {codeSent && channel === "phone" ? (
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                className="text-[13px] font-medium text-text-secondary hover:text-brand-primary cursor-pointer"
              >
                Change number
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="m-0 mt-3 text-[13px] text-error" role="alert">
          {error}
        </p>
      ) : null}
      {info && !error ? (
        <p className="m-0 mt-3 text-[13px] text-brand-primary" aria-live="polite">
          {info}
        </p>
      ) : null}
    </div>
  );
}

export default function AccountVerification({
  user,
  onUserChange,
}: {
  user: ApiUser;
  onUserChange: (user: ApiUser) => Promise<void>;
}) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<VerificationStatus>("/api/auth/me/verification"));
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user.email, user.phone]);

  const handleVerified = async (res: ConfirmResponse) => {
    await onUserChange(res.user);
    await load();
  };

  const emailVerified = status?.email_verified ?? Boolean(user.email_verified_at);
  const phoneVerified = status?.phone_verified ?? Boolean(user.phone_verified_at);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
      aria-labelledby="verification-heading"
      className="mt-6 rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-7"
    >
      <h2
        id="verification-heading"
        className="relative m-0 inline-block pb-2 text-lg font-semibold text-text-primary"
      >
        Verify email &amp; mobile
        <span className="absolute bottom-0 left-0 h-0.5 w-7 bg-brand-primary" />
      </h2>
      <p className="m-0 mt-2 text-sm text-text-secondary">
        Verified contacts keep your account secure and automatically bring orders you placed as
        a guest into{" "}
        <Link href="/account/orders" className="font-medium text-brand-primary hover:underline">
          My Orders
        </Link>
        .
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <VerifyRow
          channel="email"
          label="Email"
          value={user.email}
          verified={emailVerified}
          pendingOrders={status?.pending_guest_orders.email ?? 0}
          onVerified={handleVerified}
        />
        <VerifyRow
          channel="phone"
          label="Mobile"
          value={user.phone}
          verified={phoneVerified}
          pendingOrders={status?.pending_guest_orders.phone ?? 0}
          onVerified={handleVerified}
        />
      </div>
    </motion.section>
  );
}
