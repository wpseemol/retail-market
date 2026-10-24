"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { format } from "@/i18n/config";
import { ApiError, apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/money";
import type { ApiProduct } from "@/lib/products";
import { saveLastOnlineOrder } from "@/lib/payment";
import type { CustomerAddress } from "@/lib/validators/customerAddress";
import {
    BULK_MAX_LINES,
    BULK_MAX_QTY,
    bulkOrderFormSchema,
    type BulkOrderFormValues,
} from "@/lib/validators/bulkOrder";
import { useAppDispatch } from "@/store/hooks";
import { removeOrderedLines } from "@/store/cartSlice";

const inputClass =
    "flex h-11 w-full rounded-md border border-border-default bg-bg-base px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const lockedInputClass = `${inputClass} bg-bg-subtle text-text-secondary`;

type VerificationStatus = {
    email: string;
    email_verified: boolean;
    phone: string | null;
    phone_verified: boolean;
};

type CatalogFacet = {
    id: string;
    label: string;
    label_bn?: string | null;
};

type CatalogResponse = {
    products: ApiProduct[];
    facets?: { categories?: CatalogFacet[] };
    pagination?: { page: number; total_pages: number };
};

type AccountContact = {
    email: string;
    phone: string;
    fullName: string;
};

function errorText(err: unknown, fallback: string) {
    if (!(err instanceof ApiError)) return fallback;
    const details = err.errors
        ? Object.values(err.errors)
              .flatMap((value) =>
                  Array.isArray(value) ? value : value ? [String(value)] : [],
              )
              .filter(Boolean)
              .join(" ")
        : "";
    return details ? `${err.message} ${details}` : err.message;
}

function clampQty(quantity: number, stock: number) {
    const max = Math.min(stock > 0 ? stock : 1, BULK_MAX_QTY);
    if (!Number.isFinite(quantity)) return 1;
    return Math.min(Math.max(1, Math.floor(quantity)), max);
}

function productName(product: ApiProduct, locale: string) {
    return locale === "bn" && product.name_bn?.trim() ? product.name_bn.trim() : product.name;
}

function QtyStepper({
    value,
    max,
    onChange,
    decreaseLabel,
    increaseLabel,
    qtyLabel,
}: {
    value: number;
    max: number;
    onChange: (next: number) => void;
    decreaseLabel: string;
    increaseLabel: string;
    qtyLabel: string;
}) {
    return (
        <div className="inline-flex h-9 items-center overflow-hidden rounded-md border border-border-default bg-bg-base">
            <button
                type="button"
                aria-label={decreaseLabel}
                disabled={value <= 1}
                onClick={() => onChange(clampQty(value - 1, max))}
                className="h-full w-9 text-lg text-text-primary hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
                −
            </button>
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                aria-label={qtyLabel}
                value={value}
                onChange={(event) => onChange(clampQty(Number(event.target.value), max))}
                className="h-full w-14 border-x border-border-default bg-transparent text-center text-sm text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                aria-label={increaseLabel}
                disabled={value >= max}
                onClick={() => onChange(clampQty(value + 1, max))}
                className="h-full w-9 text-lg text-text-primary hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
                +
            </button>
        </div>
    );
}

function StatusPill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
    return (
        <span
            className={
                ok
                    ? "inline-flex rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary"
                    : "inline-flex rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning"
            }
        >
            {ok ? yes : no}
        </span>
    );
}

