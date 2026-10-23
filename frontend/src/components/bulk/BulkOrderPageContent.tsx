"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
    Form,
    FormControl,
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

function BulkOrderForm() {
    const { t, locale } = useI18n();
    const copy = t.bulk;
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { data: session } = useSession();
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
            email: "",
            full_name: "",
            phone: "",
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
    const [results, setResults] = useState<ApiProduct[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchNote, setSearchNote] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [placed, setPlaced] = useState<{ number: string; total: string } | null>(null);

    useEffect(() => {
        const email = session?.user?.email;
        if (email && !form.getValues("email")) form.setValue("email", email);
    }, [session, form]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }
        let cancelled = false;
        const handle = setTimeout(() => {
            setSearching(true);
            void apiFetch<{ products: ApiProduct[] }>(
                `/api/products?q=${encodeURIComponent(q)}&limit=8`,
            )
                .then((data) => {
                    if (!cancelled) setResults(data.products ?? []);
                })
                .catch(() => {
                    if (!cancelled) setResults([]);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [query]);

    const watched = form.watch("lines");
    const subtotal = watched.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
    const lineError =
        form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message;

    function addProduct(product: ApiProduct) {
        setSearchNote(null);
        if (product.stock_qty < 1) return;
        const current = form.getValues("lines");
        const existing = current.findIndex((line) => line.product_id === product.id);
        if (existing >= 0) {
            const next = Math.min(current[existing].quantity + 1, product.stock_qty, BULK_MAX_QTY);
            form.setValue(`lines.${existing}.quantity`, next, { shouldValidate: true });
            return;
        }
        if (current.length >= BULK_MAX_LINES) {
            setSearchNote(copy.maxLines);
            return;
        }
        const name =
            locale === "bn" && product.name_bn?.trim() ? product.name_bn.trim() : product.name;
        lines.append({
            product_id: product.id,
            name,
            unit_price: product.price,
            stock_qty: product.stock_qty,
            quantity: 1,
            image: product.thumbnail?.path ?? null,
        });
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
                    email: values.email.trim().toLowerCase(),
                    items: values.lines.map((line) => ({
                        product_id: line.product_id,
                        quantity: line.quantity,
                    })),
                    billing: {
                        full_name: values.full_name.trim(),
                        phone: values.phone.trim(),
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
                    email: values.email.trim().toLowerCase(),
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
                            {searching ? (
                                <p className="mt-2 text-sm text-text-secondary">{copy.searching}</p>
                            ) : null}
                            {searchNote ? <p className="mt-2 text-sm text-error">{searchNote}</p> : null}
                            {query.trim().length >= 2 && !searching && results.length === 0 ? (
                                <p className="mt-2 text-sm text-text-secondary">{copy.noResults}</p>
                            ) : null}
                            {results.length > 0 ? (
                                <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                                    {results.map((product) => {
                                        const added = watched.some((line) => line.product_id === product.id);
                                        const name =
                                            locale === "bn" && product.name_bn?.trim()
                                                ? product.name_bn.trim()
                                                : product.name;
                                        return (
                                            <li
                                                key={product.id}
                                                className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-base p-3"
                                            >
                                                {product.thumbnail?.path ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={product.thumbnail.path}
                                                        alt=""
                                                        className="h-12 w-12 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <span className="h-12 w-12 rounded-md bg-bg-subtle" />
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-text-primary">
                                                        {name}
                                                    </span>
                                                    <span className="text-xs text-text-secondary">
                                                        {formatPrice(product.price)} ·{" "}
                                                        {product.stock_qty > 0
                                                            ? format(copy.stock, { count: product.stock_qty })
                                                            : copy.outOfStock}
                                                    </span>
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={product.stock_qty < 1}
                                                    onClick={() => addProduct(product)}
                                                    className="h-9 rounded-md bg-brand-primary px-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {added ? copy.inOrder : copy.add}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-text-primary">{copy.linesTitle}</h2>
                            {lineError ? <p className="mt-2 text-sm text-error">{lineError}</p> : null}
                            {lines.fields.length === 0 ? (
                                <p className="mt-3 text-sm text-text-secondary">{copy.emptyLines}</p>
                            ) : (
                                <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                                    {lines.fields.map((field, index) => {
                                        const line = watched[index];
                                        if (!line) return null;
                                        const maxQty = Math.min(line.stock_qty || BULK_MAX_QTY, BULK_MAX_QTY);
                                        return (
                                            <li
                                                key={field.id}
                                                className="flex flex-wrap items-center gap-3 rounded-lg border border-border-default bg-bg-base p-3"
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-text-primary">
                                                        {line.name}
                                                    </span>
                                                    <span className="text-xs text-text-secondary">
                                                        {formatPrice(line.unit_price)} {copy.each}
                                                    </span>
                                                </span>
                                                <label className="text-xs text-text-secondary">
                                                    {copy.qty}
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={maxQty}
                                                        className={`${inputClass} mt-1 w-28`}
                                                        {...form.register(`lines.${index}.quantity`, {
                                                            valueAsNumber: true,
                                                        })}
                                                    />
                                                </label>
                                                <span className="w-24 text-right text-sm font-medium text-text-primary">
                                                    {formatPrice(line.unit_price * (line.quantity || 0))}
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
                                            <input {...field} autoComplete="tel" className={inputClass} />
                                        </FormControl>
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
                                            <input {...field} type="email" autoComplete="email" className={inputClass} />
                                        </FormControl>
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
                            disabled={form.formState.isSubmitting}
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

export default function BulkOrderPageContent() {
    const { locale } = useI18n();
    return <BulkOrderForm key={locale} />;
}
