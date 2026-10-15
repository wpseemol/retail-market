import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="top-right"
      offset={{ top: 72, right: 16 }}
      duration={4000}
      closeButton
      icons={{
        success: <CircleCheck className="size-5 text-brand-primary" />,
        error: <CircleX className="size-5 text-destructive" />,
        warning: <TriangleAlert className="size-5 text-amber-500" />,
        info: <Info className="size-5 text-sky-500" />,
        loading: (
          <LoaderCircle className="size-5 animate-spin text-brand-primary" />
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-l-4 border-border bg-card py-3.5 pr-9 pl-4 font-sans text-card-foreground shadow-lg shadow-black/10 sm:w-[360px]",
          success: "border-l-brand-primary",
          error: "border-l-destructive",
          warning: "border-l-amber-500",
          info: "border-l-sky-500",
          loading: "border-l-brand-primary",
          icon: "mt-0.5 shrink-0",
          content: "min-w-0 flex-1",
          title: "text-sm leading-snug font-semibold whitespace-pre-line",
          description: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
          actionButton:
            "ml-auto shrink-0 self-center rounded-md bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover",
          cancelButton:
            "shrink-0 self-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground",
          closeButton:
            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5",
        },
      }}
      {...props}
    />
  );
}
