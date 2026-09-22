import { Activity, FolderKanban, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RolePageProps = {
  role: "Super Admin" | "Admin" | "Moderator" | "Vendor";
};

const panels = [
  {
    title: "Quick actions",
    description: "Jump into the most common tasks for this workspace.",
    icon: Activity,
  },
  {
    title: "Modules",
    description: "Role-specific tools stay here, separate from the storefront.",
    icon: FolderKanban,
  },
  {
    title: "Preferences",
    description: "Configure defaults and visibility for this role.",
    icon: Settings2,
  },
];

export function RolePage({ role }: RolePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {role}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dedicated {role} module. Keep role tools here — separate from the
            customer storefront.
          </p>
        </div>
        <Badge className="bg-brand-primary text-white hover:bg-brand-hover">
          Active workspace
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.title} className="gap-3 py-5">
            <CardHeader className="px-5">
              <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
                <panel.icon className="size-4" />
              </div>
              <CardTitle className="text-base">{panel.title}</CardTitle>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="gap-2 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Ready for {role} tools</CardTitle>
          <CardDescription>
            This workspace matches Niyenin storefront colors, typography, and
            shadcn controls. Add tables, forms, and charts here as features land.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
