import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Tag, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { slugifyClient, type Brand } from "@/lib/brands";
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

export function BrandEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ brand: Brand }>(
          `/api/dashboard/brands/${id}`,
          { token },
        );
        if (cancelled) return;
        setBrand(data.brand);
        setName(data.brand.name);
        setSlug(data.brand.slug);
        setDescription(data.brand.description ?? "");
        setIsActive(data.brand.is_active ? "active" : "inactive");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load brand",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const data = await apiFetch<{ brand: Brand }>(
        `/api/dashboard/brands/${id}`,
        {
          method: "PATCH",
          token,
          body: {
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            is_active: isActive === "active",
          },
        },
      );
      setBrand(data.brand);
      setSaveSuccess("Brand saved");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to save brand",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    if (!window.confirm("Delete this brand?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/dashboard/brands/${id}`, {
        method: "DELETE",
        token,
      });
      navigate("/brands");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to delete brand",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading brand…</p>;
  }

  if (error || !brand) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? "Not found"}</p>
        <Button asChild variant="outline">
          <Link to="/brands">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/brands">
              <ArrowLeft />
              Brands
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">/{brand.slug}</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {brand.is_active ? "active" : "inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Tag className="size-4" />
          </div>
          <CardTitle>Edit brand</CardTitle>
          <CardDescription>
            Name changes sync to products using this brand.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive} onValueChange={setIsActive}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              <Trash2 />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
