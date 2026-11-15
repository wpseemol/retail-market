import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiFetch } from "@/lib/api";
import type { Shop, ShopMember } from "@/lib/shops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type VendorOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type Props = {
  shop: Shop;
  token: string;
  canManageTeam: boolean;
  onShopUpdated: (shop: Shop) => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
};

export function StoreTeamSection({
  shop,
  token,
  canManageTeam,
  onShopUpdated,
  onError,
  onSuccess,
}: Props) {
  const confirm = useConfirm();
  const members = shop.members ?? [];
  const helpers = members.filter((m) => m.role === "helper");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VendorOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function searchVendors(q: string) {
    setQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await apiFetch<{ users: VendorOption[] }>(
        `/api/dashboard/users?role=vendor&q=${encodeURIComponent(q.trim())}&limit=20`,
        { token },
      );
      const taken = new Set(members.map((m) => m.user_id));
      setResults(data.users.filter((u) => !taken.has(u.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addHelper(userId: string) {
    setBusyId(userId);
    onError(null);
    onSuccess(null);
    try {
      const data = await apiFetch<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${encodeURIComponent(shop.slug)}/members`,
        { method: "POST", token, body: { user_id: userId } },
      );
      onShopUpdated(data.shop);
      onSuccess(data.message || "Helper added");
      setQuery("");
      setResults([]);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to add helper");
    } finally {
      setBusyId(null);
    }
  }

  async function removeHelper(member: ShopMember) {
    const name = member.user
      ? `${member.user.first_name} ${member.user.last_name}`.trim() ||
        member.user.email
      : member.user_id;
    const ok = await confirm({
      title: `Remove helper “${name}”?`,
      description:
        "They lose access to this store’s products and orders. You can add them again later.",
      confirmLabel: "Remove helper",
    });
    if (!ok) return;
    setBusyId(member.user_id);
    onError(null);
    onSuccess(null);
    try {
      const data = await apiFetch<{ message: string; shop?: Shop }>(
        `/api/dashboard/shops/${encodeURIComponent(shop.slug)}/members/${member.user_id}`,
        { method: "DELETE", token },
      );
      if (data.shop) onShopUpdated(data.shop);
      else {
        onShopUpdated({
          ...shop,
          members: members.filter((m) => m.user_id !== member.user_id),
        });
      }
      onSuccess(data.message || "Helper removed");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to remove helper");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => {
          const label = m.user
            ? `${m.user.first_name} ${m.user.last_name}`.trim() || m.user.email
            : m.user_id;
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.user?.email ?? m.user_id}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {m.role}
                </Badge>
                {canManageTeam && m.role === "helper" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === m.user_id}
                    onClick={() => void removeHelper(m)}
                  >
                    <UserMinus className="size-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {canManageTeam ? (
        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor="helper_search">Add helper vendor</Label>
          <p className="text-xs text-muted-foreground">
            Up to 2 helpers. They can manage products and orders for this store
            only.
          </p>
          <Input
            id="helper_search"
            value={query}
            onChange={(e) => void searchVendors(e.target.value)}
            placeholder="Search vendor email or name…"
            disabled={helpers.length >= 2}
          />
          {helpers.length >= 2 ? (
            <p className="text-xs text-muted-foreground">
              This store already has 2 helpers.
            </p>
          ) : null}
          {searching ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-auto rounded-xl border border-border/70 p-1">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                    disabled={busyId === u.id}
                    onClick={() => void addHelper(u.id)}
                  >
                    <span className="min-w-0 truncate">
                      {u.first_name} {u.last_name}
                      <span className="block truncate text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </span>
                    <UserPlus className="size-3.5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