function BulkOrderForm({ account }: { account: AccountContact }) {
    const { t, locale } = useI18n();
    const copy = t.bulk;
    const router = useRouter();
    const dispatch = useAppDispatch();
    const schema = useMemo(
        () =>
            bulkOrderFormSchema({
                emptyLines: copy.emptyLines,
                maxLines: copy.maxLines,
                emailRequired: copy.emailRequired,
                emailInvalid: copy.emailInvalid,
                nameRequired: copy.nameRequired,
                phoneRequired: copy.phoneRequired,
                phoneInvalid: copy.phoneInvalid,
                addressRequired: copy.addressRequired,
                cityRequired: copy.cityRequired,
                postalRequired: copy.postalRequired,
                countryRequired: copy.countryRequired,
            }),
        [copy],
    );
    const form = useForm<BulkOrderFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            lines: [],
            email: account.email,
            full_name: account.fullName,
            phone: account.phone,
            line1: "",
            line2: "",
            city: "",
            postal_code: "",
            country: "Bangladesh",
            payment_method: "cash_on_delivery",
            notes: "",
            coupon_code: "",
        },
    });
    const lines = useFieldArray({ control: form.control, name: "lines" });
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [catalog, setCatalog] = useState<ApiProduct[]>([]);
    const [categories, setCategories] = useState<CatalogFacet[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searching, setSearching] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [searchNote, setSearchNote] = useState<string | null>(null);
    const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [placed, setPlaced] = useState<{ number: string; total: string } | null>(null);

    const catalogUrl = useCallback(
        (nextPage: number) => {
            const params = new URLSearchParams({
                limit: "12",
                page: String(nextPage),
                sort: "name-asc",
            });
            const q = query.trim();
            if (q.length >= 2) params.set("q", q);
            if (category) params.set("category", category);
            return `/api/products?${params.toString()}`;
        },
        [category, query],
    );

    useEffect(() => {
        let cancelled = false;
        const handle = setTimeout(() => {
            setSearching(true);
            void apiFetch<CatalogResponse>(catalogUrl(1))
                .then((data) => {
                    if (cancelled) return;
                    setCatalog(data.products ?? []);
                    setCategories(data.facets?.categories ?? []);
                    setPage(1);
                    setTotalPages(data.pagination?.total_pages ?? 1);
                    setCatalogError(null);
                })
                .catch(() => {
                    if (cancelled) return;
                    setCatalog([]);
                    setCatalogError(copy.catalogFailed);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, query.trim().length >= 2 ? 300 : 0);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [catalogUrl, copy.catalogFailed, query]);

    useEffect(() => {
        let cancelled = false;
        void apiFetch<{ addresses: CustomerAddress[] }>("/api/customer/addresses")
            .then((data) => {
                if (cancelled) return;
                const list = data.addresses ?? [];
                setAddresses(list);
                const saved =
                    list.find((item) => item.is_default_shipping) ??
                    list.find((item) => item.type !== "billing") ??
                    list[0];
                if (!saved || form.getValues("line1")) return;
                form.setValue("full_name", saved.full_name || account.fullName);
                form.setValue("line1", saved.line1);
                form.setValue("line2", saved.line2 ?? "");
                form.setValue("city", saved.city);
                form.setValue("postal_code", saved.postal_code);
                form.setValue("country", saved.country === "BD" ? "Bangladesh" : saved.country);
            })
            .catch(() => {
                if (!cancelled) setAddresses([]);
            });
        return () => {
            cancelled = true;
        };
    }, [account.fullName, form]);

    const watched = form.watch("lines");
    const subtotal = watched.reduce((sum, line) => sum + line.unit_price * (line.quantity || 0), 0);
    const lineError =
        form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message;

    function applyAddress(id: string) {
        const saved = addresses.find((item) => item.id === id);
        if (!saved) return;
        form.setValue("full_name", saved.full_name, { shouldValidate: true });
        form.setValue("line1", saved.line1, { shouldValidate: true });
        form.setValue("line2", saved.line2 ?? "", { shouldValidate: true });
        form.setValue("city", saved.city, { shouldValidate: true });
        form.setValue("postal_code", saved.postal_code, { shouldValidate: true });
        form.setValue(
            "country",
            saved.country === "BD" ? "Bangladesh" : saved.country,
            { shouldValidate: true },
        );
    }

    function addProduct(product: ApiProduct, quantity: number) {
        setSearchNote(null);
        if (product.stock_qty < 1) return;
        const nextQty = clampQty(quantity, product.stock_qty);
        const current = form.getValues("lines");
        const existing = current.findIndex((line) => line.product_id === product.id);
        if (existing >= 0) {
            form.setValue(`lines.${existing}.quantity`, nextQty, { shouldValidate: true });
        } else if (current.length >= BULK_MAX_LINES) {
            setSearchNote(copy.maxLines);
            return;
        } else {
            lines.append({
                product_id: product.id,
                name: productName(product, locale),
                unit_price: product.price,
                stock_qty: product.stock_qty,
                quantity: nextQty,
                image: product.thumbnail?.path ?? null,
            });
        }
        setQtyDraft((prev) => {
            if (prev[product.id] == null) return prev;
            const next = { ...prev };
            delete next[product.id];
            return next;
        });
    }

    async function loadMore() {
        if (loadingMore || page >= totalPages) return;
        setLoadingMore(true);
        try {
            const data = await apiFetch<CatalogResponse>(catalogUrl(page + 1));
            setCatalog((prev) => {
                const seen = new Set(prev.map((item) => item.id));
                return [...prev, ...(data.products ?? []).filter((item) => !seen.has(item.id))];
            });
            setPage((current) => current + 1);
            setTotalPages(data.pagination?.total_pages ?? totalPages);
        } catch {
            setCatalogError(copy.catalogFailed);
        } finally {
            setLoadingMore(false);
        }
    }

    async function onSubmit(values: BulkOrderFormValues) {
        setSubmitError(null);
        try {
            const data = await apiFetch<{
                order: { order_number: string; total: string };
                payment?: { gateway_url: string | null };
            }>("/api/customer/orders/bulk", {
                method: "POST",
                body: {
                    email: account.email.trim().toLowerCase(),
                    items: values.lines.map((line) => ({
                        product_id: line.product_id,
                        quantity: line.quantity,
                    })),
                    billing: {
                        full_name: values.full_name.trim(),
                        phone: account.phone.trim(),
                        line1: values.line1.trim(),
                        line2: values.line2.trim(),
                        city: values.city.trim(),
                        postal_code: values.postal_code.trim(),
                        country: values.country.trim() || "Bangladesh",
                    },
                    payment_method: values.payment_method,
                    notes: values.notes.trim(),
                    ...(values.coupon_code.trim()
                        ? { coupon_code: values.coupon_code.trim() }
                        : {}),
                },
            });
            void dispatch(removeOrderedLines(values.lines.map((line) => line.product_id)));
            if (data.payment) {
                saveLastOnlineOrder({
                    order_number: data.order.order_number,
                    email: account.email.trim().toLowerCase(),
                });
                if (data.payment.gateway_url) {
                    window.location.assign(data.payment.gateway_url);
                    return;
                }
                router.push(
                    `/checkout/result?status=failed&order=${encodeURIComponent(data.order.order_number)}`,
                );
                return;
            }
            setPlaced({ number: data.order.order_number, total: data.order.total });
        } catch (err) {
            setSubmitError(errorText(err, copy.failed));
        }
    }

    if (placed) {
        return (
            <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <h1 className="text-2xl font-semibold text-text-primary">{copy.successTitle}</h1>
                <p className="mt-3 text-text-secondary">
                    {format(copy.successBody, { number: placed.number })}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                    {format(copy.orderTotal, { total: `৳${placed.total}` })}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/shop"
                        className="inline-flex h-11 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                        {copy.keepShopping}
                    </Link>
                    <Link
                        href="/account/orders"
                        className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-semibold text-text-primary"
                    >
                        {copy.viewOrders}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold text-text-primary">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">{copy.subtitle}</p>
            <p className="mt-1 text-sm text-text-secondary">
                {format(copy.orderingAs, {
                    name: account.fullName || account.email,
                    email: account.email,
                })}
            </p>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
                >
                    <div className="flex flex-col gap-8">
                        <section>
                            <label htmlFor="bulk-search" className="text-sm font-medium text-text-primary">
                                {copy.searchLabel}
                            </label>
                            <input
                                id="bulk-search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={copy.searchPlaceholder}
                                className={`${inputClass} mt-2`}
                                autoComplete="off"
                            />
                            <p className="mt-2 text-sm text-text-secondary">{copy.browseHint}</p>
                            {categories.length > 0 ? (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setCategory("")}
                                        className={
                                            category === ""
                                                ? "shrink-0 rounded-full bg-brand-primary px-3 py-1.5 text-sm font-medium text-white"
                                                : "shrink-0 rounded-full border border-border-default px-3 py-1.5 text-sm text-text-primary hover:bg-bg-subtle"
                                        }
                                    >
                                        {copy.allCategories}
                                    </button>
                                    {categories.map((item) => {
                                        const label =
                                            locale === "bn" && item.label_bn?.trim()
                                                ? item.label_bn.trim()
                                                : item.label;
                                        const active = category === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setCategory(active ? "" : item.id)}
                                                className={
                                                    active
                                                        ? "shrink-0 rounded-full bg-brand-primary px-3 py-1.5 text-sm font-medium text-white"
                                                        : "shrink-0 rounded-full border border-border-default px-3 py-1.5 text-sm text-text-primary hover:bg-bg-subtle"
                                                }
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                            {searching ? (
                                <p className="mt-3 text-sm text-text-secondary">{copy.searching}</p>
                            ) : null}
                            {catalogError ? <p className="mt-3 text-sm text-error">{catalogError}</p> : null}
                            {searchNote ? <p className="mt-3 text-sm text-error">{searchNote}</p> : null}
                            {!searching && catalog.length === 0 && !catalogError ? (
                                <p className="mt-3 text-sm text-text-secondary">
                                    {query.trim().length >= 2 ? copy.noResults : copy.catalogEmpty}
                                </p>
                            ) : null}
                            {catalog.length > 0 ? (
                                <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
                                    {catalog.map((product) => {
                                        const ordered = watched.find(
                                            (line) => line.product_id === product.id,
                                        );
                                        const maxQty = Math.min(
                                            product.stock_qty || 1,
                                            BULK_MAX_QTY,
                                        );
                                        const shown = clampQty(
                                            qtyDraft[product.id] ?? ordered?.quantity ?? 1,
                                            maxQty,
                                        );
                                        const name = productName(product, locale);
                                        const sameQty = ordered?.quantity === shown;
                                        return (
                                            <li
                                                key={product.id}
                                                className="flex gap-3 rounded-lg border border-border-default bg-bg-base p-3"
                                            >
                                                {product.thumbnail?.path ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={product.thumbnail.path}
                                                        alt=""
                                                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <span className="h-16 w-16 shrink-0 rounded-md bg-bg-subtle" />
                                                )}
                                                <span className="flex min-w-0 flex-1 flex-col gap-2">
                                                    <span>
                                                        <span className="block truncate text-sm font-medium text-text-primary">
                                                            {name}
                                                        </span>
                                                        <span className="text-xs text-text-secondary">
                                                            {formatPrice(product.price)} ·{" "}
                                                            {product.stock_qty > 0
                                                                ? format(copy.stock, {
                                                                      count: product.stock_qty,
                                                                  })
                                                                : copy.outOfStock}
                                                        </span>
                                                    </span>
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <QtyStepper
                                                            value={product.stock_qty > 0 ? shown : 1}
                                                            max={maxQty}
                                                            onChange={(next) =>
                                                                setQtyDraft((prev) => ({
                                                                    ...prev,
                                                                    [product.id]: next,
                                                                }))
                                                            }
                                                            decreaseLabel={copy.decreaseQty}
                                                            increaseLabel={copy.increaseQty}
                                                            qtyLabel={copy.qty}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                product.stock_qty < 1 ||
                                                                Boolean(ordered && sameQty)
                                                            }
                                                            onClick={() => addProduct(product, shown)}
                                                            className="h-9 rounded-md bg-brand-primary px-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {ordered
                                                                ? sameQty
                                                                    ? copy.addedQty
                                                                    : copy.updateQty
                                                                : copy.add}
                                                        </button>
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
                            {page < totalPages ? (
                                <button
                                    type="button"
                                    onClick={() => void loadMore()}
                                    disabled={loadingMore}
                                    className="mt-3 h-10 rounded-md border border-border-default px-4 text-sm font-medium text-text-primary hover:bg-bg-subtle disabled:opacity-60"
                                >
                                    {loadingMore ? copy.searching : copy.loadMore}
                                </button>
                            ) : null}
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-text-primary">
                                {copy.linesTitle}
                                {watched.length > 0 ? (
                                    <span className="ml-2 text-sm font-medium text-text-secondary">
                                        {format(copy.productsCount, { count: watched.length })}
                                    </span>
                                ) : null}
                            </h2>
                            {lineError ? <p className="mt-2 text-sm text-error">{lineError}</p> : null}
                            {lines.fields.length === 0 ? (
                                <p className="mt-3 text-sm text-text-secondary">{copy.pickHint}</p>
                            ) : (
                                <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                                    {lines.fields.map((field, index) => {
                                        const line = watched[index];
                                        if (!line) return null;
                                        const maxQty = Math.min(line.stock_qty || BULK_MAX_QTY, BULK_MAX_QTY);
                                        const quantity = clampQty(line.quantity || 1, maxQty);
                                        return (
                                            <li
                                                key={field.id}
                                                className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default bg-bg-base p-3"
                                            >
                                                {line.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={line.image}
                                                        alt=""
                                                        className="h-12 w-12 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <span className="h-12 w-12 rounded-md bg-bg-subtle" />
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-text-primary">
                                                        {line.name}
                                                    </span>
                                                    <span className="text-xs text-text-secondary">
                                                        {formatPrice(line.unit_price)} {copy.each}
                                                    </span>
                                                </span>
                                                <QtyStepper
                                                    value={quantity}
                                                    max={maxQty}
                                                    onChange={(next) =>
                                                        form.setValue(`lines.${index}.quantity`, next, {
                                                            shouldValidate: true,
                                                        })
                                                    }
                                                    decreaseLabel={copy.decreaseQty}
                                                    increaseLabel={copy.increaseQty}
                                                    qtyLabel={copy.qty}
                                                />
                                                <span className="w-24 text-right text-sm font-medium text-text-primary">
                                                    {formatPrice(line.unit_price * quantity)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => lines.remove(index)}
                                                    className="text-sm text-error"
                                                >
                                                    {copy.remove}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>

                        <section className="grid gap-4 sm:grid-cols-2">
                            <h2 className="sm:col-span-2 text-lg font-semibold text-text-primary">
                                {copy.contactTitle}
                            </h2>
                            {addresses.length > 0 ? (
                                <label className="sm:col-span-2 text-sm text-text-primary">
                                    {copy.savedAddress}
                                    <select
                                        className={`${inputClass} mt-2`}
                                        defaultValue=""
                                        onChange={(event) => applyAddress(event.target.value)}
                                    >
                                        <option value="">{copy.savedAddressPlaceholder}</option>
                                        {addresses.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {[item.label, item.line1, item.city].filter(Boolean).join(" · ")}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : null}
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.fullName}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="name" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.phone}</FormLabel>
                                        <FormControl>
                                            <input
                                                {...field}
                                                readOnly
                                                autoComplete="tel"
                                                className={lockedInputClass}
                                            />
                                        </FormControl>
                                        <FormDescription>{copy.phoneLocked}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>{copy.email}</FormLabel>
                                        <FormControl>
                                            <input
                                                {...field}
                                                type="email"
                                                readOnly
                                                autoComplete="email"
                                                className={lockedInputClass}
                                            />
                                        </FormControl>
                                        <FormDescription>{copy.emailLocked}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="line1"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>{copy.line1}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="address-line1" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="line2"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>{copy.line2}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="address-line2" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.city}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="address-level2" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="postal_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.postal}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="postal-code" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.country}</FormLabel>
                                        <FormControl>
                                            <input {...field} autoComplete="country-name" className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="coupon_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{copy.coupon}</FormLabel>
                                        <FormControl>
                                            <input {...field} className={inputClass} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <FormLabel>{copy.notes}</FormLabel>
                                        <FormControl>
                                            <textarea
                                                {...field}
                                                rows={3}
                                                placeholder={copy.notesPlaceholder}
                                                className="w-full rounded-md border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </section>
                    </div>

                    <aside className="rounded-xl border border-border-default bg-bg-base p-5 lg:sticky lg:top-24">
                        <h2 className="text-lg font-semibold text-text-primary">{copy.summary}</h2>
                        <p className="mt-3 flex justify-between text-sm text-text-secondary">
                            <span>{format(copy.productsCount, { count: watched.length })}</span>
                            <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
                        </p>
                        <p className="mt-2 text-xs text-text-secondary">{copy.shippingNote}</p>
                        <fieldset className="mt-5 space-y-2">
                            <legend className="text-sm font-medium text-text-primary">{copy.paymentTitle}</legend>
                            <label className="flex items-start gap-2 text-sm text-text-primary">
                                <input
                                    type="radio"
                                    value="cash_on_delivery"
                                    {...form.register("payment_method")}
                                    className="mt-1"
                                />
                                {copy.payCod}
                            </label>
                            <label className="flex items-start gap-2 text-sm text-text-primary">
                                <input
                                    type="radio"
                                    value="sslcommerz"
                                    {...form.register("payment_method")}
                                    className="mt-1"
                                />
                                {copy.payOnline}
                            </label>
                        </fieldset>
                        {submitError ? <p className="mt-4 text-sm text-error">{submitError}</p> : null}
                        <button
                            type="submit"
                            disabled={form.formState.isSubmitting || watched.length === 0}
                            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-primary text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                        >
                            {form.formState.isSubmitting ? copy.submitting : copy.submit}
                        </button>
                    </aside>
                </form>
            </Form>
        </div>
    );
}

function GateShell({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
    return (
        <div className="mx-auto max-w-lg px-4 py-16">
            <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
            <p className="mt-3 text-sm text-text-secondary">{body}</p>
            {children}
        </div>
    );
}

function BulkOrderGate() {
    const { t } = useI18n();
    const copy = t.bulk;
    const { data: session, status } = useSession();
    const user = session?.backendUser;
    const userId = user?.id;
    const role = user?.role;
    const [verification, setVerification] = useState<VerificationStatus | null>(null);
    const [phase, setPhase] = useState<"loading" | "verify" | "ready" | "error">("loading");
    const [checkError, setCheckError] = useState<string | null>(null);

    const loadVerification = useCallback(async () => {
        setPhase("loading");
        setCheckError(null);
        try {
            const next = await apiFetch<VerificationStatus>("/api/auth/me/verification");
            setVerification(next);
            setPhase(next.email_verified && next.phone_verified && next.phone ? "ready" : "verify");
        } catch (err) {
            setCheckError(errorText(err, copy.failed));
            setPhase("error");
        }
    }, [copy.failed]);

    useEffect(() => {
        if (status !== "authenticated" || !userId || role !== "customer") return;
        void loadVerification();
    }, [loadVerification, role, status, userId]);

    if (status === "loading" || (status === "authenticated" && !user)) {
        return <GateShell title={copy.title} body={copy.checkingAccount} />;
    }

    if (status !== "authenticated" || !user) {
        return (
            <GateShell title={copy.loginTitle} body={copy.loginBody}>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/login?next=/bulk-order"
                        className="inline-flex h-11 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                        {copy.login}
                    </Link>
                    <Link
                        href="/register?next=/bulk-order"
                        className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-semibold text-text-primary"
                    >
                        {copy.signUp}
                    </Link>
                </div>
            </GateShell>
        );
    }

    if (user.role !== "customer") {
        return <GateShell title={copy.title} body={copy.staffBlocked} />;
    }

    if (phase === "loading") {
        return <GateShell title={copy.title} body={copy.checkingAccount} />;
    }

    if (phase === "error") {
        return (
            <GateShell title={copy.title} body={checkError ?? copy.failed}>
                <button
                    type="button"
                    onClick={() => void loadVerification()}
                    className="mt-6 inline-flex h-11 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                    {copy.checkAgain}
                </button>
            </GateShell>
        );
    }

    if (phase === "verify" || !verification?.email_verified || !verification.phone_verified || !verification.phone) {
        return (
            <GateShell title={copy.verifyTitle} body={copy.verifyBody}>
                <ul className="mt-6 flex list-none flex-col gap-3 p-0">
                    <li className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-base px-4 py-3">
                        <span>
                            <span className="block text-sm font-medium text-text-primary">{copy.verifyEmail}</span>
                            <span className="text-xs text-text-secondary">{verification?.email ?? user.email}</span>
                        </span>
                        <StatusPill
                            ok={Boolean(verification?.email_verified)}
                            yes={copy.verified}
                            no={copy.notVerified}
                        />
                    </li>
                    <li className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-base px-4 py-3">
                        <span>
                            <span className="block text-sm font-medium text-text-primary">{copy.verifyPhone}</span>
                            <span className="text-xs text-text-secondary">
                                {verification?.phone ?? copy.missingPhone}
                            </span>
                        </span>
                        <StatusPill
                            ok={Boolean(verification?.phone_verified && verification?.phone)}
                            yes={copy.verified}
                            no={copy.notVerified}
                        />
                    </li>
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        href="/account"
                        className="inline-flex h-11 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                        {copy.verifyAccount}
                    </Link>
                    <button
                        type="button"
                        onClick={() => void loadVerification()}
                        className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-semibold text-text-primary"
                    >
                        {copy.checkAgain}
                    </button>
                </div>
            </GateShell>
        );
    }

    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return (
        <BulkOrderForm
            account={{
                email: verification.email,
                phone: verification.phone,
                fullName,
            }}
        />
    );
}

export default function BulkOrderPageContent() {
    const { locale } = useI18n();
    return <BulkOrderGate key={locale} />;
}
