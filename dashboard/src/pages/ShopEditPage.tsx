import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History, ImagePlus, Store, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import {
  slugifyClient,
  shopStatusLabel,
  type Shop,
  type ShopHistoryItem,
  type ShopStatus,
  SHOP_STATUSES,
} from "@/lib/shops";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type VendorOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function ShopEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);

  const [shop, setShop] = useState<Shop | null>(null);
  const [history, setHistory] = useState<ShopHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ShopStatus>("pending");
  const [ownerId, setOwnerId] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [shopRes, historyRes] = await Promise.all([
        apiFetch<{ shop: Shop }>(`/api/dashboard/shops/${id}`, { token }),
        apiFetch<{ history: ShopHistoryItem[] }>(
          `/api/dashboard/shops/${id}/history`,
          { token },
        ),
      ]);
      applyShop(shopRes.shop);
      setHistory(historyRes.history);

      if (isSuper) {
        const users = await apiFetch<{ users: VendorOption[] }>(
          "/api/dashboard/users?role=vendor&limit=100",
          { token },
        );
        setVendors(users.users);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load shop");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, isSuper]);

  function applyShop(next: Shop) {
    setShop(next);
    setShopName(next.shop_name);
    setSlug(next.slug);
    setDescription(next.description ?? "");
    setStatus(next.status);
    setOwnerId(next.user_id);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const data = await apiFetch<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${id}`,
        {
          method: "PATCH",
          token,
          body: {
            shop_name: shopName.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            ...(isSuper
              ? {
                  status,
                  user_id: ownerId || undefined,
                }
              : {}),
          },
        },
      );
      applyShop(data.shop);
      setSaveSuccess(data.message || "Shop updated");
      const hist = await apiFetch<{ history: ShopHistoryItem[] }>(
        `/api/dashboard/shops/${id}/history`,
        { token },
      );
      setHistory(hist.history);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoChange(file: File | null) {
    if (!file || !token || !id) return;
    setLogoUploading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const data = await apiUpload<{ message: string; shop: Shop }>(
        `/api/dashboard/shops/${id}/logo`,
        form,
        { token },
      );
      applyShop(data.shop);
      setSaveSuccess(data.message || "Store image updated");
      const hist = await apiFetch<{ history: ShopHistoryItem[] }>(
        `/api/dashboard/shops/${id}/history`,
        { token },
      );
      setHistory(hist.history);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Image upload failed",
      );
    } finally {
      setLogoUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!token || !id || !isSuper) return;
    const ok = window.confirm(
      `Delete shop “${shop?.shop_name}”? This soft-deletes the shop and is logged in history.`,
    );
    if (!ok) return;

    setDeleting(true);
    setSaveError(null);
    try {
      await apiFetch(`/api/dashboard/shops/${id}`, {
        method: "DELETE",
        token,
      });
      navigate("/shops");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading shop…</p>;
  }

  if (error || !shop) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/shops">
            <ArrowLeft />
            Back
          </Link>
        </Button>
        <p className="text-sm text-destructive">{error ?? "Shop not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/shops">
              <ArrowLeft />
              Shops
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {shop.shop_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">/{shop.slug}</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {shopStatusLabel(shop.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Store className="size-4" />
          </div>
          <CardTitle>Edit shop</CardTitle>
          <CardDescription>
            {isSuper
              ? "Super admin can edit name, slug, image, status, owner — and delete."
              : "Update your shop name, slug, description, and store image."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store image</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {shop.logo?.path ? (
                    <img
                      src={shop.logo.path}
                      alt={shop.shop_name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) =>
                      void onLogoChange(e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoUploading ? "Uploading…" : "Change image"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop name</Label>
              <Input
                id="shop_name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Unique slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugifyClient(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {isSuper ? (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ShopStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_STATUSES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {shopStatusLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select value={ownerId} onValueChange={setOwnerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shop.user &&
                      !vendors.some((v) => v.id === shop.user_id) ? (
                        <SelectItem value={shop.user_id}>
                          {shop.user.first_name} {shop.user.last_name} ·{" "}
                          {shop.user.email}
                        </SelectItem>
                      ) : null}
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.first_name} {v.last_name} · {v.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="text-sm text-brand-primary" role="status">
                {saveSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {isSuper ? (
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void onDelete()}
              >
                <Trash2 />
                {deleting ? "Deleting…" : "Delete shop"}
              </Button>
            ) : null}
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <History className="size-4" />
          </div>
          <CardTitle>Change history</CardTitle>
          <CardDescription>
            Tracks create, edits, logo changes, and deletes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            history.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <Separator className="mb-4" /> : null}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {item.action.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.actor
                        ? `${item.actor.first_name} ${item.actor.last_name}`
                        : "System"}{" "}
                      · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {item.action}
                  </Badge>
                </div>
                {item.note ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.note}
                  </p>
                ) : null}
                {item.changes && Object.keys(item.changes).length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {Object.entries(item.changes).map(([field, diff]) => (
                      <li key={field}>
                        <span className="font-medium text-foreground">
                          {field}
                        </span>
                        : {formatChangeValue(diff.from)} →{" "}
                        {formatChangeValue(diff.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
