"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

type DrawerDirection = "top" | "bottom" | "left" | "right";

function Drawer({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    />
  );
}

function DrawerTrigger(
  props: React.ComponentProps<typeof DrawerPrimitive.Trigger>,
) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(
  props: React.ComponentProps<typeof DrawerPrimitive.Portal>,
) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(
  props: React.ComponentProps<typeof DrawerPrimitive.Close>,
) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn("fixed inset-0 z-[90] bg-overlay-scrim", className)}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  direction = "bottom",
  showHandle = direction === "bottom" || direction === "top",
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  direction?: DrawerDirection;
  showHandle?: boolean;
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-lenis-prevent
        className={cn(
          "fixed z-[91] flex flex-col border-border-default bg-bg-surface text-text-primary outline-none",
          direction === "bottom" &&
            "inset-x-0 bottom-0 mt-24 h-auto max-h-[92dvh] rounded-t-2xl border",
          direction === "top" &&
            "inset-x-0 top-0 mb-24 h-auto max-h-[92dvh] rounded-b-2xl border",
          direction === "right" &&
            "inset-y-0 right-0 h-dvh w-[85%] max-w-[85vw] rounded-l-2xl border-l",
          direction === "left" &&
            "inset-y-0 left-0 h-dvh w-[85%] max-w-[85vw] rounded-r-2xl border-r",
          className,
        )}
        {...props}
      >
        {showHandle ? (
          <div
            className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-border-default"
            aria-hidden
          />
        ) : null}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "grid gap-1 border-b border-border-default px-4 pb-3 pt-3 text-left",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "mt-auto grid grid-cols-2 gap-2 border-t border-border-default p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "text-[17px] font-semibold leading-none tracking-tight text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
