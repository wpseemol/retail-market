import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ClipboardCheck,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings2,
  Shield,
  ShieldCheck,
  Store,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RolePageKey = "Super Admin" | "Admin" | "Moderator" | "Vendor";

type QuickLink = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type Capability = {
  title: string;
  description: string;
};

type RoleConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  heroClass: string;
  badge: string;
  focus: string;
  capabilities: Capability[];
  links: QuickLink[];
};

const ROLE_CONFIG: Record<RolePageKey, RoleConfig> = {
  "Super Admin": {
    eyebrow: "Platform control",
    title: "Super Admin",
    subtitle:
      "Full platform access — users, site settings, stores, and the entire catalog.",
    icon: Shield,
    accent: "from-brand-deep via-[#0a4a10] to-brand-primary",
    heroClass: "shadow-brand-primary/20",
    badge: "Highest privilege",
    focus: "Own the platform end to end",
    capabilities: [
      {
        title: "Staff & vendors",
        description: "Create, edit, and suspend every dashboard account.",
      },
      {
        title: "Site settings",
        description: "Identity, shop defaults, social, analytics, and pixels.",
      },
      {
        title: "Stores & catalog",
        description: "Manage partner stores and the full product catalog.",
      },
      {
        title: "Overview metrics",
        description: "Live orders, visits, and country traffic on Overview.",
      },
    ],
    links: [
      {
        to: "/",
        label: "Overview",
        description: "Metrics and visitor map",
        icon: LayoutDashboard,
      },
      {
        to: "/users",
        label: "Users",
        description: "Staff and vendor accounts",
        icon: Users,
      },
      {
        to: "/settings",
        label: "Site settings",
        description: "Brand, shop, trackers",
        icon: Settings2,
      },
      {
        to: "/stores",
        label: "Stores",
        description: "Partner storefronts",
        icon: Store,
      },
      {
        to: "/products",
        label: "Products",
        description: "Full catalog listings",
        icon: Package,
      },
    ],
  },
  Admin: {
    eyebrow: "Operations",
    title: "Admin",
    subtitle:
      "Day-to-day catalog and store operations without user or site-settings access.",
    icon: ShieldCheck,
    accent: "from-[#0b3d12] via-[#11661a] to-brand-primary",
    heroClass: "shadow-brand-primary/15",
    badge: "Catalog ops",
    focus: "Keep the catalog healthy",
    capabilities: [
      {
        title: "Products",
        description: "Create, edit, and publish listings across shops.",
      },
      {
        title: "Categories & brands",
        description: "Organize the taxonomy customers browse on the shop.",
      },
      {
        title: "Overview",
        description: "See live catalog and visitor metrics at a glance.",
      },
      {
        title: "Moderation support",
        description: "Work alongside moderators on listing quality.",
      },
    ],
    links: [
      {
        to: "/",
        label: "Overview",
        description: "Orders and visitor stats",
        icon: LayoutDashboard,
      },
      {
        to: "/products",
        label: "Products",
        description: "Manage listings",
        icon: Package,
      },
      {
        to: "/categories",
        label: "Categories",
        description: "Shop taxonomy",
        icon: FolderTree,
      },
      {
        to: "/brands",
        label: "Brands",
        description: "Brand directory",
        icon: Tag,
      },
    ],
  },
  Moderator: {
    eyebrow: "Quality control",
    title: "Moderator",
    subtitle:
      "Review and maintain catalog quality — products, categories, and brands.",
    icon: UserCog,
    accent: "from-[#143018] via-[#1a5c22] to-[#2c742f]",
    heroClass: "shadow-black/10",
    badge: "Review workspace",
    focus: "Protect listing quality",
    capabilities: [
      {
        title: "Product review",
        description: "Edit listings and keep copy, images, and stock accurate.",
      },
      {
        title: "Categories",
        description: "Maintain category structure and visibility.",
      },
      {
        title: "Brands",
        description: "Keep brand pages and logos consistent.",
      },
      {
        title: "No user admin",
        description: "Staff accounts and site settings stay with Super Admin.",
      },
    ],
    links: [
      {
        to: "/products",
        label: "Products",
        description: "Review listings",
        icon: Package,
      },
      {
        to: "/categories",
        label: "Categories",
        description: "Taxonomy checks",
        icon: FolderTree,
      },
      {
        to: "/brands",
        label: "Brands",
        description: "Brand consistency",
        icon: Tag,
      },
      {
        to: "/profile",
        label: "Profile",
        description: "Your account details",
        icon: ClipboardCheck,
      },
    ],
  },
  Vendor: {
    eyebrow: "Your store",
    title: "Vendor",
    subtitle:
      "Run your shop — products, store profile, and catalog items tied to your account.",
    icon: Store,
    accent: "from-[#002603] via-[#0d4a14] to-brand-primary",
    heroClass: "shadow-brand-primary/20",
    badge: "Seller workspace",
    focus: "Grow your storefront",
    capabilities: [
      {
        title: "Your products",
        description: "Add and update listings for your shop only.",
      },
      {
        title: "Store profile",
        description: "Edit shop name, logo, and public store details.",
      },
      {
        title: "Catalog browse",
        description: "View categories and brands used on the marketplace.",
      },
      {
        title: "Scoped access",
        description: "No staff users or global site settings.",
      },
    ],
    links: [
      {
        to: "/stores",
        label: "My store",
        description: "Shop profile & branding",
        icon: Store,
      },
      {
        to: "/products",
        label: "Products",
        description: "Your listings",
        icon: Package,
      },
      {
        to: "/categories",
        label: "Categories",
        description: "Browse taxonomy",
        icon: FolderTree,
      },
      {
        to: "/brands",
        label: "Brands",
        description: "Browse brands",
        icon: Tag,
      },
      {
        to: "/profile",
        label: "Profile",
        description: "Account & password",
        icon: ClipboardCheck,
      },
    ],
  },
};

