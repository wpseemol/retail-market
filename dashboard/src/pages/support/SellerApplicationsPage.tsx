import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Store,
  XCircle,
} from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { PageHeader } from "@/components/dashboard/page-shell";
import { FadeUp } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastNotice } from "@/hooks/use-toast-messages";
import { ApiError, apiFetch } from "@/lib/api";
import {
  DOC_TYPE_LABELS,
  type SellerApplicationDto,
  type SellerApplicationStatus,
  type StaffChecklistItem,
} from "@/lib/validators/sellerApplication";
import { SellerKycDocThumb } from "@/components/support/SellerKycDocThumb";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type ListResponse = {
  applications: SellerApplicationDto[];
  pagination: { page: number; limit: number; total: number; pages: number };
  staff_checklist: StaffChecklistItem[];
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

function statusBadge(status: SellerApplicationStatus) {
  const map: Record<SellerApplicationStatus, string> = {
    draft: "outline",
    submitted: "default",
    under_review: "default",
    approved: "default",
    rejected: "destructive",
  };
  return (
    <Badge variant={map[status] as "outline" | "default" | "destructive"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}

export function SellerApplicationsPage() {
  const token = useAuthStore((s) => s.token) ?? "";
  const confirm = useConfirm();
  const [status, setStatus] = useState("submitted");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SellerApplicationDto[]>([]);
  const [checklist, setChecklist] = useState<StaffChecklistItem[]>([]);
  const [selected, setSelected] = useState<SellerApplicationDto | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activateShop, setActivateShop] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const data = await apiFetch<ListResponse>(
        `/api/dashboard/seller-applications?${params}`,
        { token },
      );
      setRows(data.applications);
      setChecklist(data.staff_checklist);
    } catch (err) {
      toastNotice({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Failed to load applications",
      });
    } finally {
      setLoading(false);
    }
  }, [q, status, token]);

  useEffect(() => {
    void load();
  }, [load]);

  function openDetail(row: SellerApplicationDto) {
    setSelected(row);
    setChecks(Object.fromEntries(checklist.map((c) => [c.id, false])));
    setActivateShop(false);
    setRejectReason("");
  }

  const allChecked =
    checklist.length > 0 && checklist.every((c) => checks[c.id]);

  async function onApprove() {
    if (!selected) return;
    if (!allChecked) {
      toastNotice({
        tone: "error",
        text: "Tick every staff checklist item before approving",
      });
      return;
    }
    const ok = await confirm({
      title: `Approve “${selected.shop_name ?? "application"}”?`,
      description:
        "The applicant becomes a vendor and a store is created. Exact commission/rent can still be set on the store afterward. This cannot be undone from this screen.",
      confirmLabel: activateShop ? "Approve & activate store" : "Approve (store pending)",
      tone: "warning",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch(`/api/dashboard/seller-applications/${selected.id}/review`, {
        method: "POST",
        token,
        body: { action: "approve", activate_shop: activateShop },
      });
      toastNotice({ tone: "success", text: "Application approved" });
      setSelected(null);
      await load();
    } catch (err) {
      toastNotice({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Approve failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!selected || !rejectReason.trim()) return;
    const ok = await confirm({
      title: `Reject “${selected.shop_name ?? "application"}”?`,
      description: "The applicant can edit and resubmit. This cannot be undone.",
      confirmLabel: "Reject application",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch(`/api/dashboard/seller-applications/${selected.id}/review`, {
        method: "POST",
        token,
        body: {
          action: "reject",
          rejection_reason: rejectReason.trim(),
        },
      });
      toastNotice({ tone: "success", text: "Application rejected" });
      setRejectOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      toastNotice({
        tone: "error",
        text: err instanceof ApiError ? err.message : "Reject failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const reviewable =
    selected?.status === "submitted" || selected?.status === "under_review";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seller applications"
        description="Review Become a seller requests. Only admin and super admin can approve or reject."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      <FadeUp>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search shop, email, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeUp>

      <FadeUp>
        <div className="overflow-hidden rounded-2xl border border-border/80">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Shop</th>
                <th className="px-4 py-3 font-medium">Applicant</th>
                <th className="px-4 py-3 font-medium">Docs</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No applications in this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                    onClick={() => openDetail(row)}
                  >
                    <td className="px-4 py-3 font-medium">{row.shop_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div>
                        {row.user
                          ? `${row.user.first_name} ${row.user.last_name}`
                          : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.docs_checklist.identity_complete ? (
                        <span className="text-brand-primary">Complete</span>
                      ) : (
                        <span className="text-muted-foreground">Incomplete</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FadeUp>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="size-5" />
                  {selected.shop_name ?? "Seller application"}
                </DialogTitle>
                <DialogDescription>
                  {selected.user?.email} · {selected.user?.phone ?? "no phone"} ·{" "}
                  {statusBadge(selected.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">{selected.description || "No description."}</p>
                <p>
                  <span className="text-muted-foreground">Address: </span>
                  {selected.business_address || "—"}
                </p>

                <div>
                  <p className="mb-2 font-medium">Documents</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selected.documents.map((doc) => {
                      const fileUrl =
                        doc.file_url || doc.media?.path || "";
                      return (
                        <div
                          key={doc.id}
                          className="overflow-hidden rounded-xl border border-border/80"
                        >
                          {fileUrl ? (
                            <SellerKycDocThumb
                              fileUrl={fileUrl}
                              token={token}
                              alt={DOC_TYPE_LABELS[doc.doc_type]}
                            />
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center bg-muted text-xs text-muted-foreground">
                              No file
                            </div>
                          )}
                          <div className="flex items-center justify-between px-3 py-2 text-xs">
                            <span>{DOC_TYPE_LABELS[doc.doc_type]}</span>
                            <ExternalLink className="size-3.5 opacity-40" aria-hidden />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviewable ? (
                  <div className="rounded-xl border border-border/80 p-4">
                    <p className="mb-3 font-medium">Staff authenticity checklist</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      The platform cannot prove a government ID is real without a paid KYC
                      provider. Confirm each item visually before approve.
                    </p>
                    <ul className="space-y-2">
                      {checklist.map((item) => (
                        <li key={item.id} className="flex items-start gap-3">
                          <input
                            id={`chk-${item.id}`}
                            type="checkbox"
                            className="mt-1 size-4 accent-[var(--brand-primary,#14361c)]"
                            checked={Boolean(checks[item.id])}
                            onChange={(e) =>
                              setChecks((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                          />
                          <Label
                            htmlFor={`chk-${item.id}`}
                            className={cn(
                              "font-normal leading-snug",
                              checks[item.id] && "text-foreground",
                            )}
                          >
                            {item.label}
                          </Label>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center gap-3">
                      <input
                        id="activate-shop"
                        type="checkbox"
                        className="size-4 accent-[var(--brand-primary,#14361c)]"
                        checked={activateShop}
                        onChange={(e) => setActivateShop(e.target.checked)}
                      />
                      <Label htmlFor="activate-shop" className="font-normal">
                        Activate store immediately (otherwise status stays pending)
                      </Label>
                    </div>
                  </div>
                ) : null}

                {selected.rejection_reason ? (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">
                    Rejected: {selected.rejection_reason}
                  </p>
                ) : null}
              </div>

              {reviewable ? (
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                  <Button type="button" disabled={busy || !allChecked} onClick={() => void onApprove()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Approve
                  </Button>
                </DialogFooter>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>Tell the applicant what to fix.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="e.g. NID photo is blurry — please re-upload both sides."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || rejectReason.trim().length < 3}
              onClick={() => void onReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
