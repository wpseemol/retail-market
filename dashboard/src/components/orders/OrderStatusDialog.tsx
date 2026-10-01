import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Truck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { STATUS_META, type OrderStatus } from "@/lib/orders";
import {
  orderStatusFormSchema,
  type OrderStatusFormValues,
} from "@/lib/validators/order";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OrderStatusPill } from "./OrderBadges";

export type StatusDialogTarget = {
  mode: "status" | "tracking";
  orderNumber: string;
  status: OrderStatus;
  courier_name?: string | null;
  tracking_number?: string | null;
};

const COURIER_SUGGESTIONS = ["Pathao", "Steadfast", "RedX", "Paperfly", "eCourier", "Sundarban"];

const DESTRUCTIVE: OrderStatus[] = ["cancelled", "refunded"];

export function OrderStatusDialog({
  target,
  onOpenChange,
  onSubmit,
}: {
  target: StatusDialogTarget | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrderStatusFormValues) => Promise<void>;
}) {
  const form = useForm<OrderStatusFormValues>({
    resolver: zodResolver(orderStatusFormSchema),
    defaultValues: { status: "pending", courier_name: "", tracking_number: "" },
  });

  useEffect(() => {
    if (!target) return;
    form.reset({
      status: target.status,
      courier_name: target.courier_name ?? "",
      tracking_number: target.tracking_number ?? "",
    });
  }, [target, form]);

  const showCourier = target?.mode === "tracking" || target?.status === "shipped";
  const destructive = target?.mode === "status" && DESTRUCTIVE.includes(target.status);
  const submitting = form.formState.isSubmitting;

  async function handleSubmit(values: OrderStatusFormValues) {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      form.setError("root", {
        message: err instanceof ApiError ? err.message : "Could not update the order",
      });
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !submitting && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {target?.mode === "tracking" ? (
              <>
                <Truck className="size-4 text-brand-primary" />
                Courier & tracking
              </>
            ) : (
              <>Mark as {target ? STATUS_META[target.status].label.toLowerCase() : ""}</>
            )}
          </DialogTitle>
          <DialogDescription>
            Order #{target?.orderNumber}
            {target?.mode === "status" ? (
              <>
                {" "}
                will move to <OrderStatusPill status={target.status} className="ml-1 align-middle" />
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {destructive ? (
              <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  {target?.status === "cancelled"
                    ? "Cancelling is final. Stock and any online payment are not reversed automatically — refund the customer from SSLCOMMERZ if they already paid."
                    : "Refunded is final. Send the money back through SSLCOMMERZ or cash first; this only records it."}
                </p>
              </div>
            ) : null}

            {showCourier ? (
              <>
                <FormField
                  control={form.control}
                  name="courier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Courier</FormLabel>
                      <FormControl>
                        <Input {...field} list="order-couriers" placeholder="e.g. Pathao" maxLength={80} />
                      </FormControl>
                      <datalist id="order-couriers">
                        {COURIER_SUGGESTIONS.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tracking_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking / consignment ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. DH-2410-88213" maxLength={80} />
                      </FormControl>
                      <FormDescription>Optional — you can add it later from the order drawer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Back
              </Button>
              <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : null}
                {target?.mode === "tracking"
                  ? "Save courier details"
                  : `Mark ${target ? STATUS_META[target.status].label.toLowerCase() : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
