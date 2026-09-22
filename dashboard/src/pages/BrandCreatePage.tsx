import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { slugifyClient, type Brand } from "@/lib/brands";
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

export function BrandCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState("active");
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || slugTouched || name.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/brands/slug-preview?name=${encodeURIComponent(name.trim())}`,
            { token },
          );
          setSlug(data.slug);
        } catch {
          setSlug(slugifyClient(name));
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [name, slugTouched, token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ brand: Brand }>("/api/dashboard/brands", {
        method: "POST",
        token,
        body: {
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          is_active: isActive === "active",
        },
      });
      navigate(`/brands/${data.brand.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create brand");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/brands">
            <ArrowLeft />
            Brands
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add brand</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the brand first, then select it on products.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Tag className="size-4" />
          </div>
          <CardTitle>Brand details</CardTitle>
          <CardDescription>
            Examples: Unknown, Handmade, or your own brand name.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Handmade"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug {previewing ? "(updating…)" : ""}
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugifyClient(e.target.value));
                }}
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
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || name.trim().length < 2}>
              {loading ? "Creating…" : "Create brand"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
