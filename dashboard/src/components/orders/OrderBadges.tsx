import { Banknote, CreditCard, Smartphone } from "lucide-react";
import {
  CHANNEL_TONE,
  PAYMENT_STATUS_META,
  STATUS_META,
  paymentMethodKey,
  paymentMethodShort,
  type OrderRow,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

export function OrderStatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        meta.tone,
      )}
    >
      {meta.label}
    </span>
  );
}

export function PaymentMethodChip({
  order,
}: {
  order: Pick<OrderRow, "payment_method" | "payment_channel">;
}) {
  const key = paymentMethodKey(order);
  const Icon = key === "cod" ? Banknote : key === "card" ? CreditCard : Smartphone;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        CHANNEL_TONE[key],
      )}
    >
      <Icon className="size-3" aria-hidden />
      {paymentMethodShort(order)}
    </span>
  );
}
