import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/orders";
import { firstZodError, withSafeInput } from "./safeInput";

export const orderSearchSchema = withSafeInput(
  z.string().trim().max(100, "Search must be at most 100 characters"),
);

const shipText = (label: string) =>
  withSafeInput(z.string().trim().max(80, `${label} must be at most 80 characters`));

/** Status change (+ courier details when shipping) and the tracking-only edit share this form. */
export const orderStatusFormSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  courier_name: shipText("Courier"),
  tracking_number: shipText("Tracking number"),
});

export type OrderStatusFormValues = z.infer<typeof orderStatusFormSchema>;

export { firstZodError };
