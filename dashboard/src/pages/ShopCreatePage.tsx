import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Store } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import {
  slugifyClient,
  shopCreateStatusToApi,
  type Shop,
  type ShopCreateStatus,
  SHOP_CREATE_STATUSES,
} from "@/lib/shops";
import { useAuthStore } from "@/store/auth";
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

type VendorOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export function ShopCreatePage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ShopCreateStatus>("draft");
  const [ownerId, setOwnerId] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!token || !isSuper) return;
    let cancelled = false;

    async function loadVendors() {
      try {
        const data = await apiFetch<{ users: VendorOption[] }>(
          "/api/dashboard/users?role=vendor&limit=100",
          { token },
        );
        if (!cancelled) setVendors(data.users);
      } catch {
        /* ignore */
      }
    }

    void loadVendors();
    return () => {
      cancelled = true;
    };
  }, [token, isSuper]);

  useEffect(() => {
    if (!token || slugTouched || shopName.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/shops/slug-preview?name=${encodeURIComponent(shopName.trim())}`,
            { token },
          );
          setSlug(data.slug);
        } catch {
          setSlug(slugifyClient(shopName));
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [shopName, slugTouched, token]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function onPickLogo(file: File | null) {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ message: string; shop: Shop }>(
        "/api/dashboard/shops",
        {
          method: "POST",
          token,
          body: {
            shop_name: shopName.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || null,
            status: shopCreateStatusToApi(status),
            ...(isSuper
              ? {
                  user_id: ownerId || undefined,
                }
              : {}),
          },
        },
      );

      if (logoFile) {
        const form = new FormData();
        form.append("logo", logoFile);
        await apiUpload<{ shop: Shop }>(
          `/api/dashboard/shops/${data.shop.id}/logo`,
          form,
          { token },
        );
      }

      navigate(`/shops/${data.shop.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/shops">
            <ArrowLeft />
            Shops
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Create shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shop name, unique slug, and optional store image (saved under{" "}
          <code className="text-xs">uploads/shops</code>). Changes are tracked
          in history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Store className="size-4" />
          </div>
          <CardTitle>Shop details</CardTitle>
          <CardDescription>
            Fast create — slug stays unique automatically.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store image</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Store preview"
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
                    onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose image
                  </Button>
                  {logoFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onPickLogo(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
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
                placeholder="Niyenin Gadgets"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug {previewing ? "(updating…)" : "(unique)"}
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugifyClient(e.target.value));
                }}
                placeholder="niyenin-gadgets"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as ShopCreateStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_CREATE_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft keeps the shop private; publish makes it live.
              </p>
            </div>

            {isSuper ? (
              <div className="space-y-2">
                <Label>Owner (vendor user)</Label>
                <Select
                  value={ownerId || "self"}
                  onValueChange={(value) =>
                    setOwnerId(value === "self" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Myself (super admin)</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.first_name} {v.last_name} · {v.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || shopName.trim().length < 2}>
              {loading ? "Creating…" : "Create shop"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
