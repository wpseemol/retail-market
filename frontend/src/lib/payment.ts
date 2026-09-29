/** sessionStorage key: last online-payment order, so /checkout/result can retry payment. */
export const LAST_ONLINE_ORDER_KEY = "niyenin:last-online-order";

export type LastOnlineOrder = { order_number: string; email: string };

export function readLastOnlineOrder(): LastOnlineOrder | null {
  try {
    const raw = sessionStorage.getItem(LAST_ONLINE_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastOnlineOrder>;
    return parsed.order_number && parsed.email
      ? { order_number: parsed.order_number, email: parsed.email }
      : null;
  } catch {
    return null;
  }
}

export function saveLastOnlineOrder(value: LastOnlineOrder) {
  try {
    sessionStorage.setItem(LAST_ONLINE_ORDER_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable — result page asks for the email instead */
  }
}
