import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Hourglass,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  PackageOpen,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import {
  formatBdPhone,
  formatBdt,
  formatPlacedAt,
  initials,
  NEXT_STATUSES,
  ORDER_DELETE_ROLES,
  orderDeleteBlockReason,
  STATUS_META,
  type OrderDetail,
  type OrderDetailResponse,
  type OrderRow,
  type OrderStatus,
  type OrdersListResponse,
  type StatusCounts,
} from "@/lib/orders";
import { firstZodError, orderSearchSchema } from "@/lib/validators/order";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { PageHero } from "@/components/dashboard/page-shell";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import {
  OrderStatusPill,
  PaymentMethodChip,
  PaymentStatusBadge,
} from "@/components/orders/OrderBadges";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { printInvoices } from "@/components/orders/printInvoices";
import { useOrderActions } from "@/components/orders/useOrderActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const MANAGER_ROLES = new Set(["super_admin", "admin", "moderator"]);

const STATUS_TABS = [
  { key: "all", label: "All", statuses: [] as OrderStatus[] },
  { key: "pending", label: "Pending", statuses: ["pending"] as OrderStatus[] },
  { key: "processing", label: "Processing", statuses: ["confirmed", "processing"] as OrderStatus[] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] as OrderStatus[] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] as OrderStatus[] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "refunded"] as OrderStatus[] },
] as const;
type TabKey = (typeof STATUS_TABS)[number]["key"];

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All payment statuses" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "all", label: "All payment methods" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "card", label: "Cards" },
  { value: "cod", label: "Cash on delivery (COD)" },
  { value: "online", label: "Online · awaiting payment" },
  { value: "other", label: "Other online" },
] as const;

const PAGE_SIZES = [10, 20, 50] as const;

function tabCount(counts: StatusCounts | undefined, key: TabKey) {
  if (!counts) return null;
  const tab = STATUS_TABS.find((t) => t.key === key)!;
  return tab.statuses.length === 0 ? counts.total : tab.statuses.reduce((n, s) => n + counts[s], 0);
}

type Notice = { tone: "success" | "error"; text: string } | null;

function useNotice() {
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.tone === "error" ? 8000 : 4500);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, setNotice] as const;
}

function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm",
        notice.tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-brand-primary/30 bg-brand-tint/60 text-brand-deep",
      )}
    >
      <p>{notice.text}</p>
      <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number | null;
  hint: string;
  icon: typeof ClipboardList;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex w-full flex-col items-start gap-2.5 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:gap-3 text-left shadow-sm transition-[border-color,box-shadow] hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "border-brand-primary ring-1 ring-brand-primary/30" : "border-border/80",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs leading-tight font-medium text-muted-foreground sm:truncate">{label}</span>
        <span className="block text-2xl font-semibold tracking-tight tabular-nums">
          {value === null ? <Skeleton className="mt-1 h-7 w-12" /> : value.toLocaleString("en-BD")}
        </span>
        <span className="block text-[11px] leading-snug text-muted-foreground sm:truncate">{hint}</span>
      </span>
    </button>
  );
}

function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="size-4 cursor-pointer rounded border-input accent-brand-primary"
    />
  );
}

