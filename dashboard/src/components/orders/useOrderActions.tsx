import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { OrderDetailResponse, OrderRow, OrderStatus } from "@/lib/orders";
import type { OrderStatusFormValues } from "@/lib/validators/order";
import { OrderStatusDialog, type StatusDialogTarget } from "./OrderStatusDialog";

type Target = StatusDialogTarget & { id: string };

/** Statuses that need confirmation or extra details before changing. */
const NEEDS_DIALOG: OrderStatus[] = ["shipped", "cancelled", "refunded"];

/**
 * Status change + courier edit flow shared by the list, drawer and detail page.
 * Simple moves apply immediately; shipping/cancel/refund open a dialog first.
 */
export function useOrderActions({
  token,
  onUpdated,
  onError,
}: {
  token: string | null;
  onUpdated: (result: OrderDetailResponse) => void;
  onError: (message: string) => void;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const send = useCallback(
    async (id: string, path: "status" | "tracking", body: Record<string, unknown>) => {
      const result = await apiFetch<OrderDetailResponse>(`/api/dashboard/orders/${id}/${path}`, {
        method: "PATCH",
        token,
        body,
      });
      onUpdated(result);
    },
    [token, onUpdated],
  );

  const requestStatus = useCallback(
    async (order: Pick<OrderRow, "id" | "order_number" | "courier_name" | "tracking_number">, status: OrderStatus) => {
      if (NEEDS_DIALOG.includes(status)) {
        setTarget({
          id: order.id,
          mode: "status",
          orderNumber: order.order_number,
          status,
          courier_name: order.courier_name,
          tracking_number: order.tracking_number,
        });
        return;
      }
      setBusyId(order.id);
      try {
        await send(order.id, "status", { status });
      } catch (err) {
        onError(err instanceof Error ? err.message : "Could not update the order");
      } finally {
        setBusyId(null);
      }
    },
    [send, onError],
  );

  const editTracking = useCallback(
    (order: Pick<OrderRow, "id" | "order_number" | "status" | "courier_name" | "tracking_number">) => {
      setTarget({
        id: order.id,
        mode: "tracking",
        orderNumber: order.order_number,
        status: order.status,
        courier_name: order.courier_name,
        tracking_number: order.tracking_number,
      });
    },
    [],
  );

  const submit = useCallback(
    async (values: OrderStatusFormValues) => {
      if (!target) return;
      const courier = {
        courier_name: values.courier_name.trim() || null,
        tracking_number: values.tracking_number.trim() || null,
      };
      if (target.mode === "tracking") {
        await send(target.id, "tracking", courier);
      } else {
        await send(target.id, "status", {
          status: target.status,
          ...(target.status === "shipped" ? courier : {}),
        });
      }
    },
    [target, send],
  );

  const dialog = (
    <OrderStatusDialog
      target={target}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
      onSubmit={submit}
    />
  );

  return { dialog, requestStatus, editTracking, busyId };
}
