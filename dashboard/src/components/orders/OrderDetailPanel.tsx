import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ImageIcon,
  MapPin,
  Package,
  Pencil,
  Printer,
  Store,
  Truck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  formatAddress,
  formatBdPhone,
  formatBdt,
  PAYMENT_STATUS_META,
  paymentMethodLabel,
  STATUS_META,
  type OrderDetail,
  type OrderStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusPill, PaymentMethodChip, PaymentStatusBadge } from "./OrderBadges";

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Package;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-gradient-to-r from-brand-tint/50 via-background to-background px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground uppercase">
          <Icon className="size-3.5 text-brand-primary" />
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function fmt(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
}

function Timeline({ order }: { order: OrderDetail }) {
  const cancelled = order.status === "cancelled" || order.status === "refunded";
  const steps: Array<{ label: string; at: string | null; done: boolean; bad?: boolean }> = [
    { label: "Placed", at: order.placed_at, done: true },
    {
      label: "Confirmed",
      at: null,
      done: ["confirmed", "processing", "shipped", "delivered", "refunded"].includes(order.status),
    },
    { label: "Shipped", at: order.shipped_at, done: Boolean(order.shipped_at) },
    { label: "Delivered", at: order.delivered_at, done: Boolean(order.delivered_at) },
  ];
  if (cancelled) {
    steps.push({
      label: STATUS_META[order.status].label,
      at: order.cancelled_at,
      done: true,
      bad: true,
    });
  }
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map((step) => {
        const Icon = step.bad ? XCircle : step.done ? CheckCircle2 : CircleDot;
        return (
          <li key={step.label} className="flex items-start gap-2">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                step.bad ? "text-destructive" : step.done ? "text-brand-primary" : "text-muted-foreground/50",
              )}
            />
            <div className="min-w-0">
              <p className={cn("text-xs font-medium", !step.done && "text-muted-foreground")}>{step.label}</p>
              <p className="text-[11px] text-muted-foreground">{fmt(step.at) ?? (step.done ? "Done" : "—")}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1 text-sm", strong && "border-t border-border/70 pt-2.5 text-base font-semibold")}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function OrderDetailPanel({
  order,
  nextStatuses,
  canManage,
  onChangeStatus,
  onEditTracking,
  onPrint,
}: {
  order: OrderDetail;
  nextStatuses: OrderStatus[];
  canManage: boolean;
  onChangeStatus: (status: OrderStatus) => void;
  onEditTracking: () => void;
  onPrint: () => void;
}) {
  const shipping = order.addresses.find((a) => a.type === "shipping") ?? order.billing;
  const billing = order.addresses.find((a) => a.type === "billing");
  const sameAddress =
    shipping && billing && formatAddress(shipping).join() === formatAddress(billing).join();
  const vendors = [
    ...new Map(
      order.items.filter((i) => i.vendor).map((i) => [i.vendor!.id, i.vendor!]),
    ).values(),
  ];
  const discount = Number(order.discount_amount);
  const tax = Number(order.tax_amount);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusPill status={order.status} />
        <PaymentMethodChip order={order} />
        <PaymentStatusBadge status={order.payment_status} />
        {order.is_guest ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Guest checkout</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManage && nextStatuses.length > 0 ? (
          <Select value="" onValueChange={(v) => onChangeStatus(v as OrderStatus)}>
            <SelectTrigger size="sm" className="min-w-44" aria-label="Change order status">
              <SelectValue placeholder="Change status…" />
            </SelectTrigger>
            <SelectContent>
              {nextStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  Mark {STATUS_META[s].label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer />
          Print invoice
        </Button>
      </div>

      <Section icon={CalendarClock} title="Progress">
        <Timeline order={order} />
      </Section>

      <Section icon={UserRound} title="Customer">
        <p className="text-sm font-medium">{order.customer.name}</p>
        <p className="text-sm text-muted-foreground">{formatBdPhone(order.customer.phone)}</p>
        {order.customer.email ? <p className="text-sm text-muted-foreground break-all">{order.customer.email}</p> : null}
      </Section>

      <Section icon={MapPin} title={sameAddress ? "Delivery & billing address" : "Delivery address"}>
        {shipping ? (
          <address className="text-sm not-italic">
            <p className="font-medium">{shipping.full_name}</p>
            <p className="text-muted-foreground">{formatBdPhone(shipping.phone)}</p>
            {formatAddress(shipping).map((line) => (
              <p key={line} className="text-muted-foreground">{line}</p>
            ))}
          </address>
        ) : (
          <p className="text-sm text-muted-foreground">No address on file.</p>
        )}
        {billing && !sameAddress ? (
          <div className="mt-3 border-t border-border/70 pt-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Billing</p>
            <p className="font-medium">{billing.full_name}</p>
            {formatAddress(billing).map((line) => (
              <p key={line} className="text-muted-foreground">{line}</p>
            ))}
          </div>
        ) : null}
      </Section>

      <Section icon={Store} title={vendors.length > 1 ? "Stores" : "Store"}>
        {vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Marketplace (no store linked)</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {vendors.map((v) => (
              <li key={v.id} className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-sm font-medium">
                {v.shop_name}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Package} title={`Items (${order.item_count})`}>
        <ul className="divide-y divide-border/70">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-white">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" loading="lazy" className="size-full object-contain p-1" />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.variant_title, item.product_sku && `SKU ${item.product_sku}`].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {item.quantity} × {formatBdt(item.unit_price, order.currency)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{formatBdt(item.line_total, order.currency)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Wallet} title="Payment">
        <Row label="Subtotal" value={formatBdt(order.subtotal, order.currency)} />
        <Row label="Delivery fee" value={formatBdt(order.shipping_fee, order.currency)} />
        <Row
          label="Discount"
          value={discount > 0 ? `−${formatBdt(discount, order.currency)}` : formatBdt(0, order.currency)}
        />
        {tax > 0 ? <Row label="Tax" value={formatBdt(tax, order.currency)} /> : null}
        <Row label="Total" value={formatBdt(order.total, order.currency)} strong />
        <p className="mt-2 text-xs text-muted-foreground">
          {paymentMethodLabel(order)} · {PAYMENT_STATUS_META[order.payment_status].label}
        </p>
        {order.payments.length > 0 ? (
          <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground" title={p.transaction_id ?? undefined}>
                  {p.card_type ? p.card_type.split("-")[0] : p.method === "sslcommerz" ? "SSLCOMMERZ" : p.method}
                  {" · "}
                  {fmt(p.paid_at ?? p.created_at)}
                </span>
                <PaymentStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        icon={Truck}
        title="Courier tracking"
        action={
          canManage ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEditTracking}>
              <Pencil className="size-3" />
              {order.courier_name || order.tracking_number ? "Edit" : "Add"}
            </Button>
          ) : null
        }
      >
        {order.courier_name || order.tracking_number ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Courier</dt>
              <dd className="font-medium">{order.courier_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tracking ID</dt>
              <dd className="font-mono text-[13px] font-medium break-all">{order.tracking_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Shipped</dt>
              <dd>{fmt(order.shipped_at) ?? "Not yet"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Delivered</dt>
              <dd>{fmt(order.delivered_at) ?? "Not yet"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No courier assigned yet. Add the courier and consignment ID when you hand the parcel over.
          </p>
        )}
      </Section>

      {order.notes ? (
        <Section icon={Pencil} title="Customer note">
          <p className="text-sm whitespace-pre-line">{order.notes}</p>
        </Section>
      ) : null}
    </div>
  );
}
