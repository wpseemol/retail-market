"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthInput from "@/components/auth/AuthInput";
import { apiFetch, ApiError } from "@/lib/api";
import {
  type AddressFormField,
  type CustomerAddress,
  validateAddressField,
  validateAddressForm,
} from "@/lib/validators/customerAddress";

type FieldErrors = Partial<Record<AddressFormField, string>>;

const emptyForm: {
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  type: "shipping" | "billing" | "both";
  is_default_shipping: boolean;
  is_default_billing: boolean;
} = {
  label: "",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "BD",
  type: "both",
  is_default_shipping: false,
  is_default_billing: false,
};

function formatAddress(a: CustomerAddress) {
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<AddressFormField, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const data = await apiFetch<{ addresses: CustomerAddress[] }>(
        "/api/customer/addresses",
      );
      setAddresses(data.addresses ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load addresses");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      is_default_shipping: addresses.length === 0,
      is_default_billing: addresses.length === 0,
    });
    setFieldErrors({});
    setTouched({});
    setError(null);
    setSuccess(null);
    setFormOpen(true);
  };

  const openEdit = (address: CustomerAddress) => {
    setEditingId(address.id);
    setForm({
      label: address.label ?? "",
      full_name: address.full_name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postal_code: address.postal_code,
      country: address.country || "BD",
      type: address.type,
      is_default_shipping: address.is_default_shipping,
      is_default_billing: address.is_default_billing,
    });
    setFieldErrors({});
    setTouched({});
    setError(null);
    setSuccess(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFieldErrors({});
    setTouched({});
  };

  const setTextField = (field: AddressFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field] || fieldErrors[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: validateAddressField(field, value),
      }));
    }
  };

  const markTouched = (field: AddressFormField, value: string | boolean) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateAddressField(field, value),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validated = validateAddressForm(form);
    if (!validated.success) {
      setFieldErrors(validated.errors);
      setTouched({
        label: true,
        full_name: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        type: true,
      });
      setError("Please fix the highlighted fields");
      return;
    }

    const body = {
      ...validated.data,
      label: validated.data.label || null,
      line2: validated.data.line2 || null,
      state: validated.data.state || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch<{ address: CustomerAddress }>(
          `/api/customer/addresses/${editingId}`,
          { method: "PATCH", body },
        );
        setSuccess("Address updated");
      } else {
        await apiFetch<{ address: CustomerAddress }>(
          "/api/customer/addresses",
          { method: "POST", body },
        );
        setSuccess("Address saved");
      }
      closeForm();
      await loadAddresses();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const next: FieldErrors = {};
        for (const key of Object.keys(err.errors) as AddressFormField[]) {
          const msg = err.errors[key]?.[0];
          if (msg) next[key] = msg;
        }
        if (Object.keys(next).length > 0) setFieldErrors(next);
      }
      setError(err instanceof ApiError ? err.message : "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/api/customer/addresses/${id}`, { method: "DELETE" });
      if (editingId === id) closeForm();
      setSuccess("Address deleted");
      await loadAddresses();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 bg-bg-base">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-3xl"
        >
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="relative inline-block text-xl sm:text-2xl font-semibold text-text-primary pb-2">
                  My addresses
                  <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
                </h1>
                <p className="mt-3 text-sm text-text-secondary">
                  Save shipping addresses for faster checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="h-10 rounded-md bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer"
              >
                Add address
              </button>
            </div>

            {error ? (
              <p
                className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                role="status"
              >
                {success}
              </p>
            ) : null}

            <div className="mt-6 space-y-3">
              {loadingList ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading addresses">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-xl border border-border-default bg-bg-subtle/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : addresses.length === 0 && !formOpen ? (
                <div className="rounded-xl border border-dashed border-border-default bg-bg-subtle/40 px-5 py-10 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No saved addresses
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Add a delivery address before your next order.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer"
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                addresses.map((address) => (
                  <article
                    key={address.id}
                    className="rounded-xl border border-border-default bg-bg-base/40 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-text-primary">
                            {address.label?.trim() || address.full_name}
                          </h2>
                          {address.is_default_shipping ? (
                            <span className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
                              Default shipping
                            </span>
                          ) : null}
                          {address.is_default_billing ? (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Default billing
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          {address.full_name} · {address.phone}
                        </p>
                        <p className="mt-1 text-sm text-text-primary">
                          {formatAddress(address)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">
                          {address.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(address)}
                          className="h-9 rounded-md border border-border-default px-3 text-sm font-medium text-text-primary hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === address.id}
                          onClick={() => void handleDelete(address.id)}
                          className="h-9 rounded-md border border-rose-500/30 px-3 text-sm font-medium text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {deletingId === address.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <AnimatePresence>
            {formOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8"
              >
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="relative inline-block text-lg sm:text-xl font-semibold text-text-primary pb-2">
                      {editingId ? "Edit address" : "Add address"}
                      <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                      Use a real delivery address — unsafe HTML, scripts, and SQL-like text are blocked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="h-9 rounded-md px-3 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                      label="Label (optional)"
                      placeholder="Home, Office…"
                      value={form.label}
                      maxLength={50}
                      error={touched.label ? fieldErrors.label : undefined}
                      onBlur={(e) => markTouched("label", e.target.value)}
                      onChange={(e) => setTextField("label", e.target.value)}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="address-type"
                        className="text-sm font-medium text-text-primary"
                      >
                        Address type
                      </label>
                      <select
                        id="address-type"
                        value={form.type}
                        onChange={(e) => {
                          const value = e.target.value as
                            | "shipping"
                            | "billing"
                            | "both";
                          setForm((prev) => ({ ...prev, type: value }));
                          markTouched("type", value);
                        }}
                        className="h-11 rounded border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary outline-none focus:border-brand-primary"
                      >
                        <option value="both">Shipping & billing</option>
                        <option value="shipping">Shipping only</option>
                        <option value="billing">Billing only</option>
                      </select>
                    </div>
                  </div>

                  <AuthInput
                    label="Full name"
                    value={form.full_name}
                    autoComplete="name"
                    maxLength={150}
                    required
                    error={touched.full_name ? fieldErrors.full_name : undefined}
                    onBlur={(e) => markTouched("full_name", e.target.value)}
                    onChange={(e) => setTextField("full_name", e.target.value)}
                  />

                  <AuthInput
                    label="Phone"
                    type="tel"
                    value={form.phone}
                    autoComplete="tel"
                    maxLength={30}
                    required
                    error={touched.phone ? fieldErrors.phone : undefined}
                    onBlur={(e) => markTouched("phone", e.target.value)}
                    onChange={(e) => setTextField("phone", e.target.value)}
                  />

                  <AuthInput
                    label="Address line 1"
                    value={form.line1}
                    autoComplete="address-line1"
                    maxLength={255}
                    required
                    error={touched.line1 ? fieldErrors.line1 : undefined}
                    onBlur={(e) => markTouched("line1", e.target.value)}
                    onChange={(e) => setTextField("line1", e.target.value)}
                  />

                  <AuthInput
                    label="Address line 2 (optional)"
                    value={form.line2}
                    autoComplete="address-line2"
                    maxLength={255}
                    error={touched.line2 ? fieldErrors.line2 : undefined}
                    onBlur={(e) => markTouched("line2", e.target.value)}
                    onChange={(e) => setTextField("line2", e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                      label="City"
                      value={form.city}
                      autoComplete="address-level2"
                      maxLength={100}
                      required
                      error={touched.city ? fieldErrors.city : undefined}
                      onBlur={(e) => markTouched("city", e.target.value)}
                      onChange={(e) => setTextField("city", e.target.value)}
                    />
                    <AuthInput
                      label="State / region (optional)"
                      value={form.state}
                      autoComplete="address-level1"
                      maxLength={100}
                      error={touched.state ? fieldErrors.state : undefined}
                      onBlur={(e) => markTouched("state", e.target.value)}
                      onChange={(e) => setTextField("state", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                      label="Postal code"
                      value={form.postal_code}
                      autoComplete="postal-code"
                      maxLength={20}
                      required
                      error={
                        touched.postal_code
                          ? fieldErrors.postal_code
                          : undefined
                      }
                      onBlur={(e) => markTouched("postal_code", e.target.value)}
                      onChange={(e) =>
                        setTextField("postal_code", e.target.value)
                      }
                    />
                    <AuthInput
                      label="Country code"
                      value={form.country}
                      autoComplete="country"
                      maxLength={2}
                      required
                      error={touched.country ? fieldErrors.country : undefined}
                      onBlur={(e) => markTouched("country", e.target.value)}
                      onChange={(e) =>
                        setTextField("country", e.target.value.toUpperCase())
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.is_default_shipping}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            is_default_shipping: e.target.checked,
                          }))
                        }
                        className="size-4 rounded border-border-default accent-brand-primary cursor-pointer"
                      />
                      <span className="text-sm text-text-secondary">
                        Default shipping address
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.is_default_billing}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            is_default_billing: e.target.checked,
                          }))
                        }
                        className="size-4 rounded border-border-default accent-brand-primary cursor-pointer"
                      />
                      <span className="text-sm text-text-secondary">
                        Default billing address
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <span
                            className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                            aria-hidden
                          />
                          Saving…
                        </>
                      ) : editingId ? (
                        "Update address"
                      ) : (
                        "Save address"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="h-11 rounded-md px-4 text-sm font-medium text-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}
