import {
  ClipboardList,
  Package,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Orders",
    value: "1,284",
    delta: "+12.4%",
    hint: "Last 30 days",
    icon: ClipboardList,
  },
  {
    title: "Catalog items",
    value: "3,602",
    delta: "+4.1%",
    hint: "Active listings",
    icon: Package,
  },
  {
    title: "Staff users",
    value: "48",
    delta: "+2",
    hint: "Across all roles",
    icon: Users,
  },
  {
    title: "Vendors",
    value: "126",
    delta: "+8.2%",
    hint: "Approved partners",
    icon: Store,
  },
];

const modules = [
  {
    title: "Orders & catalog",
    description: "Track fulfillment, stock, and product updates.",
    icon: Package,
  },
  {
    title: "Users & roles",
    description: "Manage admin, moderator, and vendor access.",
    icon: ShieldCheck,
  },
  {
    title: "Vendors & listings",
    description: "Review partner stores and marketplace listings.",
    icon: Store,
  },
  {
    title: "Reports & moderation",
    description: "Monitor flags, reports, and compliance queues.",
    icon: TrendingUp,
  },
];

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Management Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared Niyenin design system with the storefront. Manage Super Admin,
          Admin, Moderator, and Vendor workspaces from here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="@container/card gap-4 py-5">
            <CardHeader className="px-5">
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </CardTitle>
              <CardAction>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 px-5 text-sm">
              <Badge
                variant="outline"
                className="border-brand-tint bg-brand-tint text-brand-deep"
              >
                <TrendingUp className="size-3" />
                {stat.delta}
              </Badge>
              <p className="text-muted-foreground">{stat.hint}</p>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title} className="gap-3 py-5">
            <CardHeader className="px-5">
              <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
                <module.icon className="size-4" />
              </div>
              <CardTitle className="text-base">{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