function CustomerCell({ order }: { order: OrderRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="lg" className="ring-1 ring-border">
        {order.customer.avatar ? <AvatarImage src={order.customer.avatar} alt="" /> : null}
        <AvatarFallback className="bg-brand-tint text-xs font-semibold text-brand-deep">
          {initials(order.customer.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {order.customer.name}
          {order.is_guest ? <span className="ml-1.5 text-[10px] font-normal text-muted-foreground uppercase">Guest</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">{formatBdPhone(order.customer.phone)}</p>
      </div>
    </div>
  );
}

function StatusControl({
  order,
  canManage,
  busy,
  onChange,
}: {
  order: OrderRow;
  canManage: boolean;
  busy: boolean;
  onChange: (status: OrderStatus) => void;
}) {
  const next = NEXT_STATUSES[order.status];
  if (!canManage || next.length === 0) return <OrderStatusPill status={order.status} />;
  return (
    <Select value={order.status} onValueChange={(v) => v !== order.status && onChange(v as OrderStatus)} disabled={busy}>
      <SelectTrigger
        aria-label={`Change status of order ${order.order_number}`}
        className="h-auto w-auto gap-1 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-2 dark:bg-transparent dark:hover:bg-transparent [&>svg:last-child]:hidden"
      >
        {busy ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </span>
        ) : (
          <OrderStatusPill status={order.status} className="cursor-pointer pr-2 hover:brightness-95" />
        )}
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={order.status} disabled>
          {STATUS_META[order.status].label} (current)
        </SelectItem>
        {next.map((s) => (
          <SelectItem key={s} value={s}>
            Mark {STATUS_META[s].label.toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RowActions({
  order,
  canManage,
  onView,
  onStatus,
  onTracking,
  onPrint,
  onCopy,
  onDelete,
}: {
  order: OrderRow;
  canManage: boolean;
  onView: () => void;
  onStatus: (s: OrderStatus) => void;
  onTracking: () => void;
  onPrint: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}) {
  const next = NEXT_STATUSES[order.status];
  const deleteBlocked = onDelete ? orderDeleteBlockReason(order) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for order ${order.order_number}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">#{order.order_number}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onView}>
          <Eye /> View details
        </DropdownMenuItem>
        {canManage && next.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <RefreshCw className="size-4 text-muted-foreground" /> Change status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {next.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => onStatus(s)}>
                  <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
                  {STATUS_META[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {canManage ? (
          <DropdownMenuItem onSelect={onTracking}>
            <Truck /> Courier & tracking
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onPrint}>
          <Printer /> Print invoice
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopy}>
          <Copy /> Copy order number
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/orders/${order.id}`}>
            <ExternalLink /> Open full page
          </Link>
        </DropdownMenuItem>
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={deleteBlocked !== null} onSelect={onDelete}>
              <Trash2 />
              <span className="flex flex-col">
                Delete order
                {deleteBlocked ? <span className="text-[11px] text-muted-foreground">{deleteBlocked}</span> : null}
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function pageWindow(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
  onLimit,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <Select value={String(limit)} onValueChange={(v) => onLimit(Number(v))}>
          <SelectTrigger size="sm" className="w-[110px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1.5 text-sm text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="sm"
              className="h-8 min-w-8 px-2 tabular-nums"
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <div className="flex flex-1 items-center gap-2">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function buildQuery(params: {
  tab: TabKey;
  q: string;
  paymentStatus: string;
  paymentMethod: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const statuses = STATUS_TABS.find((t) => t.key === params.tab)!.statuses;
  if (statuses.length > 0) sp.set("status", statuses.join(","));
  if (params.q) sp.set("q", params.q);
  if (params.paymentStatus !== "all") sp.set("payment_status", params.paymentStatus);
  if (params.paymentMethod !== "all") sp.set("payment_method", params.paymentMethod);
  return sp.toString();
}

export function OrdersPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = MANAGER_ROLES.has(role ?? "");
  const canDelete = ORDER_DELETE_ROLES.has(role ?? "");
  const confirm = useConfirm();

  const [data, setData] = useState<OrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [tab, setTab] = useState<TabKey>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<OrderStatus | "delete" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useNotice();

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<OrderDetailResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    const value = searchDraft;
    const t = setTimeout(() => {
      const parsed = orderSearchSchema.safeParse(value);
      if (!parsed.success) {
        setSearchError(firstZodError(parsed.error));
        return;
      }
      setSearchError(null);
      if (parsed.data !== q) {
        setQ(parsed.data);
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchDraft, q]);

  const query = useMemo(
    () => buildQuery({ tab, q, paymentStatus, paymentMethod, page, limit }),
    [tab, q, paymentStatus, paymentMethod, page, limit],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    apiFetch<OrdersListResponse>(`/api/dashboard/orders?${query}`, { token })
      .then((res) => {
        if (cancelled) return;
        if (res.orders.length === 0 && res.pagination.page > res.pagination.total_pages) {
          setPage(res.pagination.total_pages);
          return;
        }
        setData(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, reloadKey]);

  useEffect(() => {
    setSelected(new Set());
  }, [query]);

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const summary = data?.summary;
  const pageIds = orders.map((o) => o.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const onUpdated = useCallback(
    (result: OrderDetailResponse) => {
      setNotice({ tone: "success", text: result.message ?? `Order #${result.order.order_number} updated` });
      setDrawer((current) => (current && current.order.id === result.order.id ? result : current));
      refresh();
    },
    [refresh, setNotice],
  );
  const onActionError = useCallback((text: string) => setNotice({ tone: "error", text }), [setNotice]);
  const actions = useOrderActions({ token, onUpdated, onError: onActionError });

  const openDrawer = useCallback(
    (id: string) => {
      setDrawerId(id);
      setDrawer(null);
      setDrawerError(null);
      setDrawerLoading(true);
      apiFetch<OrderDetailResponse>(`/api/dashboard/orders/${id}`, { token })
        .then(setDrawer)
        .catch((err) => setDrawerError(err instanceof ApiError ? err.message : "Failed to load order"))
        .finally(() => setDrawerLoading(false));
    },
    [token],
  );

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(pageIds) : new Set());
  }

  async function runBulk(status: OrderStatus) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(status);
    try {
      const res = await apiFetch<{
        message: string;
        updated: string[];
        skipped: Array<{ order_number: string | null; reason: string }>;
      }>("/api/dashboard/orders/bulk-status", { method: "POST", token, body: { ids, status } });
      const skippedText = res.skipped
        .slice(0, 3)
        .map((s) => `#${s.order_number ?? "?"}: ${s.reason}`)
        .join(" · ");
      setNotice({
        tone: res.updated.length === 0 ? "error" : "success",
        text: skippedText ? `${res.message}. ${skippedText}${res.skipped.length > 3 ? " …" : ""}` : res.message,
      });
      setSelected(new Set());
      refresh();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Bulk update failed" });
    } finally {
      setBulkBusy(null);
    }
  }

  async function deleteOrder(order: OrderRow | OrderDetail) {
    const ok = await confirm({
      title: `Delete order #${order.order_number}?`,
      description: `The order, its ${order.item_count} item${order.item_count === 1 ? "" : "s"}, addresses and payment attempts will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete order",
    });
    if (!ok) return;
    setDeletingId(order.id);
    try {
      const res = await apiFetch<{ message: string }>(`/api/dashboard/orders/${order.id}`, { method: "DELETE", token });
      setNotice({ tone: "success", text: res.message });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      if (drawerId === order.id) setDrawerId(null);
      refresh();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not delete the order" });
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const blocked = selectedRows.filter((o) => orderDeleteBlockReason(o) !== null).length;
    const ok = await confirm({
      title: `Delete ${ids.length} order${ids.length === 1 ? "" : "s"}?`,
      description: (
        <>
          Selected orders will be permanently removed with their items, addresses and payment attempts. This cannot be undone.
          {blocked > 0 ? (
            <span className="mt-2 block font-medium text-amber-600 dark:text-amber-400">
              {blocked} paid / in-progress order{blocked === 1 ? "" : "s"} will be skipped.
            </span>
          ) : null}
        </>
      ),
      confirmLabel: `Delete ${ids.length === 1 ? "order" : "orders"}`,
    });
    if (!ok) return;
    setBulkBusy("delete");
    try {
      const res = await apiFetch<{
        message: string;
        deleted: string[];
        skipped: Array<{ order_number: string | null; reason: string }>;
      }>("/api/dashboard/orders/bulk-delete", { method: "POST", token, body: { ids } });
      const skippedText = res.skipped
        .slice(0, 3)
        .map((s) => `#${s.order_number ?? "?"}: ${s.reason}`)
        .join(" · ");
      setNotice({
        tone: res.deleted.length === 0 ? "error" : "success",
        text: skippedText ? `${res.message}. ${skippedText}${res.skipped.length > 3 ? " …" : ""}` : res.message,
      });
      setSelected(new Set());
      refresh();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Bulk delete failed" });
    } finally {
      setBulkBusy(null);
    }
  }

  function printRows(rows: Array<OrderRow | OrderDetail>) {
    if (!printInvoices(rows)) {
      setNotice({ tone: "error", text: "Your browser blocked the print window. Allow pop-ups for the dashboard and try again." });
    }
  }

  async function copyOrderNumber(order: OrderRow) {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setNotice({ tone: "success", text: `Copied #${order.order_number}` });
    } catch {
      setNotice({ tone: "error", text: "Could not copy to clipboard" });
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const { blob, filename } = await apiDownload(
        `/api/dashboard/orders/export?${buildQuery({ tab, q, paymentStatus, paymentMethod })}`,
        { token },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  const filtersActive = q !== "" || paymentStatus !== "all" || paymentMethod !== "all" || tab !== "all";
  const selectedRows = orders.filter((o) => selected.has(o.id));

  const kpis = [
    { key: "all" as TabKey, label: "Total Orders", hint: "All time", icon: ClipboardList, tone: "bg-brand-tint text-brand-deep", value: summary ? summary.total : null },
    { key: "pending" as TabKey, label: "Pending Approval", hint: "Waiting for confirmation", icon: Hourglass, tone: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300", value: summary ? summary.pending : null },
    { key: "processing" as TabKey, label: "Processing", hint: "Confirmed & packing", icon: PackageOpen, tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300", value: summary ? summary.confirmed + summary.processing : null },
    { key: "shipped" as TabKey, label: "Dispatched / On Way", hint: "With the courier", icon: Truck, tone: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300", value: summary ? summary.shipped : null },
    { key: "delivered" as TabKey, label: "Completed", hint: "Delivered to customer", icon: PackageCheck, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300", value: summary ? summary.delivered : null },
  ];

  const rowHandlers = (order: OrderRow) => ({
    onView: () => openDrawer(order.id),
    onStatus: (s: OrderStatus) => void actions.requestStatus(order, s),
    onTracking: () => actions.editTracking(order),
    onPrint: () => printRows([order]),
    onCopy: () => void copyOrderNumber(order),
    onDelete: canDelete ? () => void deleteOrder(order) : undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        eyebrow="Sales"
        title="Order Management"
        description="Track every storefront order — approve, pack, hand over to the courier and close it out."
        actions={
          <Button
            variant="secondary"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="bg-white text-brand-deep hover:bg-white/90 dark:bg-white dark:text-[#002603]"
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Export to CSV
          </Button>
        }
      />

      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <StaggerItem key={k.key} className={cn(i === 0 && "col-span-2 md:col-span-1")}>
            <KpiCard
              label={k.label}
              value={k.value}
              hint={k.hint}
              icon={k.icon}
              tone={k.tone}
              active={tab === k.key}
              onClick={() => changeFilter(() => setTab(k.key))}
            />
          </StaggerItem>
        ))}
      </Stagger>

      <NoticeBar notice={notice} onClose={() => setNotice(null)} />

      <FadeUp>
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="space-y-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/40 via-background to-background p-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
              <div role="tablist" aria-label="Filter by order status" className="inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
                {STATUS_TABS.map((t) => {
                  const count = tabCount(data?.status_counts, t.key);
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => changeFilter(() => setTab(t.key))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                      {count !== null ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[10px] tabular-nums",
                            active ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
              <div className="flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Search by order ID, customer name or phone (017…)"
                    className="bg-background pr-9 pl-9"
                    maxLength={100}
                    aria-invalid={searchError ? true : undefined}
                    aria-describedby={searchError ? "order-search-error" : undefined}
                    aria-label="Search orders"
                  />
                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={() => setSearchDraft("")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                {searchError ? (
                  <p id="order-search-error" className="mt-1 text-xs text-destructive">{searchError}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select value={paymentStatus} onValueChange={(v) => changeFilter(() => setPaymentStatus(v))}>
                  <SelectTrigger className="w-full bg-background sm:w-[180px]" aria-label="Payment status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paymentMethod} onValueChange={(v) => changeFilter(() => setPaymentMethod(v))}>
                  <SelectTrigger className="w-full bg-background sm:w-[200px]" aria-label="Payment method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtersActive ? (
                  <Button
                    variant="ghost"
                    className="col-span-2 sm:col-span-1"
                    onClick={() =>
                      changeFilter(() => {
                        setTab("all");
                        setSearchDraft("");
                        setQ("");
                        setPaymentStatus("all");
                        setPaymentMethod("all");
                      })
                    }
                  >
                    <X /> Reset
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {selected.size > 0 ? (
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-brand-primary/30 bg-brand-tint/80 px-4 py-2.5 backdrop-blur">
              <p className="text-sm font-medium text-brand-deep">
                {selected.size} order{selected.size === 1 ? "" : "s"} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {canManage ? (
                  <>
                    <Button size="sm" variant="outline" className="bg-background" disabled={bulkBusy !== null} onClick={() => void runBulk("processing")}>
                      {bulkBusy === "processing" ? <Loader2 className="animate-spin" /> : <PackageOpen />}
                      Mark as Processing
                    </Button>
                    <Button size="sm" variant="outline" className="bg-background" disabled={bulkBusy !== null} onClick={() => void runBulk("shipped")}>
                      {bulkBusy === "shipped" ? <Loader2 className="animate-spin" /> : <Truck />}
                      Mark as Shipped
                    </Button>
                  </>
                ) : null}
                <Button size="sm" disabled={selectedRows.length === 0} onClick={() => printRows(selectedRows)}>
                  <Printer />
                  Print Selected Invoices
                </Button>
                {canDelete ? (
                  <Button size="sm" variant="destructive" disabled={bulkBusy !== null} onClick={() => void deleteSelected()}>
                    {bulkBusy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    Delete Selected
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw /> Try again
              </Button>
            </div>
          ) : !data && loading ? (
            <TableSkeleton rows={limit > 10 ? 8 : 6} />
          ) : orders.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardList className="mx-auto size-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">{filtersActive ? "No orders match these filters" : "No orders yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtersActive ? "Try another status, payment filter or search term." : "When a customer checks out, the order shows up here."}
              </p>
            </div>
          ) : (
            <div className={cn("relative transition-opacity", loading && "pointer-events-none opacity-60")}>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      <th className="w-10 px-4 py-3">
                        <SelectCheckbox
                          checked={allSelected}
                          indeterminate={selectedOnPage.length > 0}
                          onChange={toggleAll}
                          label="Select all orders on this page"
                        />
                      </th>
                      <th className="px-3 py-3">Order ID</th>
                      <th className="px-3 py-3">Placed at</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3 text-center">Items</th>
                      <th className="px-3 py-3">Payment</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Grand total</th>
                      <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {orders.map((order) => {
                      const placed = formatPlacedAt(order.placed_at);
                      const isSelected = selected.has(order.id);
                      const h = rowHandlers(order);
                      return (
                        <tr
                          key={order.id}
                          className={cn("transition-colors hover:bg-muted/30", isSelected && "bg-brand-tint/40 hover:bg-brand-tint/50")}
                        >
                          <td className="px-4 py-3">
                            <SelectCheckbox
                              checked={isSelected}
                              onChange={(c) => toggleRow(order.id, c)}
                              label={`Select order ${order.order_number}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={h.onView}
                              className="font-mono text-[13px] font-semibold tracking-tight text-foreground hover:text-brand-primary hover:underline"
                            >
                              #{order.order_number}
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p>{placed.date}</p>
                            <p className="text-xs text-muted-foreground">{placed.time}</p>
                          </td>
                          <td className="max-w-[220px] px-3 py-3">
                            <CustomerCell order={order} />
                          </td>
                          <td className="px-3 py-3 text-center tabular-nums">
                            <span className="inline-flex min-w-7 justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                              {order.item_count}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <PaymentMethodChip order={order} />
                              <PaymentStatusBadge status={order.payment_status} />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusControl
                              order={order}
                              canManage={canManage}
                              busy={actions.busyId === order.id}
                              onChange={h.onStatus}
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                            {formatBdt(order.total, order.currency)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <RowActions order={order} canManage={canManage} {...h} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
                  <SelectCheckbox
                    checked={allSelected}
                    indeterminate={selectedOnPage.length > 0}
                    onChange={toggleAll}
                    label="Select all orders on this page"
                  />
                  Select all on this page
                </div>
                <ul className="divide-y divide-border/60">
                  {orders.map((order) => {
                    const placed = formatPlacedAt(order.placed_at);
                    const h = rowHandlers(order);
                    return (
                      <li key={order.id} className={cn("space-y-3 px-4 py-3.5", selected.has(order.id) && "bg-brand-tint/40")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="pt-0.5">
                              <SelectCheckbox
                                checked={selected.has(order.id)}
                                onChange={(c) => toggleRow(order.id, c)}
                                label={`Select order ${order.order_number}`}
                              />
                            </span>
                            <div className="min-w-0">
                              <button type="button" onClick={h.onView} className="font-mono text-[13px] font-semibold hover:text-brand-primary">
                                #{order.order_number}
                              </button>
                              <p className="text-xs text-muted-foreground">
                                {placed.date} · {placed.time} · {order.item_count} item{order.item_count === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <RowActions order={order} canManage={canManage} {...h} />
                        </div>
                        <CustomerCell order={order} />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusControl order={order} canManage={canManage} busy={actions.busyId === order.id} onChange={h.onStatus} />
                            <PaymentMethodChip order={order} />
                            <PaymentStatusBadge status={order.payment_status} />
                          </div>
                          <p className="font-semibold tabular-nums">{formatBdt(order.total, order.currency)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {data && orders.length > 0 ? (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              total={data.pagination.total}
              limit={limit}
              onPage={setPage}
              onLimit={(l) => changeFilter(() => setLimit(l))}
            />
          ) : null}
        </section>
      </FadeUp>

      <Sheet open={drawerId !== null} onOpenChange={(open) => !open && setDrawerId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
            <SheetTitle className="font-mono text-base">
              {drawer ? `#${drawer.order.order_number}` : "Order details"}
            </SheetTitle>
            <SheetDescription>
              {drawer
                ? `Placed ${new Date(drawer.order.placed_at).toLocaleString("en-GB")} · ${formatBdt(drawer.order.total, drawer.order.currency)}`
                : "Loading order…"}
            </SheetDescription>
          </SheetHeader>
          <div className="p-5">
            {drawerLoading && !drawer ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : drawerError ? (
              <p className="text-sm text-destructive" role="alert">{drawerError}</p>
            ) : drawer ? (
              <OrderDetailPanel
                order={drawer.order}
                nextStatuses={drawer.next_statuses}
                canManage={canManage}
                onChangeStatus={(s) => void actions.requestStatus(drawer.order, s)}
                onEditTracking={() => actions.editTracking(drawer.order)}
                onPrint={() => printRows([drawer.order])}
                onDelete={canDelete ? () => void deleteOrder(drawer.order) : undefined}
                deleting={deletingId === drawer.order.id}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {actions.dialog}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = MANAGER_ROLES.has(role ?? "");
  const canDelete = ORDER_DELETE_ROLES.has(role ?? "");
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useNotice();

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<OrderDetailResponse>(`/api/dashboard/orders/${id}`, { token })
      .then((res) => !cancelled && setDetail(res))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Failed to load order"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const onUpdated = useCallback(
    (result: OrderDetailResponse) => {
      setDetail(result);
      setNotice({ tone: "success", text: result.message ?? "Order updated" });
    },
    [setNotice],
  );
  const onActionError = useCallback((text: string) => setNotice({ tone: "error", text }), [setNotice]);
  const actions = useOrderActions({ token, onUpdated, onError: onActionError });

  const order = detail?.order;

  async function deleteThisOrder(target: OrderDetail) {
    const ok = await confirm({
      title: `Delete order #${target.order_number}?`,
      description: "The order, its items, addresses and payment attempts will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete order",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/dashboard/orders/${target.id}`, { method: "DELETE", token });
      navigate("/orders", { replace: true });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not delete the order" });
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/orders")}>
          <ArrowLeft />
          Order Management
        </Button>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {order ? `#${order.order_number}` : "Order"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : order
              ? `Placed ${new Date(order.placed_at).toLocaleString("en-GB")} · ${formatBdt(order.total, order.currency)}`
              : "Order details"}
        </p>
      </div>

      <NoticeBar notice={notice} onClose={() => setNotice(null)} />

      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : null}

      {loading && !detail ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : order ? (
        <FadeUp>
          <OrderDetailPanel
            order={order}
            nextStatuses={detail.next_statuses}
            canManage={canManage}
            onChangeStatus={(s) => void actions.requestStatus(order, s)}
            onEditTracking={() => actions.editTracking(order)}
            onPrint={() => {
              if (!printInvoices([order])) {
                setNotice({ tone: "error", text: "Your browser blocked the print window. Allow pop-ups and try again." });
              }
            }}
            onDelete={canDelete ? () => void deleteThisOrder(order) : undefined}
            deleting={deleting}
          />
        </FadeUp>
      ) : null}

      {order?.status === "delivered" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-brand-primary" />
          Delivered orders can only be moved to refunded.
        </p>
      ) : null}

      {actions.dialog}
    </div>
  );
}