export function RolePage({ role }: { role: RolePageKey }) {
  const user = useAuthStore((s) => s.user);
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "there";
  const isOwnRole =
    user?.role ===
    ({
      "Super Admin": "super_admin",
      Admin: "admin",
      Moderator: "moderator",
      Vendor: "vendor",
    }[role] as string);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg",
          config.accent,
          config.heroClass,
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
                <Icon className="size-3" />
                {config.eyebrow}
              </span>
              <Badge
                variant="outline"
                className="border-white/25 bg-white/10 text-white"
              >
                {config.badge}
              </Badge>
              {isOwnRole ? (
                <Badge className="bg-white text-brand-deep hover:bg-white">
                  Your role
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              {config.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/80 sm:text-[15px]">
              {config.subtitle}
            </p>
            <p className="mt-4 text-xs text-white/65">
              Welcome back,{" "}
              <span className="font-medium text-white">{displayName}</span>
              {" · "}
              {config.focus}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="bg-white text-brand-deep hover:bg-white/90"
            >
              <Link to={config.links[0]?.to ?? "/profile"}>
                {config.links[0]?.label ?? "Open workspace"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link to="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Capabilities + quick links */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/40 via-background to-background px-5 py-4">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                What you can do
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permissions for the {role} workspace
              </p>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2">
            {config.capabilities.map((item, index) => (
              <li
                key={item.title}
                className={cn(
                  "border-border/60 p-5",
                  "border-b last:border-b-0",
                  "sm:odd:border-r",
                  index >= config.capabilities.length - 2 && "sm:border-b-0",
                )}
              >
                <p className="text-sm font-semibold tracking-tight">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/40 via-background to-background px-5 py-4">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
              <ArrowRight className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                Quick actions
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Jump into the tools for this role
              </p>
            </div>
          </div>
          <div className="grid gap-2 p-4">
            {config.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-to-br from-background to-muted/20 px-3.5 py-3 transition-all hover:border-brand-primary/30 hover:shadow-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep transition-colors group-hover:bg-brand-primary group-hover:text-white">
                  <link.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight">
                    {link.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {link.description}
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Footer note */}
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
        This {role} module stays separate from the customer storefront. Use the
        sidebar Catalog and Workspace links for day-to-day work, or the quick
        actions above to jump in.
      </div>
    </div>
  );
}
