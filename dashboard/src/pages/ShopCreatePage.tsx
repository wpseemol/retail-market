import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, Search, Store, X } from "lucide-react";
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

type OwnerOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

const OWNER_SEARCH_LIMIT = 6;
const OWNER_ROLES =
  "super_admin,admin,moderator,vendor";

export function ShopCreatePage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const ownerWrapRef = useRef<HTMLDivElement>(null);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ShopCreateStatus>("draft");
  const [ownerId, setOwnerId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerResults, setOwnerResults] = useState<OwnerOption[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Search staff emails (super admin / admin / moderator / vendor), up to 6.
  useEffect(() => {
    if (!token || !isSuper) return;

    const q = ownerQuery.trim();
    if (q.length < 1) {
      setOwnerResults([]);
      setOwnerSearching(false);
      return;
    }

    if (
      ownerId &&
      q.toLowerCase() === ownerEmail.trim().toLowerCase()
    ) {
      setOwnerResults([]);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setOwnerSearching(true);
        try {
          const params = new URLSearchParams({
            roles: OWNER_ROLES,
            limit: String(OWNER_SEARCH_LIMIT),
            q,
          });
          const data = await apiFetch<{ users: OwnerOption[] }>(
            `/api/dashboard/users?${params.toString()}`,
            { token },
          );
          if (!cancelled) setOwnerResults(data.users);
        } catch {
          if (!cancelled) setOwnerResults([]);
        } finally {
          if (!cancelled) setOwnerSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [token, isSuper, ownerQuery, ownerId, ownerEmail]);

  useEffect(() => {
    if (!ownerOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (
        ownerWrapRef.current &&
        !ownerWrapRef.current.contains(event.target as Node)
      ) {
        setOwnerOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [ownerOpen]);

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

  function selectOwner(member: OwnerOption) {
    setOwnerId(member.id);
    setOwnerEmail(member.email);
    setOwnerQuery(member.email);
    setOwnerOpen(false);
  }

  function selectMyself() {
    if (!user) return;
    setOwnerId(user.id);
    setOwnerEmail(user.email);
    setOwnerQuery(user.email);
    setOwnerOpen(false);
  }

  function clearOwner() {
    setOwnerId("");
    setOwnerEmail("");
    setOwnerQuery("");
    setOwnerOpen(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (isSuper && !ownerId) {
      setError("Search and select an owner email for this shop");
      return;
    }

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
            ...(isSuper ? { user_id: ownerId } : {}),
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
              <div className="space-y-2" ref={ownerWrapRef}>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="owner_email">Owner (member email)</Label>
                  {user?.email ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={selectMyself}
                    >
                      Use my email
                    </Button>
                  ) : null}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="owner_email"
                    type="search"
                    autoComplete="off"
                    value={ownerQuery}
                    placeholder="Search email (super admin, admin, moderator, vendor)…"
                    className="pr-9 pl-9"
                    onFocus={() => setOwnerOpen(true)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOwnerQuery(value);
                      setOwnerOpen(true);
                      if (
                        ownerId &&
                        value.trim().toLowerCase() !==
                          ownerEmail.trim().toLowerCase()
                      ) {
                        setOwnerId("");
                        setOwnerEmail("");
                      }
                    }}
                  />
                  {ownerQuery ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      onClick={clearOwner}
                      aria-label="Clear owner"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}

                  {ownerOpen ? (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                      {ownerSearching ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Searching…
                        </p>
                      ) : ownerResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          {ownerQuery.trim()
                            ? "No member email matched"
                            : "Type to search member emails"}
                        </p>
                      ) : (
                        <ul className="max-h-56 overflow-auto py-1">
                          {ownerResults.map((member) => (
                            <li key={member.id}>
                              <button
                                type="button"
                                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => selectOwner(member)}
                              >
                                <span className="font-medium">
                                  {member.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.first_name} {member.last_name} ·{" "}
                                  {member.role.replace("_", " ")}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
                {ownerId ? (
                  <p className="text-xs text-brand-primary">
                    Selected owner: {ownerEmail}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Assign to your email or any staff member (admin, moderator,
                    vendor). Shows up to {OWNER_SEARCH_LIMIT} matches.
                  </p>
                )}
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={
                loading ||
                shopName.trim().length < 2 ||
                (isSuper && !ownerId)
              }
            >
              {loading ? "Creating…" : "Create shop"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
