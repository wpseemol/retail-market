import {
  formatAddress,
  formatBdPhone,
  formatBdt,
  paymentMethodLabel,
  PAYMENT_STATUS_META,
  STATUS_META,
  type OrderAddress,
  type OrderRow,
} from "@/lib/orders";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function addressBlock(title: string, address: OrderAddress | null | undefined) {
  if (!address) return "";
  const lines = formatAddress(address).map((l) => `<div>${escapeHtml(l)}</div>`).join("");
  return `<div class="box"><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(address.full_name)}</strong><div>${escapeHtml(formatBdPhone(address.phone))}</div>${lines}</div>`;
}

function invoiceHtml(order: OrderRow & { addresses?: OrderAddress[] }, storeName: string) {
  const shipping = order.addresses?.find((a) => a.type === "shipping") ?? order.billing;
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.product_name)}${item.variant_title ? `<div class="muted">${escapeHtml(item.variant_title)}</div>` : ""}${item.product_sku ? `<div class="muted">SKU ${escapeHtml(item.product_sku)}</div>` : ""}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${escapeHtml(formatBdt(item.unit_price, order.currency))}</td>
        <td class="num">${escapeHtml(formatBdt(item.line_total, order.currency))}</td>
      </tr>`,
    )
    .join("");
  const discount = Number(order.discount_amount) > 0
    ? `<tr><td>Discount</td><td class="num">−${escapeHtml(formatBdt(order.discount_amount, order.currency))}</td></tr>`
    : "";
  const tax = Number(order.tax_amount) > 0
    ? `<tr><td>Tax</td><td class="num">${escapeHtml(formatBdt(order.tax_amount, order.currency))}</td></tr>`
    : "";

  return `<section class="invoice">
    <header>
      <div><h1>${escapeHtml(storeName)}</h1><div class="muted">Invoice</div></div>
      <div class="right">
        <h2>#${escapeHtml(order.order_number)}</h2>
        <div>${escapeHtml(new Date(order.placed_at).toLocaleString("en-GB"))}</div>
        <div>${escapeHtml(STATUS_META[order.status].label)} · ${escapeHtml(paymentMethodLabel(order))} (${escapeHtml(PAYMENT_STATUS_META[order.payment_status].label)})</div>
      </div>
    </header>
    <div class="grid">${addressBlock("Bill to", order.billing)}${addressBlock("Ship to", shipping)}</div>
    <table class="items">
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td class="num">${escapeHtml(formatBdt(order.subtotal, order.currency))}</td></tr>
      <tr><td>Delivery fee</td><td class="num">${escapeHtml(formatBdt(order.shipping_fee, order.currency))}</td></tr>
      ${discount}${tax}
      <tr class="grand"><td>Total</td><td class="num">${escapeHtml(formatBdt(order.total, order.currency))}</td></tr>
    </table>
    ${order.courier_name || order.tracking_number ? `<p class="muted">Courier: ${escapeHtml(order.courier_name ?? "—")} · Tracking: ${escapeHtml(order.tracking_number ?? "—")}</p>` : ""}
  </section>`;
}

const STYLES = `
  * { box-sizing: border-box; }
  body { font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; margin: 0; }
  .invoice { padding: 32px; page-break-after: always; }
  .invoice:last-child { page-break-after: auto; }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #00b207; padding-bottom: 12px; }
  h1 { margin: 0; font-size: 20px; color: #002603; } h2 { margin: 0; font-size: 16px; } h3 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #555; }
  .right { text-align: right; } .muted { color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .box { border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; }
  table { width: 100%; border-collapse: collapse; }
  .items th { text-align: left; font-size: 11px; text-transform: uppercase; color: #555; border-bottom: 1px solid #ddd; padding: 6px 4px; }
  .items td { border-bottom: 1px solid #f0f0f0; padding: 8px 4px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 280px; margin: 12px 0 0 auto; } .totals td { padding: 3px 4px; }
  .grand td { border-top: 2px solid #111; font-weight: 700; font-size: 15px; padding-top: 6px; }
`;

/** Opens a print-ready window with one invoice per page. Returns false if the popup was blocked. */
export function printInvoices(
  orders: Array<OrderRow & { addresses?: OrderAddress[] }>,
  storeName = "Niyenin",
) {
  if (orders.length === 0) return true;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;
  const title = orders.length === 1 ? `Invoice ${orders[0].order_number}` : `${orders.length} invoices`;
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head><body>${orders
      .map((o) => invoiceHtml(o, storeName))
      .join("")}</body></html>`,
  );
  win.document.close();
  win.focus();
  // `load` doesn't reliably fire after document.write; give layout a moment instead.
  setTimeout(() => win.print(), 300);
  return true;
}
